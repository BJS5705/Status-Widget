"use strict";

import { Client, GatewayIntentBits } from 'discord.js';

let client;

// 봇의 클라이언트를 생성하지 않고, 이미 실행 중인 클라이언트를 사용하도록 수정
async function getUserStatus(guildId, userId) {
    try {
        // 클라이언트가 준비되었는지 확인
        if (!client.isReady()) {
            throw new Error('Client is not ready.');
        }

        // 서버(Guild) 가져오기
        const guild = await client.guilds.fetch(guildId); // fetch로 서버 정보를 가져옴
        if (!guild) {
            console.error('Guild not found.');
            return null;
        }

        // 서버 내의 사용자 정보 가져오기
        const member = await guild.members.fetch(userId); 
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
        res.status(500).json({ error: 'Failed to fetch user status' });
    }
};

// 봇 로그인 및 준비 완료 이벤트 처리
client = new Client({ 
    intents: [ 
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.GuildPresences,
    ] 
});

// 봇 로그인
client.login(process.env.DISCORD_TOKEN)
    .then(() => {
        console.log('Bot is online!');
    })
    .catch(err => {
        console.error('Failed to login:', err);
    });

client.once('ready', () => {
    console.log('Bot is ready!');
});
