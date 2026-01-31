// index.js
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const crypto = require('crypto');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const PREFIX = '.';
const activeSessions = new Map();

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
    console.log('Hycron NGL Bot is ready');
});

const sendNGLMessage = async (username, message, sessionId) => {
    const session = activeSessions.get(sessionId);
    if (!session) return;

    while (session.active && (Date.now() < session.endTime)) {
        try {
            const deviceId = crypto.randomBytes(21).toString('hex');
            const url = 'https://ngl.link/api/submit';
            const headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/109.0',
                'Accept': '*/*',
                'Accept-Language': 'en-US,en;q=0.5',
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-origin',
                'Referer': `https://ngl.link/${username}`,
                'Origin': 'https://ngl.link'
            };
            const body = `username=${username}&question=${message}&deviceId=${deviceId}&gameSlug=&referrer=`;

            const response = await fetch(url, {
                method: 'POST',
                headers,
                body,
                mode: 'cors',
                credentials: 'include'
            });

            if (response.status !== 200) {
                session.errors++;
                await new Promise(resolve => setTimeout(resolve, 25000));
            } else {
                session.sent++;
            }

            await updateStatusEmbed(session);

        } catch (error) {
            session.errors++;
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }

    session.active = false;
    await finalizeSession(session);
};

const updateStatusEmbed = async (session) => {
    const elapsed = Math.floor((Date.now() - session.startTime) / 1000);
    const remaining = Math.max(0, Math.floor((session.endTime - Date.now()) / 1000));
    
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;

    const embed = new EmbedBuilder()
        .setTitle('Hycron NGL Auto-Send')
        .setColor(0x5865F2)
        .addFields(
            { name: 'Target', value: session.username, inline: true },
            { name: 'Duration', value: `${session.duration} minutes`, inline: true },
            { name: 'Threads', value: `${session.threads}`, inline: true },
            { name: 'Sent', value: `${session.sent}`, inline: true },
            { name: 'Errors/Timeout', value: `${session.errors}`, inline: true },
            { name: 'Remaining', value: `${minutes}m ${seconds}s`, inline: true }
        )
        .setFooter({ text: 'Hycron NGL Auto-Send' })
        .setTimestamp();

    try {
        await session.statusMessage.edit({ embeds: [embed] });
    } catch (error) {
        console.error('Failed to update status embed:', error);
    }
};

const finalizeSession = async (session) => {
    const embed = new EmbedBuilder()
        .setTitle('Hycron NGL Auto-Send - Completed')
        .setColor(0x57F287)
        .addFields(
            { name: 'Target', value: session.username, inline: true },
            { name: 'Duration', value: `${session.duration} minutes`, inline: true },
            { name: 'Threads', value: `${session.threads}`, inline: true },
            { name: 'Total Sent', value: `${session.sent}`, inline: true },
            { name: 'Total Errors/Timeout', value: `${session.errors}`, inline: true },
            { name: 'Status', value: 'Finished', inline: true }
        )
        .setFooter({ text: 'Hycron NGL Auto-Send' })
        .setTimestamp();

    try {
        await session.statusMessage.edit({ embeds: [embed] });
    } catch (error) {
        console.error('Failed to finalize status embed:', error);
    }

    activeSessions.delete(session.sessionId);
};

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'hycron') {
        const embed = new EmbedBuilder()
            .setTitle('Hycron NGL Auto-Send Commands')
            .setColor(0x5865F2)
            .setDescription('Available commands for Hycron NGL Auto-Send Bot')
            .addFields(
                {
                    name: '.hycron',
                    value: 'Display all available commands',
                    inline: false
                },
                {
                    name: '.ngl [username] [duration]',
                    value: 'Start NGL auto-send spam\nusername: Target NGL username\nduration: Duration in minutes\nDefault threads: 5',
                    inline: false
                },
                {
                    name: 'Example',
                    value: '.ngl john123 10',
                    inline: false
                }
            )
            .setFooter({ text: 'Hycron NGL Auto-Send' })
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    }

    if (command === 'ngl') {
        if (args.length < 2) {
            return message.reply('Usage: .ngl [username] [duration]');
        }

        const username = args[0];
        const duration = parseInt(args[1]);
        const threads = 5;

        if (isNaN(duration) || duration <= 0) {
            return message.reply('Duration must be a positive number in minutes');
        }

        const sessionId = `${message.author.id}-${Date.now()}`;
        const startTime = Date.now();
        const endTime = startTime + (duration * 60 * 1000);

        const initialEmbed = new EmbedBuilder()
            .setTitle('Hycron NGL Auto-Send')
            .setColor(0x5865F2)
            .addFields(
                { name: 'Target', value: username, inline: true },
                { name: 'Duration', value: `${duration} minutes`, inline: true },
                { name: 'Threads', value: `${threads}`, inline: true },
                { name: 'Sent', value: '0', inline: true },
                { name: 'Errors/Timeout', value: '0', inline: true },
                { name: 'Remaining', value: `${duration}m 0s`, inline: true }
            )
            .setFooter({ text: 'Hycron NGL Auto-Send' })
            .setTimestamp();

        const statusMessage = await message.reply({ embeds: [initialEmbed] });

        const session = {
            sessionId,
            username,
            duration,
            threads,
            sent: 0,
            errors: 0,
            startTime,
            endTime,
            active: true,
            statusMessage
        };

        activeSessions.set(sessionId, session);

        for (let i = 0; i < threads; i++) {
            sendNGLMessage(username, 'Targetted by Hycron!', sessionId);
        }

        const updateInterval = setInterval(async () => {
            if (!session.active || Date.now() >= session.endTime) {
                clearInterval(updateInterval);
                return;
            }
            await updateStatusEmbed(session);
        }, 3000);
    }
});

const TOKEN = 'YOUR_BOT_TOKEN_HERE';
client.login(TOKEN);
