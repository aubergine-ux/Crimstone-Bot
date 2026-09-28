const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { VOTE_URL, TOPGG_URL } = require('../utility/links.js');
const { hasVoted } = require('../utility/topgg.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('vote')
        .setDescription('Vote for Crimstone on top.gg.'),

    async execute(interaction) {
        const voted = await hasVoted(interaction.client.user.id, interaction.user.id);

        let status = 'Voting helps more servers find Crimstone. You can vote once every 12 hours.';

        if (voted === true) status = '💖 Thanks, you\'ve voted in the last 12 hours! Come back after that to vote again.';
        if (voted === false) status = 'You haven\'t voted in the last 12 hours — it only takes a few seconds!';

        const embed = new EmbedBuilder()
            .setColor(0xFF3366)
            .setTitle('🗳️ Vote for Crimstone')
            .setDescription(status);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel('Vote on top.gg').setStyle(ButtonStyle.Link).setURL(VOTE_URL),
            new ButtonBuilder().setLabel('Leave a Review').setStyle(ButtonStyle.Link).setURL(TOPGG_URL),
        );

        await interaction.reply({ embeds: [embed], components: [row] });
    },
};
