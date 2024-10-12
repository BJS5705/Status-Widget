const fetch = require('node-fetch');

export default async (req, res) => {
    const DISCORD_TOKEN = process.env.DISCORD_TOKEN; // 환경 변수에서 Discord 토큰 가져오기
    const USER_ID = '332383283470139393'; // 확인할 Discord 사용자 ID

    try {
        // 사용자 정보를 가져오기
        const response = await fetch(`https://discord.com/api/v10/users/${USER_ID}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bot ${DISCORD_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Error fetching Discord user info');
        }

        // 사용자의 상태 정보 가져오기
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

        // Vercel API로 상태 전송
        const vercelApiUrl = 'YOUR_VERCEL_API_URL'; // Vercel API URL로 변경하세요.
        
        const apiResponse = await fetch(vercelApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: onlineStatus })
        });

        if (!apiResponse.ok) {
            throw new Error('Error sending status to Vercel API');
        }

        res.status(200).json({ status: onlineStatus });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch Discord status' });
    }
};
