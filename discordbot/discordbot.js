const { Client, GatewayIntentBits } = require('discord.js');
const fetch = require('node-fetch');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// 봇이 준비되었을 때 실행
client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

// 상태를 가져오는 함수
async function getUserStatus(userId) {
    try {
        const response = await fetch(`https://discord.com/api/v10/users/${userId}`, {
            headers: {
                'Authorization': `Bot ${client.token}`,
            },
        });
        if (!response.ok) {
            throw new Error('Error fetching user status');
        }
        const userData = await response.json();
        return userData;
    } catch (error) {
        console.error('Error fetching Discord presence:', error);
    }
}

// 메시지가 수신되었을 때의 이벤트 핸들러
client.on('messageCreate', async (message) => {
    if (message.content.startsWith('!status')) {
        const userId = message.mentions.users.first()?.id || message.author.id; // 멘션된 사용자가 없으면 메시지 작성자 ID 사용
        const userData = await getUserStatus(userId);

        if (userData) {
            const status = userData?.presence?.status || 'offline'; // 사용자의 상태 가져오기
            message.channel.send(`${userData.username} is currently ${status}.`);
        } else {
            message.channel.send('Could not fetch user status.');
        }
    }
});

// 봇 로그인
client.login(process.env.DISCORD_BOT_TOKEN); // 여기에 봇 토큰을 입력하세요.
