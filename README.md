# Crimstone

![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Discord.js](https://img.shields.io/badge/Discord.js-5865F2?style=for-the-badge&logo=discord&logoColor=white)
![Made with Love](https://img.shields.io/badge/Made%20with-Love-ff69b4?style=for-the-badge)
![GitHub last commit](https://img.shields.io/github/last-commit/aubergine-ux/Crimstone-Bot?style=for-the-badge)

A Discord bot built with [Discord.js](https://discord.js.org/)! ~ invite it to your server and get started instantly.

🌐 **Website:** [crim.aubergineux.com](https://crim.aubergineux.com/)

📨 **Invite Crimstone:** [Add to your server](https://discord.com/oauth2/authorize?client_id=1507721065235877958)

---

## Features

- **Moderation** - Complete server management with `ban`, `kick`, `timeout`, `purge` messages, and `echo` tools, plus a per-member history lookup with `modstats`.
- **Levelling** - Members earn XP as they chat, with rank cards (`rank`), role rewards (`levelrole`), and server or global leaderboards (`leaderboard`).
- **Audit log** - Seven independently controlled categories of server activity, set up with `auditlog`.
- **Tools** - Minecraft tracking integrations, including checking server statuses (`mcstatus`) and retrieving user avatar textures (`mcskin`).
- **Utility** - Essential client diagnostics including `ping`, `avatar` lookup, `server` info, `user` profiles, activity stats (`serverstats`), reminders (`reminder`), deleted message recall (`snipe`), an embed builder (`embed`), a quick reference `guide`, and automated command hot-reloads (`reload`).
- **Fun** - Interactive server games and entertainment commands, including responsive search setups for `gif` animations and `ping`.

---

## Levelling

Members earn XP for chatting, on a 10 second cooldown per member.

| Command | What it does |
| --- | --- |
| `/rank [target]` | A rank card showing level, progress, server rank and global rank |
| `/leaderboard [scope]` | Top members — this server, global combined XP, or global best server |
| `/levelrole` | Set up roles awarded at chosen levels |
| `/givexp`, `/setxp` | Adjust a member's XP by hand |

`/leaderboard` has three scopes:

- **This server** — members ranked within the current server.
- **Global — combined XP** — every server added together, so time spent across many servers counts.
- **Global — best server** — each member's single strongest server, which rewards depth over breadth.

Servers are included in the global boards by default. Opt out with `/config global enabled:False`, which removes the server's XP from everyone's global totals and hides the global scopes from its members.

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

## Data storage

Crimstone keeps its data in JSON files next to the commands that use them, all through a shared store (`commands/utility/jsonStore.js`) that:

- writes to a temporary file and renames it into place, so an interrupted write cannot truncate a store,
- refuses to overwrite a file it cannot parse, keeping a `.corrupt-<timestamp>` copy and logging loudly instead,
- keeps data in memory and flushes busy stores on a timer rather than on every message,
- flushes everything on `SIGINT` and `SIGTERM`, so a restart does not drop pending writes.

---

## Self Hosting

### Prerequisites
- [Node.js](https://nodejs.org/) v18+
- A bot token from the [Discord Developer Portal](https://discord.com/developers/applications)
- The **Server Members Intent** and **Message Content Intent** enabled for the application, under *Bot → Privileged Gateway Intents*. Both are privileged, and the bot will not log in without them.

### Steps
1. Clone the repo and run `npm install`
2. Create `config.json` and `.env` with your bot token and client ID
3. Run `node deploy-commands.js` to register commands
4. Start the bot with `node index.js`

---
