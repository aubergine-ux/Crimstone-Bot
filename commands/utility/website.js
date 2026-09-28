const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { WEBSITE_URL, INVITE_URL } = require('../utility/links.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('website')
        .setDescription('Visit the Crimstone website.'),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🌐 Crimstone Website')
            .setDescription(`Features, guides and more at **${WEBSITE_URL.replace('https://', '').replace(/\/$/, '')}**.`);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel('Open Website').setStyle(ButtonStyle.Link).setURL(WEBSITE_URL),
            new ButtonBuilder().setLabel('Add Crimstone').setStyle(ButtonStyle.Link).setURL(INVITE_URL),
        );

        await interaction.reply({ embeds: [embed], components: [row] });
    },
};
