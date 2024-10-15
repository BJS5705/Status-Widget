// api/discordStatus.mjs
import { Client, GatewayIntentBits } from 'discord.js';

const client = new Client({ 
    intents: [ 
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.GuildPresences 
    ] 
});

let botReady = false;

client.login(process.env.DISCORD_TOKEN)
    .then(() => {
        console.log('Bot is online!');
    })
    .catch(err => {
        console.error('Failed to login:', err);
    });

client.once('ready', () => {
    console.log('Bot is ready!');
    botReady = true;
});

// Vercel의 API 핸들러
export default async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const guildId = '1192087206219763753';
    const userId = '332383283470139393';

    // 봇이 준비될 때까지 대기
    const maxAttempts = 20;
    let attempts = 0;

    while (!botReady && attempts < maxAttempts) {
        console.log('Waiting for bot to be ready...');
        await new Promise(resolve => setTimeout(resolve, 500)); // 0.5초 대기
        attempts++;
    }

    if (!botReady) {
        console.log('Bot is still not ready after attempts, returning 503');
        return res.status(503).json({ error: 'Bot is not ready' });
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
