const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, InteractionContextType } = require('discord.js');
const { readLevels, readGlobalTotals, readGlobalBest } = require('../utility/levelStore.js');
const { getConfig, optedOutGuilds } = require('../utility/guildConfig.js');
const { getLevelFromXp } = require('../utility/levelMath.js');

const PAGE_SIZE = 10;
const MAX_ENTRIES = 250;
const PAGING_TIME = 120000;

const resolveName = async (interaction, scope, userId) => {
    if (scope === 'server') {
        const member = await interaction.guild.members.fetch(userId).catch(() => null);
        return member ? member.user.username : 'Unknown User';
    }

    const user = await interaction.client.users.fetch(userId).catch(() => null);
    return user ? user.username : 'Unknown User';
};

const collectEntries = (interaction, scope) => {
    if (scope === 'server') {
        const levels = readLevels();
        return { entries: levels[interaction.guild.id] || {}, guilds: 1 };
    }

    const excluded = optedOutGuilds();
    const { totals, guilds } = scope === 'best' ? readGlobalBest(excluded) : readGlobalTotals(excluded);

    return { entries: totals, guilds: guilds };
};

const describeScope = (interaction, scope, guilds) => {
    if (scope === 'server') {
        return { title: `🏆 ${interaction.guild.name} Leaderboard`, color: 0xF1C40F, note: null };
    }

    if (scope === 'best') {
        return {
            title: '🌍 Global Leaderboard — Best Server',
            color: 0xE67E22,
            note: `Each member's strongest server, across ${guilds} server${guilds === 1 ? '' : 's'}`,
        };
    }

    return {
        title: '🌍 Global Leaderboard — Combined XP',
        color: 0xE67E22,
        note: `XP combined across ${guilds} server${guilds === 1 ? '' : 's'}`,
    };
};

const buildPage = async (interaction, scope, sorted, page, guilds) => {
    const start = page * PAGE_SIZE;
    const slice = sorted.slice(start, start + PAGE_SIZE);
    const pages = Math.ceil(sorted.length / PAGE_SIZE);
    const lines = [];

    for (let index = 0; index < slice.length; index++) {
        const userId = slice[index][0];
        const totalXp = slice[index][1];
        const { level } = getLevelFromXp(totalXp);

        const name = await resolveName(interaction, scope, userId);

        lines.push(`**${start + index + 1}.** ${name} — Level ${level} (${totalXp} XP)`);
    }

    const { title, color, note } = describeScope(interaction, scope, guilds);
    const footer = [`Page ${page + 1} of ${pages}`, note].filter(part => part).join(' · ');

    return new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(lines.join('\n'))
        .setFooter({ text: footer });
};

const buildButtons = (page, pages, finished) => {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('leaderboard-previous')
            .setLabel('◀ Back')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(finished || page === 0),
        new ButtonBuilder()
            .setCustomId('leaderboard-next')
            .setLabel('Next ▶')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(finished || page >= pages - 1),
    );
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View the top members by XP.')
        .setContexts(InteractionContextType.Guild)
        .addStringOption(option =>
            option.setName('scope')
                .setDescription('Rank this server alone or every server Crimstone is in')
                .setRequired(false)
                .addChoices(
                    { name: 'This server', value: 'server' },
                    { name: 'Global — combined XP', value: 'global' },
                    { name: 'Global — best server', value: 'best' },
                )
        ),
    async execute(interaction) {
        const scope = interaction.options.getString('scope') || 'server';

        if (scope !== 'server' && !getConfig(interaction.guild.id).globalLeaderboard) {
            await interaction.reply({ content: '❌ This server has opted out of the global leaderboard.' });
            return;
        }

        const { entries, guilds } = collectEntries(interaction, scope);

        const sorted = Object.entries(entries)
            .sort((a, b) => b[1] - a[1])
            .slice(0, MAX_ENTRIES);

        if (sorted.length === 0) {
            await interaction.reply({ content: 'No one has earned any XP yet.' });
            return;
        }

        await interaction.deferReply();

        const pages = Math.ceil(sorted.length / PAGE_SIZE);

        let page = 0;

        const embed = await buildPage(interaction, scope, sorted, page, guilds);
        const message = await interaction.editReply({
            embeds: [embed],
            components: pages > 1 ? [buildButtons(page, pages, false)] : [],
        });

        if (pages <= 1) return;

        const collector = message.createMessageComponentCollector({ time: PAGING_TIME });

        collector.on('collect', async (button) => {
            if (button.user.id !== interaction.user.id) {
                await button.reply({
                    content: 'Run `/leaderboard` yourself to page through it.',
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            await button.deferUpdate();

            page += button.customId === 'leaderboard-next' ? 1 : -1;
            page = Math.min(Math.max(page, 0), pages - 1);

            const nextEmbed = await buildPage(interaction, scope, sorted, page, guilds);

            await interaction.editReply({
                embeds: [nextEmbed],
                components: [buildButtons(page, pages, false)],
            });
        });

        collector.on('end', () => {
            interaction.editReply({ components: [buildButtons(page, pages, true)] }).catch(() => null);
        });
    }
};
