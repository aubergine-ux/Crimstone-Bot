const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { readWarnings, writeWarnings } = require('../utility/warnStore.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Sends a Server User a Warning')
        .addUserOption(option =>
            option.setName('target').setDescription('The User to be Warned.').setRequired(true))
        .addStringOption(option =>
            option.setName('reason').setDescription('The Reason for the Warning').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {

        const user = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason');
        const guildId = interaction.guild.id;

        const warnings = readWarnings();

        if (!warnings[guildId]) warnings[guildId] = {};
        if (!warnings[guildId][user.id]) warnings[guildId][user.id] = [];

        warnings[guildId][user.id].push({
            reason: reason,
            moderator: interaction.user.tag,
            timestamp: Date.now(),
        });

        writeWarnings(warnings);

        const warnCount = warnings[guildId][user.id].length;

        try {
            await user.send(`You have been Warned in **${interaction.guild.name}** for: ${reason}`);
            await interaction.reply({ content: `User **${user.tag}** has been Warned. They now have ${warnCount} Warning(s).` });
        } catch (error) {
            await interaction.reply({ content: `Could not DM **${user.tag}** (DMs turned off), but the Warning has been logged. They now have ${warnCount} Warning(s).` });
        }
    },
};