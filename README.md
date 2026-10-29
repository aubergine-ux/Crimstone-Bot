# Crimstone

![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Discord.js](https://img.shields.io/badge/Discord.js-5865F2?style=for-the-badge&logo=discord&logoColor=white)
![Made with Love](https://img.shields.io/badge/Made%20with-Love-ff69b4?style=for-the-badge)
![GitHub last commit](https://img.shields.io/github/last-commit/aubergine-ux/Crimstone-Bot?style=for-the-badge)

A Discord bot built with [Discord.js](https://discord.js.org/)! ~ invite it to your server and get started instantly.

🌐 **Website:** [crim.aubergineux.com](https://crim.aubergineux.com/)

📨 **Invite Crimstone:** [Add to your server](https://discord.com/oauth2/authorize?client_id=1507721065235877958)

💬 **Support server:** [discord.gg/K9rPg4Knc](https://discord.gg/K9rPg4Knc)

🗳️ **Vote:** [top.gg](https://top.gg/bot/1507721065235877958/vote)

---

## Features

- **Moderation** - Complete server management with `ban`, `kick`, `timeout`, `untimeout`, `purge` messages, and `echo` tools, plus a per-member history lookup with `modstats`, case lookups and reason edits with `case`, and automatic punishments when members reach a number of warnings (`warnrules`).
- **Levelling** - Members earn XP as they chat or talk in voice, with rank cards (`rank`), role rewards (`levelrole`), XP boosts (`xpboost`), custom level-up messages, and daily streaks, and server, weekly, monthly or global leaderboards (`leaderboard`).
- **Automod** - Spam timeouts, invite, link and word filters, raid alerts and a minimum account age, set up with `automod`.
- **Welcome** - Join and leave messages and auto roles (`welcome`), plus self-assign role buttons (`buttonroles`).
- **Community** - Button-entry giveaways with level requirements (`giveaway`), a starboard (`starboard`), private support tickets with transcripts (`ticket`), and YouTube and Twitch alerts (`alerts`).
- **Audit log** - Seven independently controlled categories of server activity, set up with `auditlog`.
- **Tools** - Minecraft tracking integrations, including checking server statuses (`mcstatus`) and retrieving user avatar textures (`mcskin`).
- **Utility** - Essential client diagnostics including `ping`, `avatar` lookup, `server` info, `user` profiles, activity stats (`serverstats`), reminders (`reminder`), deleted message recall (`snipe`), an embed builder (`embed`), a quick reference `guide`, and automated command hot-reloads (`reload`).
- **Fun** - Interactive server games and entertainment commands, including responsive search setups for `gif` animations and `ping`.

---

## Levelling

Members earn XP for chatting, on a 10 second cooldown per member. With `/config voicexp` on, they also earn XP every minute they talk in voice with at least one other person. Muted, deafened and AFK-channel members don't earn voice XP.

| Command | What it does |
| --- | --- |
| `/rank [target]` | A rank card showing level, progress, server and global rank, messages sent, voice time and daily streak |
| `/leaderboard [scope]` | An image of the top members — this server, this week, this month, global combined XP, or global best server |
| `/levelrole` | Set up roles awarded at chosen levels |
| `/xpboost` | Multiply XP for chosen roles or channels (a member's best role boost × the channel boost) |
| `/config streaks` | Turn the daily streak XP bonus on or off |
| `/config levelmessage` | Write your own level-up message with `{user}`, `{username}`, `{level}` and `{server}` |
| `/givexp`, `/setxp` | Adjust a member's XP by hand |
| `/resetxp [target]` | Reset one member's XP, or the whole server's after a confirmation |
| `/importxp [mode] [file]` | Import XP from a public MEE6 leaderboard (levels carry over exactly) or from an `/exportxp` file |
| `/exportxp` | Download every member's XP, level, messages and voice time as a JSON file |
| `/noxp` | Stop members with chosen roles from earning XP in chat or voice |
| `/levelsync` | Give or remove reward roles so every member matches their level |

Reward roles are also restored when a member rejoins, and updated whenever `/givexp`, `/setxp` or `/resetxp` changes their level.

Chatting or talking in voice on consecutive days builds a daily streak (days are counted in UTC). Each day after the first adds +2% XP, up to +20% at an 11 day streak. Missing a day resets it. Turn the bonus off with `/config streaks enabled:False`; streaks still show on rank cards.

`/leaderboard` has five scopes:

- **This server** — members ranked within the current server.
- **This week / This month** — XP earned since Monday or since the 1st (UTC), so newer members have a board they can win.
- **Global — combined XP** — every server added together, so time spent across many servers counts.
- **Global — best server** — each member's single strongest server, which rewards depth over breadth.

Server boards only list people who are still in the server. Servers are included in the global boards by default. Opt out with `/config global enabled:False`, which removes the server's XP from everyone's global totals and hides the global scopes from its members.

---

## Warnings

Every warning is a case in the moderation history, so `/modstats` shows them alongside bans, kicks and timeouts. `/unwarn` deactivates a warning without deleting its case.

| Command | What it does |
| --- | --- |
| `/warn`, `/unwarn`, `/warnings` | Warn a member, remove one of their warnings, or list the active ones |
| `/warnrules add` | Automatically time out, kick or ban a member when they reach a number of warnings, like 3 → 1 hour timeout, 5 → kick |
| `/warnrules expiry` | Let warnings stop counting after a number of days. Expired warnings stay in the history |
| `/warnrules list`, `/warnrules remove` | See or remove rules |
| `/case view`, `/case reason` | Look up any case by number, or correct its reason |

A rule fires once, when a member reaches exactly that many active warnings, and is logged as its own case.

---

## Audit log

`/auditlog channel #channel` switches the audit log on. Every category is then recorded there by default, and each one can be turned off or pointed at its own channel with `/auditlog category`.

| Category | Covers |
| --- | --- |
| Messages | Edits, deletions and bulk purges |
| Members | Joins, leaves and nickname changes |
| Roles | Member role changes, roles created, deleted or edited |
| Channels | Channels created, deleted or renamed |
| Voice | Voice joins, leaves and moves |
| Server | Server settings and emoji changes |
| Moderation | Bans and unbans |

Use `/auditlog view` to see the current setup, and `/auditlog reset` to clear it.

---

## Automod

Every rule starts off. Turn them on with `/automod`, and set a mod log with `/config modlog` so actions and raid alerts are recorded. Members with Manage Messages, and any roles or channels added with `/automod exempt`, are never filtered.

| Rule | What it does |
| --- | --- |
| `spam` | Deletes a burst of messages (5 in 5 seconds by default) and times the member out |
| `invites` | Removes Discord server invites |
| `links` | Removes every link |
| `words` | Removes messages containing a blocked word or phrase |
| `raid` | Alerts the mod log when lots of members join at once |
| `accountage` | Kicks accounts younger than a set number of days as they join, with a DM explaining why |

---

## Welcome and roles

- `/welcome join` and `/welcome leave` post a message when members come and go. Messages can use `{user}`, `{username}`, `{server}` and `{count}`. Try them with `/welcome test`.
- `/welcome autorole` gives up to five roles to every new member. Members still on the rules screen get them once they accept.
- `/buttonroles` posts a message with up to five buttons members click to add or remove a role.

---

## Community

| Command | What it does |
| --- | --- |
| `/giveaway start` | A giveaway members enter with a button, optionally needing a minimum level. End it early, cancel or reroll it later |
| `/starboard setup` | Reposts messages that reach a number of ⭐ (or any emoji) to a highlights channel. Self-stars and bots don't count |
| `/ticket setup`, `/ticket panel` | A button that opens a private channel with the support role. Closing saves a transcript to the log channel and the member's DMs |
| `/alerts add` | Posts when a YouTube channel uploads or a Twitch streamer goes live, checked every 3 minutes |

YouTube alerts work out of the box. Twitch alerts need `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET` in `.env`, from an application at [dev.twitch.tv/console](https://dev.twitch.tv/console).

---

## Data storage

Crimstone keeps everything in a SQLite database at `data/crimstone.db` (`commands/utility/database.js`):

- levels and moderation cases have their own tables, so leaderboards, streaks and case lookups are single queries,
- settings and other stores go through a shared store (`commands/utility/jsonStore.js`) that saves one row per server and only rewrites the servers that changed,
- every save is a transaction, so a crash or power cut can't leave half-written data,
- busy stores flush on a timer, and everything flushes on `SIGINT` and `SIGTERM`.

Older versions kept data in JSON files in `commands/utility/`. On first start those are imported automatically and renamed to `.json.migrated`. Once you've checked everything is there, the `.migrated` files can be deleted. `data/` and the JSON files are git-ignored and must never be committed.

---

## Self Hosting

### Prerequisites
- [Node.js](https://nodejs.org/) v22+
- A bot token from the [Discord Developer Portal](https://discord.com/developers/applications)
- The **Server Members Intent** and **Message Content Intent** enabled for the application, under *Bot → Privileged Gateway Intents*. Both are privileged, and the bot will not log in without them.

### Steps
1. Clone the repo and run `npm install`
2. Create `config.json` and `.env` with your bot token and client ID
3. Optionally add `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET` for Twitch alerts, and `TOPGG_TOKEN` to `.env` (from your bot's top.gg page → Edit → Webhooks). With it, `/vote` shows whether a member has voted and the server count is posted to top.gg every 30 minutes.
4. Run `npm run deploy` to register commands
5. Start the bot with `npm start`, or keep it running and restart it after crashes with [pm2](https://pm2.keymetrics.io/): `pm2 start ecosystem.config.js`

---
