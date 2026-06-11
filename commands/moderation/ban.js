const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a User'),

    async execute(interaction) {
        await interaction.reply('MEOW MEOW MEOW MEOW MEOW MEOW MEOW MEOW');
    },
};