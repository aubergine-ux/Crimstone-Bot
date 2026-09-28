const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, InteractionContextType, MessageFlags } = require('discord.js');
const { readGiveaways, addGiveaway, updateGiveaway, giveawaysFor } = require('../utility/giveawayStore.js');
const { scheduleGiveaway, endGiveaway, rerollGiveaway, giveawayEmbed, giveawayRow } = require('../utility/giveawayScheduler.js');
const { parseDuration, formatDuration } = require('../utility/duration.js');
const { readLevels } = require('../utility/levelStore.js');
const { getLevelFromXp } = require('../utility/levelMath.js');

const MIN_DURATION = 60000;
const MAX_DURATION = 30 * 86400000;

const giveawayOption = (option) => {
    return option.setName('giveaway')
        .setDescription('The giveaway')
        .setRequired(true)
        .setAutocomplete(true);
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Run giveaways members enter with a button.')
        .setContexts(InteractionContextType.Guild)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand.setName('start')
                .setDescription('Start a giveaway')
                .addStringOption(option =>
                    option.setName('prize').setDescription('What the winner gets').setMaxLength(200).setRequired(true))
                .addStringOption(option =>
                    option.setName('duration').setDescription('How long it runs, e.g. 1h, 2d, 1d12h').setRequired(true))
                .addIntegerOption(option =>
                    option.setName('winners').setDescription('How many winners (default 1)').setMinValue(1).setMaxValue(20))
                .addChannelOption(option =>
                    option.setName('channel').setDescription('Where to post it (default here)')
                        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
                .addIntegerOption(option =>
                    option.setName('level').setDescription('Minimum level needed to enter').setMinValue(1)))
        .addSubcommand(subcommand =>
            subcommand.setName('end')
                .setDescription('End a giveaway early and pick the winners')
                .addStringOption(giveawayOption))
        .addSubcommand(subcommand =>
            subcommand.setName('reroll')
                .setDescription('Pick new winners for an ended giveaway')
                .addStringOption(giveawayOption)
                .addIntegerOption(option =>
                    option.setName('winners').setDescription('How many new winners (default 1)').setMinValue(1).setMaxValue(20)))
        .addSubcommand(subcommand =>
            subcommand.setName('cancel')
                .setDescription('Stop a giveaway without picking winners')
                .addStringOption(giveawayOption))
        .addSubcommand(subcommand =>
            subcommand.setName('list')
                .setDescription('See running giveaways')),

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused().toLowerCase();
        const wantEnded = interaction.options.getSubcommand() === 'reroll';

        const matches = giveawaysFor(interaction.guild.id)
            .filter(giveaway => giveaway.ended === wantEnded && !giveaway.cancelled)
            .filter(giveaway => !focused || giveaway.prize.toLowerCase().includes(focused))
            .slice(0, 25)
            .map(giveaway => ({
                name: `${giveaway.prize} — ${giveaway.ended ? 'ended' : `ends in ${formatDuration(giveaway.endsAt - Date.now())}`}`.slice(0, 100),
                value: giveaway.id,
            }));

        await interaction.respond(matches);
    },

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (subcommand === 'start') {
            const prize = interaction.options.getString('prize');
            const duration = parseDuration(interaction.options.getString('duration'));
            const winners = interaction.options.getInteger('winners') ?? 1;
            const channel = interaction.options.getChannel('channel') || interaction.channel;
            const minLevel = interaction.options.getInteger('level') ?? 0;

            if (!duration || duration < MIN_DURATION || duration > MAX_DURATION) {
                await interaction.reply({ content: '❌ Pick a duration between 1 minute and 30 days, like `30m`, `2h` or `1d12h`.', flags: MessageFlags.Ephemeral });
                return;
            }

            const giveaway = {
                id: null,
                guildId: guildId,
                channelId: channel.id,
                prize: prize,
                winners: winners,
                minLevel: minLevel,
                hostId: interaction.user.id,
                endsAt: Date.now() + duration,
                entrants: [],
                winnerIds: [],
                ended: false,
            };

            let message;

            try {
                message = await channel.send({ embeds: [giveawayEmbed(giveaway)], components: [giveawayRow(false)] });
            } catch {
                await interaction.reply({ content: `❌ I can't post in <#${channel.id}>.`, flags: MessageFlags.Ephemeral });
                return;
            }

            giveaway.id = message.id;

            addGiveaway(giveaway);
            scheduleGiveaway(giveaway);

            await interaction.reply({ content: `✅ Giveaway for **${prize}** started in <#${channel.id}>!`, flags: MessageFlags.Ephemeral });
            return;
        }

        if (subcommand === 'list') {
            const running = giveawaysFor(guildId).filter(giveaway => !giveaway.ended);

            if (running.length === 0) {
                await interaction.reply({ content: 'No giveaways are running. Start one with `/giveaway start`.' });
                return;
            }

            const lines = running.map(giveaway =>
                `🎉 **${giveaway.prize}** in <#${giveaway.channelId}> — ends <t:${Math.floor(giveaway.endsAt / 1000)}:R>, ${giveaway.entrants.length} entries`);

            await interaction.reply({ content: lines.join('\n').slice(0, 2000) });
            return;
        }

        const id = interaction.options.getString('giveaway');
        const giveaway = readGiveaways()[id];

        if (!giveaway || giveaway.guildId !== guildId) {
            await interaction.reply({ content: '❌ I couldn\'t find that giveaway.', flags: MessageFlags.Ephemeral });
            return;
        }

        if (subcommand === 'end' || subcommand === 'cancel') {
            if (giveaway.ended) {
                await interaction.reply({ content: '❌ That giveaway has already ended.', flags: MessageFlags.Ephemeral });
                return;
            }

            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            await endGiveaway(id, subcommand === 'cancel');

            await interaction.editReply({ content: subcommand === 'cancel' ? `✅ Cancelled the giveaway for **${giveaway.prize}**.` : `✅ Ended the giveaway for **${giveaway.prize}**.` });
            return;
        }

        if (subcommand === 'reroll') {
            if (!giveaway.ended || giveaway.cancelled) {
                await interaction.reply({ content: '❌ Only finished giveaways can be rerolled.', flags: MessageFlags.Ephemeral });
                return;
            }

            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            const winnerIds = await rerollGiveaway(id, interaction.options.getInteger('winners') ?? 1);

            if (!winnerIds || winnerIds.length === 0) {
                await interaction.editReply({ content: '❌ There\'s no one left to pick — every entrant has already won.' });
                return;
            }

            await interaction.editReply({ content: `✅ Rerolled **${giveaway.prize}**.` });
        }
    },

    async button(interaction) {
        const giveaway = readGiveaways()[interaction.message.id];

        if (!giveaway || giveaway.ended) {
            await interaction.reply({ content: 'This giveaway has ended.', flags: MessageFlags.Ephemeral });
            return;
        }

        const userId = interaction.user.id;
        const entrants = giveaway.entrants;
        const index = entrants.indexOf(userId);

        if (index !== -1) {
            entrants.splice(index, 1);
        } else {
            if (giveaway.minLevel > 0) {
                const xp = (readLevels()[giveaway.guildId] || {})[userId] || 0;
                const level = getLevelFromXp(xp).level;

                if (level < giveaway.minLevel) {
                    await interaction.reply({ content: `❌ You need to be level **${giveaway.minLevel}** to enter. You're level **${level}**.`, flags: MessageFlags.Ephemeral });
                    return;
                }
            }

            entrants.push(userId);
        }

        const updated = updateGiveaway(giveaway.id, { entrants: entrants });

        await interaction.update({ embeds: [giveawayEmbed(updated)] });
        await interaction.followUp({
            content: index !== -1 ? '👋 You left the giveaway.' : `🎉 You entered the giveaway for **${giveaway.prize}**! Click again to leave.`,
            flags: MessageFlags.Ephemeral,
        });
    },
};
