const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const crypto = require('crypto');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

const PREFIX = '.';
const activeSessions = new Map();
const REQUIRED_GUILD_ID = '1452999261972201637';
const ADMIN_ID = '986240868761632819';
const BOT_APPLICATION_ID = '1454157889836028148';
const MAX_DURATION = 5;
const DEFAULT_THREADS = 10;

let botEnabled = true;

const NGL_MESSAGES = [
    'Targetted by Hycron',
    'You got boomed by Hycron',
    'Hycron always on top!'
];

const getRandomMessage = () => {
    return NGL_MESSAGES[Math.floor(Math.random() * NGL_MESSAGES.length)];
};

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
    console.log('Hycron NGL Auto-Send Bot is ready');
    updateBotStatus();
});

const updateBotStatus = () => {
    const serverCount = client.guilds.cache.size;
    client.user.setPresence({
        activities: [{
            name: `.hycron | ${serverCount} Servers`,
            type: 0
        }],
        status: 'online'
    });
};

client.on('guildCreate', () => {
    updateBotStatus();
});

client.on('guildDelete', () => {
    updateBotStatus();
});

const isUserInRequiredGuild = async (userId) => {
    try {
        const guild = await client.guilds.fetch(REQUIRED_GUILD_ID);
        const member = await guild.members.fetch(userId);
        return member !== null;
    } catch (error) {
        return false;
    }
};

const sendNGLMessage = async (username, sessionId) => {
    const session = activeSessions.get(sessionId);
    if (!session) return;

    while (session.active && (Date.now() < session.endTime)) {
        try {
            const message = getRandomMessage();
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

    if (command === 'setstatus') {
        if (message.author.id !== ADMIN_ID) {
            return message.reply('You do not have permission to use this command');
        }

        if (args.length === 0) {
            return message.reply('Usage: .setstatus on/off');
        }

        const status = args[0].toLowerCase();
        if (status === 'on') {
            botEnabled = true;
            const embed = new EmbedBuilder()
                .setTitle('Hycron Bot Status')
                .setColor(0x57F287)
                .setDescription('Hycron bot is now enabled')
                .setFooter({ text: 'Hycron NGL Auto-Send' })
                .setTimestamp();
            return message.reply({ embeds: [embed] });
        } else if (status === 'off') {
            botEnabled = false;
            const embed = new EmbedBuilder()
                .setTitle('Hycron Bot Status')
                .setColor(0xED4245)
                .setDescription('Hycron bot is now disabled')
                .setFooter({ text: 'Hycron NGL Auto-Send' })
                .setTimestamp();
            return message.reply({ embeds: [embed] });
        } else {
            return message.reply('Usage: .setstatus on/off');
        }
    }

    if (!botEnabled) {
        const embed = new EmbedBuilder()
            .setTitle('Hycron Bot Disabled')
            .setColor(0xED4245)
            .setDescription('Hycron bot is now disabled by the owner')
            .setFooter({ text: 'Hycron NGL Auto-Send' })
            .setTimestamp();
        return message.reply({ embeds: [embed] });
    }

    const hasAccess = await isUserInRequiredGuild(message.author.id);
    if (!hasAccess && message.author.id !== ADMIN_ID) {
        const embed = new EmbedBuilder()
            .setTitle('Access Denied')
            .setColor(0xED4245)
            .setDescription('You must be a member of the required guild to use this bot')
            .setFooter({ text: 'Hycron NGL Auto-Send' })
            .setTimestamp();
        return message.reply({ embeds: [embed] });
    }

    if (command === 'invite') {
        const inviteLink = `https://discord.com/api/oauth2/authorize?client_id=${BOT_APPLICATION_ID}&permissions=274877909056&scope=bot`;
        const embed = new EmbedBuilder()
            .setTitle('Invite Hycron Bot')
            .setColor(0x5865F2)
            .setDescription(`[Click here to invite Hycron Bot](${inviteLink})`)
            .addFields(
                { name: 'Invite Link', value: inviteLink, inline: false }
            )
            .setFooter({ text: 'Hycron NGL Auto-Send' })
            .setTimestamp();
        return message.reply({ embeds: [embed] });
    }

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
                    value: `Start NGL auto-send spam\nusername: Target NGL username\nduration: Duration in minutes (max ${MAX_DURATION})\nDefault threads: ${DEFAULT_THREADS}`,
                    inline: false
                },
                {
                    name: '.invite',
                    value: 'Get the bot invite link',
                    inline: false
                },
                {
                    name: 'Example',
                    value: '.ngl john123 3',
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
        let duration = parseInt(args[1]);
        const threads = DEFAULT_THREADS;

        if (isNaN(duration) || duration <= 0) {
            return message.reply('Duration must be a positive number in minutes');
        }

        if (duration > MAX_DURATION) {
            return message.reply(`Duration cannot exceed ${MAX_DURATION} minutes`);
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
            sendNGLMessage(username, sessionId);
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
