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
- **Moderation** - Full server management with `ban`, `kick`, `timeout`, `purge`, `slowmode`, and `nickname`, plus a persistent warning system (`warn`, `warnings`, `unwarn`) and role tools (`role-give`, `role-remove`, `role-search`).
- **Leveling** - Message-based XP with customizable rank cards (`rank`, `rankcard`), server leaderboards (`leaderboard`), automatic role rewards at set levels (`levelrole`), and admin adjustments (`givexp`, `setxp`).
- **Tools** - Minecraft integrations (`mcstatus`, `mcskin`) and GitHub utilities (`github-stars`, `github-track`).
- **Utility** - Everyday essentials: `avatar`, `user`, `server`, `roleinfo`, `weather`, `crypto`, `define`, `hex`, `poll`, `afk`, `announce`, `echo`, `uptime`, `info`, `guide`, `help`, and hot-reloading (`reload`).
- **Fun** - Games and entertainment including `roll`, `coinflip`, `ship`, `gif`, `meow`, `catfact`, `mrrp`, and `ping`.
- **Configuration** - Per-server setup via `config` - set level-up channels, mod log destinations, toggle XP, and exclude channels from earning.
---

## Self Hosting

### Prerequisites
- [Node.js](https://nodejs.org/) v18+
- A bot token from the [Discord Developer Portal](https://discord.com/developers/applications)

### Steps
1. Clone the repo and run `npm install`
2. Create `config.json` and `.env` with your bot token and client ID
3. Run `node deploy-commands.js` to register commands
4. Start the bot with `node index.js`

---
