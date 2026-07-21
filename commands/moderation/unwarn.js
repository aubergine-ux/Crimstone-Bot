const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { readWarnings, writeWarnings } = require('../utility/warnStore.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unwarn')
        .setDescription('Remove a specific Warning from a user')
        .addUserOption(option =>
            option.setName('target').setDescription('The User to remove a Warning from').setRequired(true))
        .addIntegerOption(option =>
            option.setName('number').setDescription('The Warning number to remove (see /warnings)').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {

        const user = interaction.options.getUser('target');
        const number = interaction.options.getInteger('number');
        const guildId = interaction.guild.id;

        const warnings = readWarnings();
        const userWarnings = warnings[guildId]?.[user.id] || [];

        if (userWarnings.length === 0) {
            await interaction.reply({ content: `**${user.tag}** has no Warnings to remove.` });
            return;
        }

        if (number < 1 || number > userWarnings.length) {
            await interaction.reply({ content: `Invalid Warning number. **${user.tag}** has ${userWarnings.length} warning(s).` });
            return;
        }

        const removed = userWarnings.splice(number - 1, 1);

        writeWarnings(warnings);

        const reason = removed[0].reason;

        await interaction.reply({ content: `Removed Warning #${number} from **${user.tag}** (Reason: ${reason}). They now have ${userWarnings.length} warning(s).` });
    },
};