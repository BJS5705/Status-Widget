"use strict";

import { Client, GatewayIntentBits } from 'discord.js';

// Discord 봇 클라이언트 생성 (캐시 무시)
const client = new Client({ 
    intents: [ 
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.GuildPresences 
    ],
    makeCache: (options) => new Map(), // 캐시 비활성화
});

let botReady = false; // 봇 준비 상태를 추적하는 변수

// 사용자 상태를 가져오는 함수
async function getUserStatus(guildId, userId) {
    try {
        const guild = client.guilds.cache.get(guildId); // 서버(Guild) 가져오기
        if (!guild) {
            console.error('Guild not found.');
            return null;
        }

        const member = await guild.members.fetch(userId); // 서버 내의 사용자 정보 가져오기
        if (!member) {
            console.error('User not found in guild.');
            return null;
        }

        const status = member.presence?.status || 'offline'; // 사용자의 상태 가져오기
        console.log(`User status retrieved: ${status}`); // 상태 정보 로그
        return status;
    } catch (error) {
        console.error('Error fetching Discord presence:', error);
        return null;
    }
}

// Vercel의 API 핸들러
export default async (req, res) => {
    const guildId = '1192087206219763753'; // 확인할 Discord 서버 ID
    const userId = '332383283470139393'; // 확인할 Discord 사용자 ID

    console.log('Received request to fetch user status');

    // 봇 로그인
    try {
        await client.login(process.env.DISCORD_TOKEN);
        console.log('Bot is online!');
        
        // 봇이 준비될 때까지 대기
        client.once('ready', () => {
            console.log('Bot is ready!');
            botReady = true; // 봇이 준비 상태로 변경
        });

        // 봇이 준비되지 않은 경우 대기
        const maxAttempts = 20;
        let attempts = 0;

        while (!botReady && attempts < maxAttempts) {
            console.log('Bot is not ready, waiting for 0.4 second...');
            await new Promise(resolve => setTimeout(resolve, 400)); // 0.4초 대기
            attempts++;
        }

        if (!botReady) {
            console.log('Bot is still not ready after attempts, returning 503');
            return res.status(503).json({ error: 'Bot is not ready' });
        }

        // 사용자 상태 가져오기
        const status = await getUserStatus(guildId, userId);
        if (status) {
            console.log(`Returning user status: ${status}`);
            res.status(200).json({ status: status });
        } else {
            console.log('User status not found, returning 404');
            res.status(404).json({ error: 'User not found or no presence information available' });
        }
    } catch (error) {
        console.error('Error during bot operations:', error);
        res.status(500).json({ error: 'Failed to fetch user status' });
    } finally {
        // 봇 로그아웃 및 클라이언트 종료
        await client.destroy(); // 클라이언트 종료
        console.log('Bot has been logged out and client destroyed.');
    }
};
