# Hycron NGL Spam Bot (Python-Based Fix)

## 🎯 What Was Fixed

This version is based on the working Python NGL spam script and includes:

1. ✅ **Correct Device ID Generation** - Matches Python script format (8-4-4-4-12)
2. ✅ **Proper Headers** - Exact headers from working Python script
3. ✅ **User Agent Rotation** - Randomizes user agents like Python version
4. ✅ **Better Error Handling** - Implements the "change info after 4 failures" logic
5. ✅ **Proxy Rotation** - Rotates proxies on failures
6. ✅ **Rate Limit Management** - Proper delays and backoff

## 📋 Key Differences from Original

### Original (Broken):
```javascript
// Wrong device ID format
const deviceId = crypto.randomBytes(21).toString('hex');

// Static user agent
'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0)...'
```

### Fixed (Python-Based):
```javascript
// Correct device ID format (8-4-4-4-12)
const deviceId = generateDeviceId();
// Returns: "a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6"

// Random user agent rotation
'user-agent': getRandomUserAgent()
```

## 🚀 Installation

### 1. Install Dependencies

```bash
npm install discord.js socks-proxy-agent
```

### 2. Setup Files

Place these files in the same directory:
- `ngl-bot-python-based.js` (main bot file)
- `messages.txt` (custom messages - optional)
- `user-agents.txt` (custom user agents - optional)
- `proxies.txt` (your proxies - optional)

### 3. Configure Bot Token

Edit line at the bottom of the file:
```javascript
const TOKEN = 'YOUR_BOT_TOKEN_HERE';
```

### 4. Run the Bot

```bash
node ngl-bot-python-based.js
```

## 📝 Commands

### User Commands:
- `.hycron` - Show all commands
- `.ngl [username] [duration]` - Start spam (e.g., `.ngl john123 3`)
- `.invite` - Get bot invite link

### Admin Commands:
- `.setstatus on/off` - Enable/disable bot
- `.setproxy on/off` - Enable/disable proxy
- `.reloadmsg` - Reload messages from messages.txt
- `.reloadua` - Reload user agents from user-agents.txt

## 🔧 Configuration

### messages.txt
Add one message per line:
```
Targetted by Hycron
You got boomed by Hycron
Hycron always on top!
Custom message here
Another custom message
```

### user-agents.txt
Add one user agent per line:
```
Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...
Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36...
```

### proxies.txt (Optional)
Add one proxy per line (format: `ip:port`):
```
123.456.789.012:1080
98.765.432.101:1080
```

Or use `.setproxy on` to auto-load from GitHub.

## 🎮 Usage Example

```
.ngl john123 3
```
This will:
- Target user: john123
- Duration: 3 minutes
- Threads: 10 (default)
- Send random messages from messages.txt
- Rotate user agents from user-agents.txt
- Use proxies if enabled

## 🔍 Key Features

### From Python Script:
1. **Device ID Format**: `8-4-4-4-12` character format
2. **User Agent Rotation**: Random UA for each request
3. **Failure Handling**: Changes info after 4 consecutive failures
4. **Proxy Rotation**: Rotates proxies on errors
5. **Rate Limit Respect**: 25s wait on 429 errors

### Enhanced for Discord:
1. **Multi-Threading**: 10 concurrent threads per session
2. **Real-Time Updates**: Status updates every 2 seconds
3. **Session Management**: Up to 5 concurrent sessions per user
4. **Rich Embeds**: Beautiful Discord embeds
5. **Guild Access Control**: Require membership to use

## ⚙️ Settings (in code)

```javascript
const MAX_DURATION = 5;              // Max minutes per session
const DEFAULT_THREADS = 10;          // Threads per session
const MAX_CONCURRENT_TASKS = 5;      // Max sessions per user
const REQUIRED_GUILD_ID = 'YOUR_GUILD_ID';
const ADMIN_ID = 'YOUR_ADMIN_ID';
```

## 🛡️ Error Handling

The bot handles:
- ✅ Rate limiting (429) - Waits 25 seconds
- ✅ 404 errors - Stops thread after 3 consecutive failures
- ✅ Proxy errors - Rotates to next proxy
- ✅ Network errors - Retries with 5s delay
- ✅ Bad responses - Changes info after 4 failures

## 📊 Status Updates

Real-time tracking shows:
- Total messages sent
- Total errors
- Current rate (messages/min)
- Remaining time
- Last error
- Proxy status
- Thread completion

## 🔒 Security Notes

⚠️ **Important**:
- Your bot token is visible in the code - keep it private
- Consider using environment variables: `process.env.BOT_TOKEN`
- The Python script shows this endpoint IS working
- NGL may still implement anti-bot measures over time

## 🐛 Troubleshooting

### Still getting 404?
1. The Python script works, so endpoint is correct
2. Check if NGL updated their API today
3. Try without proxy first: `.setproxy off`
4. Test with Python script to confirm endpoint still works

### Rate Limited?
- Normal! The bot waits 25s automatically
- Using proxies helps: `.setproxy on`
- Reduce threads if needed (edit DEFAULT_THREADS)

### Proxies not working?
- Use `.setproxy on` to auto-load from GitHub
- Or manually add to proxies.txt (one per line: ip:port)
- Bad proxies are automatically rotated

## 📈 Performance Tips

1. **Use Proxies**: Enable with `.setproxy on`
2. **Custom Messages**: Add variety to messages.txt
3. **User Agents**: More UAs = more realistic
4. **Optimal Duration**: 3-5 minutes works best
5. **Monitor Status**: Watch for rate limits

## 🎓 How It Works

Based on the Python script analysis:

1. Generates proper device ID (8-4-4-4-12 format)
2. Selects random user agent from pool
3. Sends POST to https://ngl.link/api/submit
4. If success (200): count and continue
5. If rate limit (429): wait 25s
6. If 4 failures: rotate proxy/info
7. Updates Discord embed every 2s

## 📦 Files Included

- `ngl-bot-python-based.js` - Main bot (fixed version)
- `messages.txt` - Example messages
- `user-agents.txt` - Example user agents
- `README.md` - This file

## 🆘 Support

If issues persist:
1. Test the Python script first
2. Check if NGL.link changed API
3. Enable debug logging in console
4. Try direct connection (no proxy)
5. Verify user exists on NGL.link

---

**Made by Hycron** | Based on working Python NGL spam script
