"use strict";

// 48시간 동안 서버에서 채팅을 한 번도 보내지 않은 멤버를 "AFK" 사유로 추방합니다.
// Vercel Cron 이 하루 한 번 이 주소(/api/afkKick)를 호출합니다.
// 봇이 항상 켜져 있을 필요 없이, 호출될 때마다 최근 48시간 채팅 기록을 직접 훑어봅니다.

import { REST, Routes, PermissionFlagsBits } from 'discord.js';

const HOURS = 48;                 // 이 시간 동안 채팅이 없으면 추방
const KICK_REASON = 'AFK';        // 서버 감사 로그에 남는 추방 사유
const GUILD_ID = process.env.GUILD_ID || '1192087206219763753';

const DISCORD_EPOCH = 1420070400000n;
// 채팅을 읽을 채널 종류: 0 일반 채팅, 2 음성 채널 채팅, 5 공지, 13 스테이지
// 10/11/12 는 스레드(포럼 글 포함)
const CHAT_TYPES = new Set([0, 2, 5, 13, 10, 11, 12]);

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// 디스코드 ID 안에 들어 있는 작성 시각(밀리초)을 꺼냅니다.
function idToTime(id) {
    return Number((BigInt(id) >> 22n) + DISCORD_EPOCH);
}

// 한 채널에서 기준 시각 이후에 채팅한 사람들을 authors 에 모읍니다.
async function collectRecentAuthors(channelId, cutoff, authors) {
    let before;
    while (true) {
        const query = new URLSearchParams({ limit: '100' });
        if (before) query.set('before', before);
        const messages = await rest.get(Routes.channelMessages(channelId), { query });
        if (messages.length === 0) return;
        for (const m of messages) {               // 최신 메시지부터 옵니다
            if (idToTime(m.id) < cutoff) return;  // 48시간보다 오래된 메시지에 도달하면 끝
            if (!m.webhook_id) authors.add(m.author.id);
        }
        if (messages.length < 100) return;
        before = messages[messages.length - 1].id;
    }
}

// 서버의 모든 멤버를 가져옵니다(1000명씩 나눠서).
async function fetchAllMembers() {
    const all = [];
    let after = '0';
    while (true) {
        const query = new URLSearchParams({ limit: '1000', after });
        const page = await rest.get(Routes.guildMembers(GUILD_ID), { query });
        all.push(...page);
        if (page.length < 1000) return all;
        after = page[page.length - 1].user.id;
    }
}

async function sendKickDm(userId, guildName) {
    const dm = await rest.post(Routes.userChannels(), { body: { recipient_id: userId } });
    await rest.post(Routes.channelMessages(dm.id), {
        body: { content: `**${guildName}** 서버에서 추방되었습니다.\n추방사유: AFK (${HOURS}시간 동안 채팅 없음)` },
    });
}

export default async function handler(req, res) {
    // Vercel Cron 이외의 사람이 주소를 열어서 추방을 실행하지 못하게 막습니다.
    if (!process.env.CRON_SECRET) {
        return res.status(500).json({ error: 'CRON_SECRET 환경 변수가 설정되지 않았습니다.' });
    }
    if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const cutoff = Date.now() - HOURS * 60 * 60 * 1000;

        const [guild, channels, roles, activeThreads, members, me] = await Promise.all([
            rest.get(Routes.guild(GUILD_ID)),
            rest.get(Routes.guildChannels(GUILD_ID)),
            rest.get(Routes.guildRoles(GUILD_ID)),
            rest.get(Routes.guildActiveThreads(GUILD_ID)),
            fetchAllMembers(),
            rest.get(Routes.user('@me')),
        ]);

        // 역할 정보: 관리자 여부와 역할 순위 계산용
        const roleById = new Map(roles.map(r => [r.id, r]));
        const everyonePerms = BigInt(roleById.get(GUILD_ID)?.permissions ?? '0');
        const permsOf = m => m.roles.reduce(
            (p, id) => p | BigInt(roleById.get(id)?.permissions ?? '0'), everyonePerms);
        const topPositionOf = m => Math.max(0, ...m.roles.map(id => roleById.get(id)?.position ?? 0));

        const botMember = members.find(m => m.user.id === me.id);
        const botPerms = botMember ? permsOf(botMember) : 0n;
        if (!(botPerms & (PermissionFlagsBits.KickMembers | PermissionFlagsBits.Administrator))) {
            return res.status(500).json({ error: '봇에게 "멤버 추방하기" 권한이 없습니다.' });
        }
        const botTop = topPositionOf(botMember);

        // 1단계: 최근 48시간 안에 채팅한 사람 모으기
        const recentChannels = [...channels, ...activeThreads.threads].filter(c =>
            CHAT_TYPES.has(c.type) && c.last_message_id && idToTime(c.last_message_id) >= cutoff);

        const authors = new Set();
        const unreadable = [];
        for (const ch of recentChannels) {
            try {
                await collectRecentAuthors(ch.id, cutoff, authors);
            } catch (e) {
                unreadable.push(ch.name ?? ch.id);
            }
        }
        // 읽지 못한 채널이 있으면, 거기서 채팅한 사람이 억울하게 추방될 수 있으므로 전체 중단
        if (unreadable.length > 0) {
            console.error('읽지 못한 채널:', unreadable);
            return res.status(500).json({
                error: '봇이 읽을 수 없는 채널이 있어 추방을 중단했습니다. 봇에게 "채널 보기"와 "메시지 기록 보기" 권한을 주세요.',
                channels: unreadable,
            });
        }

        // 2단계: 추방 대상 고르고 추방
        const kicked = [];
        const skipped = [];
        for (const m of members) {
            const u = m.user;
            if (u.bot || u.id === guild.owner_id) continue;              // 봇, 서버 주인 제외
            if (authors.has(u.id)) continue;                              // 48시간 안에 채팅함
            if (!m.joined_at || Date.parse(m.joined_at) > cutoff) continue; // 들어온 지 48시간 안 됨
            if (permsOf(m) & PermissionFlagsBits.Administrator) continue; // 관리자 제외
            if (topPositionOf(m) >= botTop) {                             // 봇보다 높은 역할은 추방 불가
                skipped.push(u.username);
                continue;
            }

            try {
                await sendKickDm(u.id, guild.name).catch(() => {});      // DM 막혀 있으면 그냥 넘어감
                await rest.delete(Routes.guildMember(GUILD_ID, u.id), { reason: KICK_REASON });
                kicked.push(u.username);
                console.log(`추방: ${u.username}`);
            } catch (e) {
                skipped.push(u.username);
                console.error(`추방 실패: ${u.username}`, e.message);
            }
        }

        return res.status(200).json({
            checkedMembers: members.length,
            recentChatters: authors.size,
            kicked,
            skipped,
        });
    } catch (error) {
        console.error('afkKick 오류:', error);
        return res.status(500).json({ error: error.message });
    }
}
