// discordStatus.mjs
"use strict";

import fetch from 'node-fetch'; // node-fetch 모듈을 가져옵니다.

// Express.js의 요청과 응답을 처리하는 기본 구조입니다.
export default async (req, res) => {
    const DISCORD_TOKEN = process.env.DISCORD_TOKEN; // 환경 변수에서 Discord 토큰을 가져옵니다.
    const USER_ID = '332383283470139393'; // 확인할 Discord 사용자 ID

    try {
        // 사용자 상태를 확인하기 위한 API 요청
        const presenceResponse = await fetch(`https://discord.com/api/v10/users/${USER_ID}/presence`, {
            method: 'GET',
            headers: {
                'Authorization': `Bot ${DISCORD_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        // 응답 상태 코드 확인
        console.log(`Response status: ${presenceResponse.status}`);

        if (!presenceResponse.ok) {
            const errorText = await presenceResponse.text(); // 오류 메시지 로깅
            throw new Error(`Error fetching Discord presence: ${errorText}`);
        }

        const presenceData = await presenceResponse.json();
        const onlineStatus = presenceData.status; // "online", "idle", "dnd", "offline"

        res.status(200).json({ status: onlineStatus });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch Discord status' });
    }
};
