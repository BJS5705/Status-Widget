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
            throw new Error('Error fetching Discord presence');
        }

        const presenceData = await presenceResponse.json();
        const onlineStatus = presenceData.status; // "online", "idle", "dnd", "offline"

        res.status(200).json({ status: onlineStatus });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch Discord status' });
    }
};
