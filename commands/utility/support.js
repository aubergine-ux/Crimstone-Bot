const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { SUPPORT_URL, WEBSITE_URL } = require('../utility/links.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('support')
        .setDescription('Get an invite to the Crimstone support server.'),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('💬 Crimstone Support')
            .setDescription('Found a bug, got an idea, or stuck setting something up? Come and ask in the support server.');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel('Join the Support Server').setStyle(ButtonStyle.Link).setURL(SUPPORT_URL),
            new ButtonBuilder().setLabel('Website').setStyle(ButtonStyle.Link).setURL(WEBSITE_URL),
        );

        await interaction.reply({ embeds: [embed], components: [row] });
    },
};
