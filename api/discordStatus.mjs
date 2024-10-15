"use strict";

import { Client, GatewayIntentBits } from 'discord.js';

// Discord 봇 클라이언트 생성
let client; // 클라이언트를 전역 변수로 선언

let botReady = false; // 봇 준비 상태를 추적하는 변수

// 사용자 상태를 가져오는 함수
async function getUserStatus(guildId, userId) {
    // 클라이언트가 null이거나 준비되지 않은 경우 처리
    if (!client || !botReady) {
        console.error('Client is not initialized or bot is not ready.');
        return null;
    }

    try {
        const guild = client.guilds.cache.get(guildId); // 서버(Guild) 가져오기
        if (!guild) {
            console.error('Guild not found.');
            return null;
        }

        // force: true로 캐시를 무시하고 항상 실시간으로 상태를 가져옴
        const member = await guild.members.fetch({ user: userId, force: true });
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

// Express.js 요청 처리
export default async (req, res) => {
    const guildId = '1192087206219763753'; // 확인할 Discord 서버 ID
    const userId = '332383283470139393'; // 확인할 Discord 사용자 ID

    console.log('Received request to fetch user status');

    // 봇이 준비되지 않은 경우 대기하고 최대 시도 횟수를 설정
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

    try {
        const status = await getUserStatus(guildId, userId); // 사용자 상태 가져오기
        if (status) {
            console.log(`Returning user status: ${status}`); // 상태 반환 로그
            res.status(200).json({ status: status });

            // 로그아웃 및 클라이언트 종료
            console.log('Bot is logging out...');
            await client.destroy(); // 클라이언트 종료
            client = null; // 클라이언트 초기화
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

// 로그인 시도
loginBot();
