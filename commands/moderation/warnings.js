const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, InteractionContextType } = require('discord.js');
const { getWarnings } = require('../utility/warnStore.js');

const MAX_FIELDS = 25;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warnings')
        .setDescription('View a User\'s Warnings')
        .setContexts(InteractionContextType.Guild)
        .addUserOption(option =>
            option.setName('target').setDescription('The User to Check').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {

        const user = interaction.options.getUser('target');
        const guildId = interaction.guild.id;

        const userWarnings = getWarnings(guildId, user.id);

        if (userWarnings.length === 0) {
            await interaction.reply({ content: `**${user.tag}** has no Warnings.` });
            return;
        }

        const fields = [];

        userWarnings.slice(0, MAX_FIELDS).forEach((warn, index) => {
            fields.push({
                name: `Warning #${index + 1} · Case #${warn.case}`,
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