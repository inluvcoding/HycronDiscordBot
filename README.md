# Hycron NGL Spam Discord Bot

A Discord bot that automates NGL message spamming with real-time status tracking and proxy support.

## Features

- Auto-spam NGL messages to specified usernames
- Multi-threaded message sending (default: 10 threads)
- Real-time status dashboard with live updates
- Configurable duration in minutes (max 5 minutes)
- Maximum 5 concurrent spam tasks per user
- Proxy support with automatic type detection
- Automatic error handling and rate limit management
- Guild-based access control
- Admin controls to enable/disable bot and proxy
- Random message selection from 3 variants
- Bot invite link command
- Detailed statistics: send rate, errors, proxy status

## Setup

1. Install Node.js (version 16.9.0 or higher)

2. Install dependencies:
```bash
npm install
```

3. Create a Discord Bot:
   - Go to https://discord.com/developers/applications
   - Click "New Application"
   - Go to "Bot" section and click "Add Bot"
   - Enable "Message Content Intent" under Privileged Gateway Intents
   - Enable "Server Members Intent" under Privileged Gateway Intents
   - Copy the bot token

4. Configure the bot:
   - Open `index.js`
   - Replace `YOUR_BOT_TOKEN_HERE` with your actual bot token

5. Configure proxies (optional):
   - Proxies are automatically loaded from GitHub when you use `.setproxy on`
   - Or manually create `proxies.txt` in format `ip:port` (one per line)
   - Example:
   ```
   124.248.168.90:1080
   192.168.1.1:9050
   ```

6. Invite the bot to your server:
   - Go to OAuth2 > URL Generator
   - Select scopes: `bot`
   - Select permissions: `Send Messages`, `Embed Links`, `Read Message History`
   - Copy the generated URL and open it in your browser

7. Start the bot:
```bash
npm start
```

## Access Requirements

Users must be members of the required guild (ID: 1452999261972201637) to use the bot commands.

Admin ID: 986240868761632819 has full access regardless of guild membership.

## Commands

### .hycron
Display all available commands and usage information.

### .ngl [username] [duration]
Start NGL spam.

Parameters:
- `username`: Target NGL username
- `duration`: Duration in minutes (maximum 5 minutes)

Default threads: 10
Max concurrent tasks: 5 per user

Example:
```
.ngl john123 3
```

This will spam the NGL user "john123" for 3 minutes using 10 threads.

### .invite
Get the bot invite link to add Hycron to other servers.

### .setstatus [on/off]
Admin only command to enable or disable the bot.

Parameters:
- `on`: Enable the bot
- `off`: Disable the bot

Example:
```
.setstatus off
```

When disabled, all users will see "Hycron bot is now disabled by the owner" message.

### .setproxy [on/off]
Admin only command to enable or disable proxy usage.

When enabled, automatically loads proxies from GitHub (SOCKS4 + SOCKS5 mixed).

Parameters:
- `on`: Enable proxy and load from GitHub
- `off`: Disable proxy (use direct connection)

Example:
```
.setproxy on
```

The bot will fetch fresh proxies from:
- https://github.com/monosans/proxy-list (SOCKS4 + SOCKS5)

## Message Variants

The bot randomly selects one of these messages to send:
- "Targetted by Hycron"
- "You got boomed by Hycron"
- "Hycron always on top!"

## Status Dashboard

When you run the `.ngl` command, the bot will reply with a real-time status dashboard showing:
- Target: The username being targeted
- Duration: Total duration in minutes
- Threads: Number of concurrent threads (10)
- Sent: Number of successfully sent messages
- Errors: Number of failed attempts
- Remaining: Time remaining in the session
- Rate: Messages sent per minute
- Proxy: Proxy status (Enabled/Disabled with count)
- Status: Current status (Spamming/Completed)
- Last Error: Most recent error (if any)

The dashboard updates every 2 seconds until the duration expires.

## Proxy Support

### Automatic Proxy Loading
When you use `.setproxy on`, the bot automatically fetches proxies from GitHub:
- SOCKS5: https://github.com/monosans/proxy-list/raw/refs/heads/main/proxies/socks5.txt
- SOCKS4: https://github.com/monosans/proxy-list/raw/refs/heads/main/proxies/socks4.txt

The bot will:
1. Download both SOCKS4 and SOCKS5 proxy lists
2. Mix them together randomly
3. Use the combined pool for spam sessions

### Manual Proxy Setup (Optional)
You can also add proxies manually to `proxies.txt` in the format:
```
ip:port
```

Example:
```
124.248.168.90:1080
192.168.1.1:9050
45.76.123.45:1080
```

### Proxy Features
- Automatic SOCKS4/SOCKS5 detection from GitHub
- Round-robin proxy rotation
- Proxy status displayed in dashboard
- Enable/disable via `.setproxy` command
- Fallback to direct connection if proxy fails
- Mixed SOCKS4 + SOCKS5 for better success rate

## Technical Details

- Uses Discord.js v14
- SOCKS proxy support via socks-proxy-agent
- Implements proper rate limit handling
- 25 second delay on rate limits
- 5 second delay on errors
- Automatic session cleanup
- Multi-threaded concurrent sending
- Guild membership verification
- Admin-only bot control
- Per-user concurrent task limiting

## Configuration

### Required Guild ID
`1452999261972201637`

### Admin User ID
`986240868761632819`

### Bot Application ID
`1454157889836028148`

### Limits
- Maximum duration: 5 minutes
- Default threads: 10
- Max concurrent tasks per user: 5

## Required Intents

Make sure the following intents are enabled in Discord Developer Portal:
1. Message Content Intent
2. Server Members Intent

## Notes

- This bot is for educational purposes only
- Use responsibly and respect NGL's terms of service
- The bot requires Message Content Intent and Server Members Intent to be enabled
- Sessions are tracked per user to prevent conflicts
- Only users in the required guild can use the bot
- Admin can enable/disable the bot and proxy at any time
- Each user can run maximum 5 spam tasks simultaneously

## Troubleshooting

If the bot is not responding to commands:
1. Ensure Message Content Intent and Server Members Intent are enabled in Discord Developer Portal
2. Verify the bot has proper permissions in your server
3. Check that the bot token is correctly set
4. Make sure Node.js version is 16.9.0 or higher
5. Verify you are a member of the required guild
6. Check if the bot is enabled using .setstatus command
7. For proxy issues, verify proxies.txt format and proxy availability

## License

ISC
