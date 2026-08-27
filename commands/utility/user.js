const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder().setName('user').setDescription('Provides information about the user.'),
	async execute(interaction) {
		const { user, member } = interaction;
		const createdAt = Math.floor(user.createdTimestamp / 1000);
		const joinedAt = Math.floor(member.joinedTimestamp / 1000);

		await interaction.reply(
			[
				`This command was run by **${user.username}** (<@${user.id}>).`,
				`Joined: <t:${joinedAt}:D> (<t:${joinedAt}:R>)`,
				`Account created: <t:${createdAt}:D> (<t:${createdAt}:R>)`,
				`Top role: ${member.roles.highest.name} · Roles: ${member.roles.cache.size - 1}`,
			].join('\n'),
		);
	},
};