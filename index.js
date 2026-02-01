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

// ============= CONFIGURATION =============
const PREFIX = '.';
const REQUIRED_GUILD_ID = '1452999261972201637';
const ADMIN_ID = '986240868761632819';
const BOT_APPLICATION_ID = '1454157889836028148';
const MAX_DURATION = 5; // minutes
const DEFAULT_THREADS = 10;
const MAX_CONCURRENT_TASKS = 5;

// ============= STATE =============
const activeSessions = new Map();
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

// ============= DEVICE ID GENERATOR (UUID v4 format) =============
// Based on your test: f59492ab-88a2-4880-8404-4fc30da66834
const generateDeviceId = () => {
    return crypto.randomUUID(); // Generates proper UUID v4 format
};

// ============= LOAD MESSAGES =============
const loadCustomMessages = () => {
    try {
        if (fs.existsSync('messages.txt')) {
            const content = fs.readFileSync('messages.txt', 'utf-8');
            const messages = content.split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0);
            
            if (messages.length > 0) {
                customMessages = messages;
                console.log(`✅ Loaded ${customMessages.length} messages from messages.txt`);
                return true;
            }
        }
        customMessages = DEFAULT_MESSAGES;
        console.log('📝 Using default messages');
        return false;
    } catch (error) {
        console.error('❌ Error loading messages:', error);
        customMessages = DEFAULT_MESSAGES;
        return false;
    }
};

const getRandomMessage = () => {
    const messages = customMessages.length > 0 ? customMessages : DEFAULT_MESSAGES;
    return messages[Math.floor(Math.random() * messages.length)];
};

// ============= PROXY MANAGEMENT =============
const loadProxies = async () => {
    try {
        const socks5Url = 'https://github.com/monosans/proxy-list/raw/refs/heads/main/proxies/socks5.txt';
        
        console.log('🔍 Fetching proxies from GitHub...');
        const response = await fetch(socks5Url);

        if (response.ok) {
            const text = await response.text();
            const proxyList = text.split('\n')
                .map(line => line.trim())
                .filter(line => line && line.includes(':'));
            
            // Shuffle proxies
            for (let i = proxyList.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [proxyList[i], proxyList[j]] = [proxyList[j], proxyList[i]];
            }
            
            proxies = proxyList;
            console.log(`✅ Loaded ${proxies.length} proxies`);
        }

        // Fallback to local file
        if (proxies.length === 0 && fs.existsSync('proxies.txt')) {
            const content = fs.readFileSync('proxies.txt', 'utf-8');
            proxies = content.split('\n')
                .map(line => line.trim())
                .filter(line => line && line.includes(':'));
            console.log(`📁 Loaded ${proxies.length} proxies from local file`);
        }
    } catch (error) {
        console.error('❌ Error loading proxies:', error);
    }
};

const getNextProxy = () => {
    if (proxies.length === 0) return null;
    const proxy = proxies[currentProxyIndex];
    currentProxyIndex = (currentProxyIndex + 1) % proxies.length;
    return proxy;
};

