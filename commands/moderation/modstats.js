const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, InteractionContextType } = require('discord.js');
const { getUserCases, ACTIONS } = require('../utility/modLog.js');
const { readWarnings } = require('../utility/warnStore.js');

const RECENT_LIMIT = 8;

const describeCase = (entry) => {
    const style = ACTIONS[entry.action] || { emoji: '📋', label: entry.action };
    const when = `<t:${Math.floor(entry.timestamp / 1000)}:R>`;
    const reason = entry.reason ? ` — ${entry.reason}` : '';

    return `\`#${entry.case}\` ${style.emoji} **${style.label}** ${when}${reason}`.slice(0, 200);
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('modstats')
        .setDescription('See a member\'s moderation history in this server.')
        .setContexts(InteractionContextType.Guild)
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The member to look up')
                .setRequired(true)
        ),
    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const guildId = interaction.guild.id;

        const cases = getUserCases(guildId, user.id);

        const warnings = readWarnings();
        const activeWarnings = (warnings[guildId] || {})[user.id] || [];

        const counts = {};

        cases.forEach(entry => {
            counts[entry.action] = (counts[entry.action] || 0) + 1;
        });

        const breakdown = Object.keys(counts)
            .sort((a, b) => counts[b] - counts[a])
            .map(action => {
                const style = ACTIONS[action] || { emoji: '📋', label: action };
                return `${style.emoji} ${style.label}: **${counts[action]}**`;
            });

        const recent = cases
            .slice(-RECENT_LIMIT)
            .reverse()
            .map(describeCase);

        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        const embed = new EmbedBuilder()
            .setColor(cases.length === 0 ? 0x2ECC71 : 0xE67E22)
            .setTitle(`📋 Moderation history — ${user.username}`)
            .setThumbnail(user.displayAvatarURL())
            .addFields(
                { name: 'Total cases', value: String(cases.length), inline: true },
                { name: 'Active warnings', value: String(activeWarnings.length), inline: true },
                { name: 'Still in server', value: member ? 'Yes' : 'No', inline: true },
            )
            .setFooter({ text: `User ID: ${user.id}` });

        if (breakdown.length > 0) {
            embed.addFields({ name: 'By action', value: breakdown.join('\n') });
        }

        if (recent.length > 0) {
            embed.addFields({ name: `Recent cases (${recent.length} of ${cases.length})`, value: recent.join('\n').slice(0, 1024) });
        }

        if (cases.length === 0 && activeWarnings.length === 0) {
            embed.setDescription('This member has a clean record.');
        }

        await interaction.reply({ embeds: [embed] });
    }
};
