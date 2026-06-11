const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('guide')
        .setDescription('Search discordjs.guide!')
        .addStringOption((option) =>
            option
                .setName('query')
                .setDescription('Phrase to search for')
                .setRequired(true)
        ),
    async execute(interaction) {
        const query = interaction.options.getString('query');
        await interaction.reply(`Search discord.js guide for: **${query}**\nhttps://discordjs.guide/?search=${encodeURIComponent(query)}`);
    },
};