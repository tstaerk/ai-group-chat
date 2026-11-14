# Discord AI Peer — Gemini

Discord AI Peer is a Discord bot that uses Gemini to join text conversations in a server channel or thread. It uses Gemini 3.8 Flash by default, which you can change in `.env`. Mention it or reply to its messages; optionally set `REPLY_MODE=always` to answer every human message. It sees the last 30 messages plus the triggering message, with each message capped at 2,000 characters. Context stays separate per channel.

## 1. Create the Discord bot

A **Discord bot token** is the secret credential the program uses to sign in as your bot. Anyone who has it can act as the bot, so keep it out of Discord messages and GitHub.

1. Open the [Discord Developer Portal](https://discord.com/developers/applications). Select **New Application**, name it (for example, “Gemini Peer”), and create it. If you already have an application for the bot, open it instead.
2. Select **Bot** in the sidebar. Under **Token**, click **Reset Token** if you need a new token, confirm, and complete two-factor authentication if prompted. Copy the token before leaving the page and save it as `DISCORD_TOKEN` in your local `.env` file. Resetting the token invalidates the old one, so update any running deployment that uses it. [Discord’s token instructions](https://support-dev.discord.com/hc/en-us/articles/6470840524311-Why-can-t-I-copy-my-bot-s-token).
3. Enable **Message Content Intent** in the Bot settings. The code requests this intent too.
4. In **Installation**, configure a **Guild Install** with the `bot` scope. Give it **View Channels**, **Send Messages**, and **Read Message History**. For threads, also grant **Send Messages in Threads** and add it to private threads. Use the generated installation link to install it in your server.
5. Create a private text channel for your group. Give your friends and the bot access.
6. In Discord settings enable **Advanced → Developer Mode**. Right-click the channel and **Copy Channel ID**. Threads have separate IDs and must be explicitly added to the allowlist.

This implementation listens to server messages. It does not join a group DM. A private server channel provides the shared conversational experience.

## 2. Get a Gemini API key

Create a key at https://aistudio.google.com/apikey using a Google account with Gemini API access. API quotas and billing depend on your account. Never paste either token into a group chat or commit `.env`.

## 3. Run on Windows, macOS, or Linux

Install Node.js 22 or newer. Open a terminal in this folder:

```powershell
npm install
Copy-Item .env.example .env
notepad .env
```

On macOS/Linux use `cp .env.example .env` and your preferred text editor. Fill in `DISCORD_TOKEN`, `GEMINI_API_KEY`, and `ALLOWED_CHANNEL_IDS`. Multiple IDs are comma-separated. Then:

```powershell
npm test
npm start
```

Wait for `Online as ...`, then post `@Gemini Peer Hey, introduce yourself!` in the allowed channel. Follow up by replying directly to the bot's message (keep reply mentions enabled), or mention it again.

The local bot runs while the process is open. Stop it with Ctrl+C.

## Deploy to Google Cloud Run

For continuous hosting, see the [Cloud Run deployment guide](CLOUD-RUN.md). It uses Frankfurt (`europe-west3`) as the example region.

## Conversation settings

- `REPLY_MODE=mention`: respond to mentions and replies to the bot.
- `REPLY_MODE=always`: respond to each human message when idle and outside the cooldown. This can be noisy and consumes more quota.
- `COOLDOWN_SECONDS=5`: per-channel cooldown. Messages arriving while busy or cooling down do not trigger another response; they can appear in later context.
- `MAX_OUTPUT_TOKENS=800`: caps output length. The model uses its default thinking settings.
- Edit `instructions` in `bot.mjs` to change the personality.
- `@Gemini Peer !ai-help`: explain usage.
- `@Gemini Peer !ai-reset`: start fresh for the channel; requires **Manage Messages** on the person issuing it. This does not delete Discord history or provider records. The cutoff is in memory and is lost after restarting.

## Data and limitations

Tell everyone in the channel that recent message text, display names, and Discord user IDs are sent to Gemini when a response is requested. The bot fetches context from Discord on demand and does not save transcripts locally. Google's API data policies apply; consult https://ai.google.dev/gemini-api/terms before using sensitive conversations. Attachments, image contents, linked pages, voice and browsing are not supported. Other bots and webhooks cannot trigger replies. Generated replies cannot send notifications through @mentions.

## Troubleshooting

- Login fails or disallowed intent: check the Discord bot token and Message Content Intent toggle.
- No response: verify the exact channel/thread ID, bot permissions, mentions, reply mention toggle, cooldown, and that the terminal is still running.
- AI HTTP 400/404: check model availability and generation settings.
- AI HTTP 401/403: check Gemini API key and project access.
- AI HTTP 429: check rate limits and quota. Requests are not automatically retried.
- A blocked or empty model response produces a short failure notice.

## Official references

- Gemini text generation: https://ai.google.dev/gemini-api/docs/text-generation
- Gemini generateContent API: https://ai.google.dev/api/generate-content
- Discord installation: https://docs.discord.com/developers/topics/oauth2
- Discord gateway intents: https://docs.discord.com/developers/events/gateway
