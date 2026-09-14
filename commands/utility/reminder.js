const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { parseDuration, formatDuration } = require('../utility/duration.js');
const { addReminder, removeReminder, remindersFor } = require('../utility/reminderStore.js');
const { scheduleReminder, cancelTimer } = require('../utility/reminderScheduler.js');

const PER_USER_LIMIT = 25;
const MAX_AHEAD = 365 * 86400000;

const makeId = () => Math.random().toString(36).slice(2, 8);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reminder')
        .setDescription('Have Crimstone nudge you later.')
        .addSubcommand(subcommand =>
            subcommand.setName('set')
                .setDescription('Set a new reminder')
                .addStringOption(option =>
                    option.setName('when')
                        .setDescription('How long from now, like 10m, 2h30m or 1d')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('text')
                        .setDescription('What to remind you about')
                        .setRequired(true)
                        .setMaxLength(1000)))
        .addSubcommand(subcommand =>
            subcommand.setName('list').setDescription('See the reminders you have waiting'))
        .addSubcommand(subcommand =>
            subcommand.setName('cancel')
                .setDescription('Cancel one of your reminders')
                .addStringOption(option =>
                    option.setName('id')
                        .setDescription('The reminder ID from /reminder list')
                        .setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'set') {
            const when = interaction.options.getString('when');
            const text = interaction.options.getString('text');

            const delay = parseDuration(when);

            if (!delay) {
                await interaction.reply({
                    content: '❌ I could not read that length of time. Try something like `10m`, `2h30m` or `1d`.',
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            if (delay > MAX_AHEAD) {
                await interaction.reply({ content: '❌ That is too far ahead — a year is my limit.' });
                return;
            }

            if (remindersFor(interaction.user.id).length >= PER_USER_LIMIT) {
                await interaction.reply({
                    content: `❌ You already have ${PER_USER_LIMIT} reminders waiting. Cancel one first.`,
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            const reminder = {
                id: makeId(),
                userId: interaction.user.id,
                channelId: interaction.channel.id,
                guildId: interaction.guild ? interaction.guild.id : null,
                text: text,
                dueAt: Date.now() + delay,
                createdAt: Date.now(),
            };

            addReminder(reminder);
            scheduleReminder(reminder);

            const dueStamp = Math.floor(reminder.dueAt / 1000);

            await interaction.reply({
                content: `✅ I will remind you <t:${dueStamp}:R> (in ${formatDuration(delay)}). ID \`${reminder.id}\`.`,
            });
            return;
        }

        if (subcommand === 'list') {
            const reminders = remindersFor(interaction.user.id);

            if (reminders.length === 0) {
                await interaction.reply({ content: 'You have no reminders waiting.' });
                return;
            }

            const lines = reminders.map(reminder => {
                const dueStamp = Math.floor(reminder.dueAt / 1000);
                return `\`${reminder.id}\` — <t:${dueStamp}:R> — ${reminder.text.slice(0, 80)}`;
            });

            const listEmbed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('⏰ Your reminders')
                .setDescription(lines.join('\n').slice(0, 4000))
                .setFooter({ text: `${reminders.length} waiting · cancel with /reminder cancel` });

            await interaction.reply({ embeds: [listEmbed] });
            return;
        }

        if (subcommand === 'cancel') {
            const id = interaction.options.getString('id').trim();
            const mine = remindersFor(interaction.user.id).some(reminder => reminder.id === id);

            if (!mine) {
                await interaction.reply({
                    content: `❌ You have no reminder with the ID \`${id}\`.`,
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            cancelTimer(id);
            removeReminder(id);

            await interaction.reply({ content: `✅ Cancelled reminder \`${id}\`.` });
        }
    }
};
