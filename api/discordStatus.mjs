// api/discordStatus.mjs
import express from 'express';
import { Client, GatewayIntentBits } from 'discord.js';

const app = express();
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

app.get('/status', async (req, res) => {
    const guildId = '1192087206219763753';
    const userId = '332383283470139393';

    if (!botReady) {
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
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