// ============= MAIN NGL SPAM FUNCTION =============
const sendNGLMessage = async (username, sessionId, threadId) => {
    const session = activeSessions.get(sessionId);
    if (!session) return;

    let consecutiveErrors = 0;

    while (session.active && (Date.now() < session.endTime)) {
        try {
            const message = getRandomMessage();
            const deviceId = generateDeviceId(); // UUID v4 format
            
            // API endpoint from your test
            const url = 'https://ngl.link/api/submit';
            
            // Headers (minimal but effective)
            const headers = {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': '*/*',
                'Origin': 'https://ngl.link',
                'Referer': `https://ngl.link/${username}`,
            };

            // Body matching your test format exactly
            const params = new URLSearchParams({
                username: username,
                question: message,
                deviceId: deviceId,
                gameSlug: '',
                referrer: ''
            });

            let fetchOptions = {
                method: 'POST',
                headers: headers,
                body: params.toString()
            };

            // Add proxy if enabled
            if (useProxy && proxies.length > 0) {
                const proxy = getNextProxy();
                try {
                    const agent = new SocksProxyAgent(`socks5://${proxy}`);
                    fetchOptions.agent = agent;
                } catch (err) {
                    console.log(`⚠️ Thread ${threadId}: Bad proxy, skipping...`);
                }
            }

            const response = await fetch(url, fetchOptions);

            if (response.status === 200) {
                // Success!
                session.sent++;
                session.lastSuccess = Date.now();
                consecutiveErrors = 0;
                console.log(`✅ Thread ${threadId}: Message sent (Total: ${session.sent})`);
                
                // Small delay to avoid instant rate limit
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } else if (response.status === 429) {
                // Rate limited
                session.errors++;
                session.lastError = 'Rate Limited (429)';
                console.log(`⏳ Thread ${threadId}: Rate limited - waiting 30s`);
                await new Promise(resolve => setTimeout(resolve, 30000));
                consecutiveErrors = 0; // Reset on rate limit
                
            } else {
                // Other error
                session.errors++;
                session.lastError = `HTTP ${response.status}`;
                consecutiveErrors++;
                console.log(`❌ Thread ${threadId}: HTTP ${response.status}`);
                
                // If too many errors, stop this thread
                if (consecutiveErrors >= 5) {
                    console.log(`🛑 Thread ${threadId}: Too many consecutive errors, stopping`);
                    break;
                }
                
                await new Promise(resolve => setTimeout(resolve, 5000));
            }

        } catch (error) {
            session.errors++;
            session.lastError = error.message.substring(0, 50);
            consecutiveErrors++;
            console.error(`❌ Thread ${threadId}: ${error.message}`);
            
            // Stop thread if too many errors
            if (consecutiveErrors >= 5) {
                console.log(`🛑 Thread ${threadId}: Too many consecutive errors, stopping`);
                break;
            }
            
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }

    session.threadsCompleted++;
    console.log(`🏁 Thread ${threadId} completed (${session.threadsCompleted}/${session.threads})`);
    
    if (session.threadsCompleted >= session.threads) {
        session.active = false;
        await finalizeSession(session);
    }
};

// ============= STATUS EMBED UPDATES =============
const updateStatusEmbed = async (session) => {
    const elapsed = Math.floor((Date.now() - session.startTime) / 1000);
    const remaining = Math.max(0, Math.floor((session.endTime - Date.now()) / 1000));
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    const rate = elapsed > 0 ? (session.sent / elapsed * 60).toFixed(1) : 0;
    const proxyStatus = useProxy ? `✅ ON (${proxies.length})` : '❌ OFF';

    const embed = new EmbedBuilder()
        .setTitle('🎯 Hycron NGL Spam')
        .setColor(0x5865F2)
        .addFields(
            { name: '👤 Target', value: `\`${session.username}\``, inline: true },
            { name: '⏱️ Time Left', value: `\`${minutes}m ${seconds}s\``, inline: true },
            { name: '🧵 Threads', value: `\`${session.threads}\``, inline: true },
            { name: '✅ Sent', value: `\`${session.sent}\``, inline: true },
            { name: '❌ Errors', value: `\`${session.errors}\``, inline: true },
            { name: '📊 Rate', value: `\`${rate}/min\``, inline: true },
            { name: '🔒 Proxy', value: proxyStatus, inline: true },
            { name: '📡 Status', value: session.active ? '🟢 **ACTIVE**' : '🔴 **STOPPED**', inline: true },
            { name: '🏁 Progress', value: `\`${session.threadsCompleted}/${session.threads}\` threads done`, inline: true }
        )
        .setFooter({ text: `Hycron NGL Spam | Session: ${session.sessionId.slice(-8)}` })
        .setTimestamp();

    if (session.lastError) {
        embed.addFields({ name: '⚠️ Last Error', value: `\`${session.lastError}\``, inline: false });
    }

    try {
        await session.statusMessage.edit({ embeds: [embed] });
    } catch (error) {
        // Ignore edit errors
    }
};

const finalizeSession = async (session) => {
    const totalTime = Math.floor((Date.now() - session.startTime) / 1000);
    const avgRate = totalTime > 0 ? (session.sent / totalTime * 60).toFixed(1) : 0;
    const successRate = session.sent + session.errors > 0 
        ? ((session.sent / (session.sent + session.errors)) * 100).toFixed(1)
        : 0;

    const embed = new EmbedBuilder()
        .setTitle('✅ Hycron NGL Spam - Completed!')
        .setColor(0x57F287)
        .addFields(
            { name: '👤 Target', value: `\`${session.username}\``, inline: true },
            { name: '⏱️ Duration', value: `\`${session.duration}m\``, inline: true },
            { name: '🧵 Threads', value: `\`${session.threads}\``, inline: true },
            { name: '✅ Total Sent', value: `\`${session.sent}\``, inline: true },
            { name: '❌ Total Errors', value: `\`${session.errors}\``, inline: true },
            { name: '📊 Avg Rate', value: `\`${avgRate}/min\``, inline: true },
            { name: '🎯 Success Rate', value: `\`${successRate}%\``, inline: true },
            { name: '⏱️ Total Time', value: `\`${Math.floor(totalTime / 60)}m ${totalTime % 60}s\``, inline: true },
            { name: '🏁 Status', value: '**FINISHED** ✅', inline: true }
        )
        .setFooter({ text: 'Hycron NGL Spam | Thanks for using!' })
        .setTimestamp();

    try {
        await session.statusMessage.edit({ embeds: [embed] });
    } catch (error) {
        // Ignore edit errors
    }

    activeSessions.delete(session.sessionId);
    console.log(`✅ Session ${session.sessionId} completed: ${session.sent} sent, ${session.errors} errors`);
};

// ============= BOT EVENTS =============
client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    console.log(`🚀 Hycron NGL Spam Bot is ready!`);
    console.log(`📊 Servers: ${client.guilds.cache.size}`);
    loadCustomMessages();
    updateBotStatus();
});

const updateBotStatus = () => {
    const serverCount = client.guilds.cache.size;
    client.user.setPresence({
        activities: [{ name: `.hycron | ${serverCount} servers`, type: 0 }],
        status: 'online'
    });
};

client.on('guildCreate', () => updateBotStatus());
client.on('guildDelete', () => updateBotStatus());

const isUserInRequiredGuild = async (userId) => {
    try {
        const guild = await client.guilds.fetch(REQUIRED_GUILD_ID);
        const member = await guild.members.fetch(userId);
        return member !== null;
    } catch (error) {
        return false;
    }
};

// ============= COMMANDS =============
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // ===== ADMIN COMMANDS =====
    if (command === 'setstatus') {
        if (message.author.id !== ADMIN_ID) {
            return message.reply('❌ Admin only!');
        }

        const status = args[0]?.toLowerCase();
        if (status === 'on') {
            botEnabled = true;
            return message.reply('✅ Bot **ENABLED**');
        } else if (status === 'off') {
            botEnabled = false;
            return message.reply('❌ Bot **DISABLED**');
        } else {
            return message.reply('Usage: `.setstatus on/off`');
        }
    }

    if (command === 'setproxy') {
        if (message.author.id !== ADMIN_ID) {
            return message.reply('❌ Admin only!');
        }

        const status = args[0]?.toLowerCase();
        if (status === 'on') {
            const msg = await message.reply('⏳ Loading proxies...');
            await loadProxies();
            if (proxies.length === 0) {
                return msg.edit('❌ No proxies loaded!');
            }
            useProxy = true;
            return msg.edit(`✅ Proxy **ENABLED** (${proxies.length} proxies)`);
        } else if (status === 'off') {
            useProxy = false;
            return message.reply('❌ Proxy **DISABLED**');
        } else {
            return message.reply('Usage: `.setproxy on/off`');
        }
    }

    if (command === 'reloadmsg') {
        if (message.author.id !== ADMIN_ID) {
            return message.reply('❌ Admin only!');
        }

        loadCustomMessages();
        return message.reply(`✅ Reloaded **${customMessages.length}** messages`);
    }

    // Check if bot is enabled
    if (!botEnabled) {
        return message.reply('❌ Bot is currently **DISABLED** by admin');
    }

    // Check guild access
    const hasAccess = await isUserInRequiredGuild(message.author.id);
    if (!hasAccess && message.author.id !== ADMIN_ID) {
        return message.reply('🔒 You must be in the required guild to use this bot!');
    }

    // ===== USER COMMANDS =====
    if (command === 'invite') {
        const inviteLink = `https://discord.com/api/oauth2/authorize?client_id=${BOT_APPLICATION_ID}&permissions=274877909056&scope=bot`;
        const embed = new EmbedBuilder()
            .setTitle('📨 Invite Hycron Bot')
            .setColor(0x5865F2)
            .setDescription(`[**Click here to invite**](${inviteLink})`)
            .addFields({ name: 'Invite Link', value: `\`${inviteLink}\``, inline: false })
            .setTimestamp();
        return message.reply({ embeds: [embed] });
    }

    if (command === 'hycron') {
        const embed = new EmbedBuilder()
            .setTitle('📚 Hycron NGL Spam - Commands')
            .setColor(0x5865F2)
            .setDescription('**Available Commands:**')
            .addFields(
                { 
                    name: '`.ngl <username> <duration>`', 
                    value: `Start NGL spam\n• Max duration: ${MAX_DURATION} minutes\n• Threads: ${DEFAULT_THREADS}\n• Messages: ${customMessages.length} loaded`, 
                    inline: false 
                },
                { name: '`.hycron`', value: 'Show this help menu', inline: false },
                { name: '`.invite`', value: 'Get bot invite link', inline: false },
                { name: '\u200B', value: '**Admin Commands:**', inline: false },
                { name: '`.setstatus on/off`', value: 'Enable/disable bot', inline: true },
                { name: '`.setproxy on/off`', value: 'Enable/disable proxy', inline: true },
                { name: '`.reloadmsg`', value: 'Reload messages', inline: true },
                { name: '\u200B', value: '**Example:**', inline: false },
                { name: '`.ngl john123 3`', value: 'Spam user `john123` for 3 minutes', inline: false }
            )
            .setFooter({ text: 'Hycron NGL Spam | Made by Hycron' })
            .setTimestamp();
        return message.reply({ embeds: [embed] });
    }

    if (command === 'ngl') {
        // Check concurrent sessions
        const userActiveSessions = Array.from(activeSessions.values())
            .filter(s => s.userId === message.author.id && s.active);

        if (userActiveSessions.length >= MAX_CONCURRENT_TASKS) {
            return message.reply(`❌ You can only run **${MAX_CONCURRENT_TASKS}** sessions at once!`);
        }

        // Parse arguments
        if (args.length < 2) {
            return message.reply('❌ Usage: `.ngl <username> <duration>`\nExample: `.ngl john123 3`');
        }

        const username = args[0];
        let duration = parseInt(args[1]);

        if (isNaN(duration) || duration <= 0) {
            return message.reply('❌ Duration must be a positive number (in minutes)');
        }

        if (duration > MAX_DURATION) {
            return message.reply(`❌ Duration cannot exceed **${MAX_DURATION}** minutes`);
        }

        // Create session
        const sessionId = `${message.author.id}-${Date.now()}`;
        const startTime = Date.now();
        const endTime = startTime + (duration * 60 * 1000);
        const threads = DEFAULT_THREADS;

        const initialEmbed = new EmbedBuilder()
            .setTitle('🎯 Hycron NGL Spam - Starting...')
            .setColor(0xFEE75C)
            .addFields(
                { name: '👤 Target', value: `\`${username}\``, inline: true },
                { name: '⏱️ Duration', value: `\`${duration}m\``, inline: true },
                { name: '🧵 Threads', value: `\`${threads}\``, inline: true },
                { name: '📡 Status', value: '🟡 **STARTING**', inline: false }
            )
            .setFooter({ text: 'Initializing threads...' })
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

        // Start threads
        for (let i = 0; i < threads; i++) {
            sendNGLMessage(username, sessionId, i);
        }

        console.log(`🚀 Started session ${sessionId}: ${username}, ${duration}m, ${threads} threads`);

        // Update status every 3 seconds
        const updateInterval = setInterval(async () => {
            if (!session.active || Date.now() >= session.endTime) {
                clearInterval(updateInterval);
                return;
            }
            await updateStatusEmbed(session);
        }, 3000);

        // Initial update after 1 second
        setTimeout(() => updateStatusEmbed(session), 1000);
    }
});

// ============= START BOT =============
const TOKEN = 'YOUR_TOKEN_HERE';
client.login(TOKEN);
