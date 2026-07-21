const { SlashCommandBuilder } = require('discord.js');
const { readAfk, writeAfk } = require('../utility/afkStore.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('afk')
        .setDescription('Set yourself as AFK.')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Optional AFK message')
                .setRequired(false)
        ),
    async execute(interaction) {
        const message = interaction.options.getString('message') || 'AFK';

        const afk = readAfk();

        afk[interaction.user.id] = {
            message: message,
            timestamp: Date.now(),
        };

        writeAfk(afk);

        await interaction.reply({ content: `✅ You're now AFK: ${message}` });
    }
};