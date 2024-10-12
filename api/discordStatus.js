const fetch = require('node-fetch');

export default async (req, res) => {
    const DISCORD_TOKEN = process.env.DISCORD_TOKEN; // 환경 변수에서 Discord 토큰 가져오기
    const USER_ID = '332383283470139393'; // 확인할 Discord 사용자 ID

    try {
        // 사용자 상태 확인
        const presenceResponse = await fetch(`https://discord.com/api/v10/users/${USER_ID}/presence`, {
            method: 'GET',
            headers: {
                'Authorization': `Bot ${DISCORD_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        if (!presenceResponse.ok) {
            const errorMessage = await presenceResponse.text(); // 추가: 응답 본문을 텍스트로 가져오기
            console.error('Error fetching Discord presence:', errorMessage); // 오류 메시지 출력
            throw new Error('Error fetching Discord presence');
        }

        const presenceData = await presenceResponse.json();
        const onlineStatus = presenceData.status; // "online", "idle", "dnd", "offline"

        res.status(200).json({ status: onlineStatus });
    } catch (error) {
        console.error('Error in discordStatus API:', error); // 수정: 보다 구체적인 오류 메시지 출력
        res.status(500).json({ error: 'Failed to fetch Discord status' });
    }
};
