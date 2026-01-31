# Hycron NGL Auto-Send Discord Bot

A Discord bot that automates NGL message sending with real-time status tracking.

## Features

- Auto-send NGL messages to specified usernames
- Multi-threaded message sending (default: 5 threads)
- Real-time status dashboard with embed updates
- Configurable duration in minutes
- Automatic error handling and rate limit management

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
   - Copy the bot token

4. Configure the bot:
   - Open `hycron-bot.js`
   - Replace `YOUR_BOT_TOKEN_HERE` with your actual bot token

5. Invite the bot to your server:
   - Go to OAuth2 > URL Generator
   - Select scopes: `bot`
   - Select permissions: `Send Messages`, `Embed Links`, `Read Message History`
   - Copy the generated URL and open it in your browser

6. Start the bot:
```bash
npm start
```

## Commands

### .hycron
Display all available commands and usage information.

### .ngl [username] [duration]
Start NGL auto-send spam.

Parameters:
- `username`: Target NGL username
- `duration`: Duration in minutes

Default threads: 5

Example:
```
.ngl john123 10
```

This will spam the NGL user "john123" for 10 minutes using 5 threads.

## Status Dashboard

When you run the `.ngl` command, the bot will reply with a real-time status dashboard showing:
- Target: The username being targeted
- Duration: Total duration in minutes
- Threads: Number of concurrent threads (5)
- Sent: Number of successfully sent messages
- Errors/Timeout: Number of failed attempts
- Remaining: Time remaining in the session

The dashboard updates every 3 seconds until the duration expires.

## Message Content

All NGL messages sent will contain: "Targetted by Hycron!"

## Technical Details

- Uses Discord.js v14
- Implements proper rate limit handling
- 25 second delay on rate limits
- 5 second delay on errors
- Automatic session cleanup
- Multi-threaded concurrent sending

## Notes

- This bot is for educational purposes only
- Use responsibly and respect NGL's terms of service
- The bot requires Message Content Intent to be enabled
- Sessions are tracked per user to prevent conflicts

## Troubleshooting

If the bot is not responding to commands:
1. Ensure Message Content Intent is enabled in Discord Developer Portal
2. Verify the bot has proper permissions in your server
3. Check that the bot token is correctly set
4. Make sure Node.js version is 16.9.0 or higher

## License

ISC
