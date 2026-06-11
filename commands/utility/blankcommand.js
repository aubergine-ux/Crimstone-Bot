const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('testcommand')
        .setDescription('testing this'),

    async execute(interaction) {
        await interaction.reply('MEOW MEOW MEOW MEOW MEOW MEOW MEOW MEOW');
    },
};