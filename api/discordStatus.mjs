"use strict";

import { Client, GatewayIntentBits } from 'discord.js';

const client = new Client({ 
    intents: [ 
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.GuildPresences,
    ] 
});

// 봇 로그인 및 준비 완료
client.login(process.env.DISCORD_TOKEN)
    .then(() => {
        console.log('Bot is online!');
    })
    .catch(err => {
        console.error('Failed to login:', err);
    });

// 사용자 상태를 가져오는 함수
async function getUserStatus(guildId, userId) {
    try {
        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
            throw new Error('Guild not found.');
        }

        const member = await guild.members.fetch(userId);
        if (!member) {
            throw new Error('User not found in guild.');
        }

        return member.presence?.status || 'offline';
    } catch (error) {
        console.error('Error fetching Discord presence:', error);
        return null;
    }
}

// Express.js 요청 처리
export default async (req, res) => {
    const guildId = '1192087206219763753'; // 확인할 Discord 서버 ID
    const userId = '332383283470139393'; // 확인할 Discord 사용자 ID

    // 봇이 준비되었는지 확인
    if (!client.isReady()) {
        return res.status(503).json({ error: 'Bot is not ready' });
    }

    try {
        const status = await getUserStatus(guildId, userId);
        if (status) {
            res.status(200).json({ status: status });
        } else {
            res.status(404).json({ error: 'User not found or no presence information available' });
        }
    } catch (error) {
        console.error('Error fetching user status:', error);
        res.status(500).json({ error: 'Failed to fetch user status' });
    }
};
