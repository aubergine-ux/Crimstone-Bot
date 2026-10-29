require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits, Partials } = require('discord.js');
const { flushAll } = require('./commands/utility/jsonStore.js');

const client = new Client({ intents: [
	GatewayIntentBits.Guilds,
	GatewayIntentBits.GuildMessages,
	GatewayIntentBits.MessageContent,
	GatewayIntentBits.GuildMembers,
	GatewayIntentBits.GuildModeration,
	GatewayIntentBits.GuildVoiceStates,
	GatewayIntentBits.GuildExpressions,
	GatewayIntentBits.GuildMessageReactions,
	],
	partials: [Partials.Message, Partials.Reaction, Partials.User],
});

client.commands = new Collection();
client.cooldowns = new Collection();
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		if ('data' in command && 'execute' in command) {
			if (client.commands.has(command.data.name)) {
				console.log(`[WARNING] Skipped ${filePath}: another file already registers /${command.data.name}.`);
				continue;
			}
			client.commands.set(command.data.name, command);
		}
	}
}

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith('.js'));
for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const loaded = require(filePath);
	const handlers = Array.isArray(loaded) ? loaded : [loaded];
	for (const event of handlers) {
		if (!event || !event.name || typeof event.execute !== 'function') {
			console.log(`[WARNING] An event in ${filePath} is missing a "name" or "execute" property.`);
			continue;
		}
		// One failing handler shouldn't take the rest of the bot down with it.
		const run = async (...args) => {
			try {
				await event.execute(...args);
			} catch (error) {
				console.error(`[EVENT ERROR] ${event.name} in ${file}:`, error);
			}
		};

		if (event.once) {
			client.once(event.name, run);
		} else {
			client.on(event.name, run);
		}
	}
}

const shutdown = (signal) => {
	console.log(`[SHUTDOWN] ${signal} received, saving data before exit.`);
	flushAll();
	client.destroy();
	process.exit(0);
};

client.on(Events.Error, (error) => console.error('[CLIENT ERROR]', error));
client.on(Events.ShardError, (error, shardId) => console.error(`[SHARD ERROR] Shard ${shardId}:`, error));

process.on('unhandledRejection', (error) => {
	console.error('[UNHANDLED REJECTION]', error);
});

// After an uncaught exception the process is in an unknown state, so save and exit
// and let the process manager start a fresh one.
process.on('uncaughtException', (error) => {
	console.error('[UNCAUGHT EXCEPTION]', error);
	flushAll();
	process.exit(1);
});

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('exit', flushAll);

client.login(process.env.DISCORD_TOKEN);