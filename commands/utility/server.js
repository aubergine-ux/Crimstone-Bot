const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder().setName('server').setDescription('Provides information about the server.'),
	async execute(interaction) {
		const { guild } = interaction;
		const createdAt = Math.floor(guild.createdTimestamp / 1000);

		await interaction.reply(
			[
				`This server is **${guild.name}** and has ${guild.memberCount.toLocaleString()} members.`,
				`Owner: <@${guild.ownerId}>`,
				`Created: <t:${createdAt}:D> (<t:${createdAt}:R>)`,
				`Channels: ${guild.channels.cache.size} · Roles: ${guild.roles.cache.size - 1}`,
			].join('\n'),
		);
	},
};