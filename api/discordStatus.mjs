"use strict";

import { Client, GatewayIntentBits } from 'discord.js';

// Discord 봇 클라이언트 생성
let client; // 클라이언트를 전역 변수로 선언
let botReady = false; // 봇 준비 상태를 추적하는 변수

// 사용자 상태를 가져오는 함수
async function getUserStatus(guildId, userId) {
    if (!client || !botReady) {
        console.error('Client is not initialized or bot is not ready.');
        return null;
    }

    try {
        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
            console.error('Guild not found.');
            return null;
        }

        const member = await guild.members.fetch({ user: userId, force: true });
        if (!member) {
            console.error('User not found in guild.');
            return null;
        }

        const status = member.presence?.status || 'offline';
        console.log(`User status retrieved: ${status}`);
        return status;
    } catch (error) {
        console.error('Error fetching Discord presence:', error);
        return null;
    }
}

// Express.js 요청 처리
export default async (req, res) => {
    const guildId = '1192087206219763753'; // Discord 서버 ID
    const userId = '332383283470139393'; // Discord 사용자 ID

    console.log('Received request to fetch user status');

    // 봇이 준비되지 않은 경우 대기하고 최대 시도 횟수를 설정
    const maxAttempts = 30; // 최대 시도 횟수
    let attempts = 0;

    while (!botReady && attempts < maxAttempts) {
        console.log('Bot is not ready, waiting for 0.5 second...');
        await new Promise(resolve => setTimeout(resolve, 500)); // 0.5초 대기
        attempts++;
    }

    if (!botReady) {
        console.log('Bot is still not ready after attempts, returning 503');
        return res.status(503).json({ error: 'Bot is not ready' });
    }

    try {
        const status = await getUserStatus(guildId, userId); // 사용자 상태 가져오기
        if (status) {
            console.log(`Returning user status: ${status}`);
            res.status(200).json({ status: status });

            // 상태 응답을 받은 후 클라이언트를 종료
            console.log('Bot is logging out...');
            await client.destroy(); // 클라이언트 종료
            client = null; // 클라이언트 초기화
            botReady = false; // 봇 상태를 다시 초기화
        } else {
            console.log('User status not found, returning 404');
            res.status(404).json({ error: 'User not found or no presence information available' });
        }
    } catch (error) {
        console.error('Error fetching user status:', error);
        res.status(500).json({ error: 'Failed to fetch user status' });
    }
};

// 봇 로그인 및 준비 완료 이벤트 처리
async function loginBot() {
    client = new Client({ 
        intents: [ 
            GatewayIntentBits.Guilds, 
            GatewayIntentBits.GuildMembers, 
            GatewayIntentBits.GuildPresences,
        ] 
    });

    try {
        await client.login(process.env.DISCORD_TOKEN);
        console.log('Bot is online!');

        client.once('ready', () => {
            console.log('Bot is ready!');
            botReady = true; // 봇이 준비 상태로 변경
        });
    } catch (err) {
        console.error('Failed to login:', err);
    }
}

// 클라이언트 로그인 시도
await loginBot(); // 클라이언트를 초기화하고 로그인합니다.
