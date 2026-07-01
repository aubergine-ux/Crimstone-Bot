const { Events, ActivityType, PresenceUpdateStatus } = require('discord.js');

module.exports = {
	name: Events.ClientReady,
	once: true,
	execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);

		client.user.setPresence({
			activities: [{
				name: 'Protecting Rubia',
				type: ActivityType.Playing,
			}],
			status: PresenceUpdateStatus.Online,
		});

		setInterval(async () => {
			const url = "http://192.168.1.157:3001/api/push/c55euiUf9v?status=up&msg=OK&ping=";
			try {
					const response = await fetch(url);
					if (response.ok) {
							console.log("Sucessfully Pinged Kuma!");
					}
			} catch (error) {
					console.error("Failed to Ping Kuma:", error);
			}
		}, 60000);
	},
};