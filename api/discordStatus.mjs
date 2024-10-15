// api/discordStatus.mjs
import { Client, GatewayIntentBits } from 'discord.js';

// 로컬에서 실행 중인 봇의 Client를 직접 가져와서 사용해야 해.
const client = new Client({ 
    intents: [ 
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.GuildPresences 
    ] 
});

// Vercel의 API 핸들러
export default async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const guildId = '1192087206219763753'; // 확인할 Discord 서버 ID
    const userId = '332383283470139393'; // 확인할 Discord 사용자 ID

    // 봇이 로그인되어 있어야만 사용자 상태를 확인할 수 있어
    if (!client.user) {
        console.log('Bot is not logged in, returning 503');
        return res.status(503).json({ error: 'Bot is not logged in' });
    }

    try {
        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
            throw new Error('Guild not found.');
        }

        const member = await guild.members.fetch(userId);
        if (!member) {
            throw new Error('User not found in guild.');
        }

        const status = member.presence?.status || 'offline';
        res.status(200).json({ status: status });
    } catch (error) {
        console.error('Error fetching user status:', error);
        res.status(500).json({ error: 'Failed to fetch user status' });
    }
};
