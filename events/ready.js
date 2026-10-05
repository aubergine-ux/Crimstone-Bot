const { Events, ActivityType, PresenceUpdateStatus } = require('discord.js');
const { startReminders } = require('../commands/utility/reminderScheduler.js');
const { startVoiceXp } = require('../commands/utility/voiceXp.js');
const { startTopggStats } = require('../commands/utility/topgg.js');
const { startGiveaways } = require('../commands/utility/giveawayScheduler.js');
const { startAlerts } = require('../commands/utility/alertPoller.js');

module.exports = {
	name: Events.ClientReady,
	once: true,
	execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);

		startReminders(client);
		startVoiceXp(client);
		startTopggStats(client);
		startGiveaways(client);
		startAlerts(client);

		const applyPresence = () => {
			client.user.setPresence({
				activities: [{
					name: 'Protecting Rubia',
					type: ActivityType.Playing,
				}],
				status: PresenceUpdateStatus.Online,
			});
		};

		applyPresence();
		setInterval(applyPresence, 10 * 60 * 1000);

		let pingCount = 0;

		setInterval(async () => {
			const url = "http://192.168.1.157:3001/api/push/c55euiUf9v?status=up&msg=OK&ping=";
			try {
				const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
				if (!response.ok) {
					console.error("Kuma ping returned:", response.status);
					return;
				}
				pingCount++;
				if (pingCount % 30 === 0) {
					console.log(`Kuma: ${pingCount} pings sent.`);
				}
			} catch (error) {
				if (error.name === 'TimeoutError' || error.cause?.code === 'UND_ERR_HEADERS_TIMEOUT') {
					console.error("Kuma ping timed out");
				} else {
					console.error("Failed to Ping Kuma:", error);
				}
			}
		}, 60000);
	},
};