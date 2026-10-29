const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, InteractionContextType } = require('discord.js');
const { getCase, setCaseReason, ACTIONS } = require('../utility/modLog.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('case')
        .setDescription('Look up or edit a moderation case.')
        .setContexts(InteractionContextType.Guild)
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addSubcommand(subcommand =>
            subcommand.setName('view')
                .setDescription('See the details of a case')
                .addIntegerOption(option =>
                    option.setName('number').setDescription('The case number').setRequired(true).setMinValue(1)))
        .addSubcommand(subcommand =>
            subcommand.setName('reason')
                .setDescription('Change the reason on a case')
                .addIntegerOption(option =>
                    option.setName('number').setDescription('The case number').setRequired(true).setMinValue(1))
                .addStringOption(option =>
                    option.setName('reason').setDescription('The new reason').setRequired(true).setMaxLength(500))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const number = interaction.options.getInteger('number');
        const guildId = interaction.guild.id;

        const entry = getCase(guildId, number);

        if (!entry) {
            await interaction.reply({ content: `There's no case **#${number}** in this server.` });
            return;
        }

        if (subcommand === 'reason') {
            const reason = interaction.options.getString('reason');

            setCaseReason(guildId, number, reason);

            await interaction.reply({ content: `✅ Updated the reason on case **#${number}**.\n**Before:** ${entry.reason || 'No reason given'}\n**Now:** ${reason}` });
            return;
        }

        const style = ACTIONS[entry.action] || { emoji: '📋', label: entry.action, color: 0x5865F2 };

        const fields = [
            { name: 'User', value: entry.userId ? `${entry.userTag || 'Unknown'} (<@${entry.userId}>)` : 'None', inline: true },
            { name: 'Moderator', value: entry.moderator || 'Unknown', inline: true },
            { name: 'Date', value: `<t:${Math.floor(entry.timestamp / 1000)}:f>`, inline: true },
        ];

        if (entry.duration) {
            fields.push({ name: 'Duration', value: entry.duration, inline: true });
        }

        if (entry.action === 'warn') {
            fields.push({ name: 'Status', value: entry.active ? 'Active' : 'Removed', inline: true });
        }

        fields.push({ name: 'Reason', value: entry.reason || 'No reason given' });

        const embed = new EmbedBuilder()
            .setColor(style.color)
            .setTitle(`${style.emoji} ${style.label} — Case #${entry.case}`)
            .addFields(fields)
            .setFooter({ text: entry.userId ? `User ID: ${entry.userId}` : interaction.guild.name });

        await interaction.reply({ embeds: [embed] });
    }
};
