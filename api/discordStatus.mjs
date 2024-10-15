"use strict";

import { Client, GatewayIntentBits } from 'discord.js';

const client = new Client({ 
    intents: [ 
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.GuildPresences,
    ] 
});

let botReady = false; // 봇 준비 상태를 추적하는 변수

// 봇이 준비되었을 때 실행
client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    botReady = true; // 봇이 준비 상태로 변경
});

// 사용자 상태를 가져오는 함수
async function getUserStatus(guildId, userId) {
    if (!botReady) {
        throw new Error('Client is not ready.');
    }

    try {
        const guild = await client.guilds.fetch(guildId); // 서버(Guild) 가져오기
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

// Express.js 요청 처리
export default async (req, res) => {
    const guildId = '1192087206219763753'; // 확인할 Discord 서버 ID
    const userId = '332383283470139393'; // 확인할 Discord 사용자 ID

    console.log('Received request to fetch user status');

    if (!botReady) {
        console.log('Bot is not ready, returning 503');
        return res.status(503).json({ error: 'Bot is not ready' });
    }

    try {
        const status = await getUserStatus(guildId, userId); // 사용자 상태 가져오기
        if (status) {
            console.log(`Returning user status: ${status}`); // 상태 반환 로그
            res.status(200).json({ status: status });
        } else {
            console.log('User status not found, returning 404');
            res.status(404).json({ error: 'User not found or no presence information available' });
        }
    } catch (error) {
        console.error('Error fetching user status:', error);
        res.status(500).json({ error: error.message }); // 오류 메시지 반환
    }
};

// 봇 로그인
client.login(process.env.DISCORD_TOKEN);
