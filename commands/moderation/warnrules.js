const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, InteractionContextType } = require('discord.js');
const { getRules, setRule, removeRule, describeRule } = require('../utility/warnEscalation.js');
const { getConfig, setConfig } = require('../utility/guildConfig.js');
const { parseDuration, formatDuration } = require('../utility/duration.js');

const MAX_TIMEOUT = 2419200000;
const MAX_RULES = 10;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warnrules')
        .setDescription('Automatically punish members when they reach a number of warnings.')
        .setContexts(InteractionContextType.Guild)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand.setName('add')
                .setDescription('Punish members when they reach a number of warnings')
                .addIntegerOption(option =>
                    option.setName('warnings').setDescription('How many active warnings trigger this').setRequired(true).setMinValue(1).setMaxValue(50))
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('What happens to the member')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Timeout', value: 'timeout' },
                            { name: 'Kick', value: 'kick' },
                            { name: 'Ban', value: 'ban' },
                        ))
                .addStringOption(option =>
                    option.setName('duration').setDescription('Timeout length, like 30m, 2h or 1d (timeouts only)').setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand.setName('remove')
                .setDescription('Stop punishing members at a number of warnings')
                .addIntegerOption(option =>
                    option.setName('warnings').setDescription('The warning count to clear').setRequired(true).setMinValue(1).setMaxValue(50)))
        .addSubcommand(subcommand =>
            subcommand.setName('list')
                .setDescription('See every warning rule'))
        .addSubcommand(subcommand =>
            subcommand.setName('expiry')
                .setDescription('Let warnings expire after a number of days')
                .addIntegerOption(option =>
                    option.setName('days').setDescription('Days until a warning stops counting (0 = never)').setRequired(true).setMinValue(0).setMaxValue(365))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (subcommand === 'add') {
            const count = interaction.options.getInteger('warnings');
            const action = interaction.options.getString('action');
            const durationInput = interaction.options.getString('duration');

            const rules = getRules(guildId);

            if (rules.length >= MAX_RULES && !rules.some(rule => rule.count === count)) {
                await interaction.reply({ content: `❌ You can have up to ${MAX_RULES} warning rules. Remove one first.` });
                return;
            }

            const rule = { count: count, action: action };

            if (action === 'timeout') {
                const duration = parseDuration(durationInput);

                if (!duration) {
                    await interaction.reply({ content: '❌ Give a timeout length, like `30m`, `2h` or `1d`.' });
                    return;
                }

                if (duration > MAX_TIMEOUT) {
                    await interaction.reply({ content: '❌ Timeouts can be at most 28 days.' });
                    return;
                }

                rule.duration = duration;
            }

            setRule(guildId, rule);

            await interaction.reply({ content: `✅ At **${count}** warning${count === 1 ? '' : 's'}: ${describeRule(rule)}.` });
            return;
        }

        if (subcommand === 'remove') {
            const count = interaction.options.getInteger('warnings');

            if (!removeRule(guildId, count)) {
                await interaction.reply({ content: `There's no rule set for **${count}** warning${count === 1 ? '' : 's'}.` });
                return;
            }

            await interaction.reply({ content: `✅ Removed the rule for **${count}** warning${count === 1 ? '' : 's'}.` });
            return;
        }

        if (subcommand === 'list') {
            const rules = getRules(guildId);
            const expiryDays = getConfig(guildId).warnExpiryDays;

            const lines = rules.map(rule => `**${rule.count}** warning${rule.count === 1 ? '' : 's'} — ${describeRule(rule)}`);

            const embed = new EmbedBuilder()
                .setColor(0xF1C40F)
                .setTitle('⚠️ Warning Rules')
                .setDescription(lines.length > 0 ? lines.join('\n') : 'No rules yet. Add one with `/warnrules add`.')
                .setFooter({ text: expiryDays > 0 ? `Warnings expire after ${expiryDays} day${expiryDays === 1 ? '' : 's'}` : 'Warnings never expire' });

            await interaction.reply({ embeds: [embed] });
            return;
        }

        if (subcommand === 'expiry') {
            const days = interaction.options.getInteger('days');

            setConfig(guildId, { warnExpiryDays: days });

            if (days === 0) {
                await interaction.reply({ content: '✅ Warnings will count forever, until removed with `/unwarn`.' });
            } else {
                await interaction.reply({ content: `✅ Warnings will stop counting after **${formatDuration(days * 86400000)}**. They stay in \`/modstats\` history.` });
            }
        }
    }
};
