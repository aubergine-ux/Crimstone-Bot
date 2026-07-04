const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('role-search')
        .setDescription('List all Members in a specific Role.')
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Role you want to search for')
                .setRequired(true)
        ),
}