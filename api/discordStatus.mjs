// api/discordStatus.mjs
import { Client, GatewayIntentBits } from 'discord.js';

// Client를 초기화
const client = new Client({ 
    intents: [ 
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.GuildPresences 
    ] 
});

// 로컬에서 봇을 실행 중인 경우, 클라이언트가 로그인되어 있다고 가정
let botReady = false;

// 로그인 시 봇 준비 상태 변경
client.login(process.env.DISCORD_TOKEN)
    .then(() => {
        console.log('Bot is online!');
        botReady = true; // 로그인 성공 시 준비 상태 변경
    })
    .catch(err => {
        console.error('Failed to login:', err);
    });

// Vercel의 API 핸들러
export default async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const guildId = '1192087206219763753'; // 확인할 Discord 서버 ID
    const userId = '332383283470139393'; // 확인할 Discord 사용자 ID

    if (!botReady) {
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
