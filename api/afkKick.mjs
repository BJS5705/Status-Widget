"use strict";

import { REST, Routes, PermissionFlagsBits } from 'discord.js';

const HOURS = 48;
const KICK_REASON = 'AFK';
const GUILD_ID = process.env.GUILD_ID || '1192087206219763753';

const DISCORD_EPOCH = 1420070400000n;
const CHAT_TYPES = new Set([0, 2, 5, 13, 10, 11, 12]);

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

function idToTime(id) {
    return Number((BigInt(id) >> 22n) + DISCORD_EPOCH);
}

async function collectRecentAuthors(channelId, cutoff, authors) {
    let before;
    while (true) {
        const query = new URLSearchParams({ limit: '100' });
        if (before) query.set('before', before);
        const messages = await rest.get(Routes.channelMessages(channelId), { query });
        if (messages.length === 0) return;
        for (const m of messages) {
            if (idToTime(m.id) < cutoff) return;
            if (!m.webhook_id) authors.add(m.author.id);
        }
        if (messages.length < 100) return;
        before = messages[messages.length - 1].id;
    }
}

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
        if (unreadable.length > 0) {
            console.error('읽지 못한 채널:', unreadable);
            return res.status(500).json({
                error: '봇이 읽을 수 없는 채널이 있어 추방을 중단했습니다. 봇에게 "채널 보기"와 "메시지 기록 보기" 권한을 주세요.',
                channels: unreadable,
            });
        }

        const kicked = [];
        const skipped = [];
        for (const m of members) {
            const u = m.user;
            if (u.bot || u.id === guild.owner_id) continue;
            if (authors.has(u.id)) continue;
            if (!m.joined_at || Date.parse(m.joined_at) > cutoff) continue;
            if (permsOf(m) & PermissionFlagsBits.Administrator) continue;
            if (topPositionOf(m) >= botTop) {
                skipped.push(u.username);
                continue;
            }

            try {
                await sendKickDm(u.id, guild.name).catch(() => {});
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
