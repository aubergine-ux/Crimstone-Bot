const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { readWarnings } = require('../utility/warnStore.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warnings')
        .setDescription('View a User\'s warnings')
        .addUserOption(option =>
            option.setName('target').setDescription('The User to check').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {

        const user = interaction.options.getUser('target');
        const guildId = interaction.guild.id;

        const warnings = readWarnings();
        const userWarnings = warnings[guildId]?.[user.id] || [];

        if (userWarnings.length === 0) {
            await interaction.reply({ content: `**${user.tag}** has no warnings.` });
            return;
        }

        const fields = [];

        userWarnings.forEach((warn, index) => {
            fields.push({
                name: `Warning #${index + 1}`,
                value: `**Reason:** ${warn.reason}\n**Moderator:** ${warn.moderator}\n**Date:** <t:${Math.floor(warn.timestamp / 1000)}:R>`,
            });
        });

        const warnEmbed = new EmbedBuilder()
            .setColor(0xE74C3C)
            .setTitle(`⚠️ Warnings for ${user.tag}`)
            .addFields(fields)
            .setFooter({ text: `Total: ${userWarnings.length}` });

        await interaction.reply({ embeds: [warnEmbed] });
    },
};