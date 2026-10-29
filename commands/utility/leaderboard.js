const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, MessageFlags, InteractionContextType } = require('discord.js');
const { getXp, guildRanking, globalRanking } = require('../utility/levelStore.js');
const { getConfig, optedOutGuilds } = require('../utility/guildConfig.js');
const { getLevelFromXp } = require('../utility/levelMath.js');
const { buildLeaderboardCard } = require('../utility/rankCanvas.js');

const PAGE_SIZE = 10;
const MAX_ENTRIES = 250;
const PAGING_TIME = 120000;

const SERVER_SCOPES = ['server', 'week', 'month'];

const loadMembers = async (guild) => {
    if (guild.members.cache.size >= guild.memberCount) return;

    await guild.members.fetch().catch(error => {
        console.error('Failed to fetch members for the leaderboard:', error.message);
    });
};

const resolveUser = async (interaction, scope, userId) => {
    let user;

    if (SERVER_SCOPES.includes(scope)) {
        const member = interaction.guild.members.cache.get(userId);
        user = member ? member.user : null;
    } else {
        user = await interaction.client.users.fetch(userId).catch(() => null);
    }

    if (!user) return { username: 'Unknown User', avatarUrl: null };

    return { username: user.username, avatarUrl: user.displayAvatarURL({ extension: 'png', size: 64 }) };
};

const collectEntries = async (interaction, scope) => {
    if (SERVER_SCOPES.includes(scope)) {
        const period = scope === 'server' ? 'all' : scope;
        const ranked = guildRanking(interaction.guild.id, period);

        await loadMembers(interaction.guild);

        // People who left keep their XP, but they don't belong on this server's board.
        const present = ranked.filter(entry => interaction.guild.members.cache.has(entry[0]));

        return { entries: present.slice(0, MAX_ENTRIES), guilds: 1 };
    }

    const mode = scope === 'best' ? 'best' : 'combined';
    const { entries, guilds } = globalRanking(mode, optedOutGuilds(), MAX_ENTRIES);

    return { entries: entries, guilds: guilds };
};

const describeScope = (interaction, scope, guilds) => {
    const servers = `${guilds} server${guilds === 1 ? '' : 's'}`;

    if (scope === 'week') {
        return { emoji: '📅', heading: `${interaction.guild.name} — This Week`, color: 0x3498DB, note: 'Resets every Monday (UTC)' };
    }

    if (scope === 'month') {
        return { emoji: '🗓️', heading: `${interaction.guild.name} — This Month`, color: 0x9B59B6, note: 'Resets on the 1st (UTC)' };
    }

    if (scope === 'best') {
        return { emoji: '🌍', heading: 'Global Leaderboard — Best Server', color: 0xE67E22, note: `Each member's strongest server, across ${servers}` };
    }

    if (scope === 'global') {
        return { emoji: '🌍', heading: 'Global Leaderboard — Combined XP', color: 0xE67E22, note: `XP combined across ${servers}` };
    }

    return { emoji: '🏆', heading: `${interaction.guild.name} Leaderboard`, color: 0xF1C40F, note: null };
};

const buildPage = async (interaction, scope, sorted, page, guilds) => {
    const start = page * PAGE_SIZE;
    const slice = sorted.slice(start, start + PAGE_SIZE);
    const pages = Math.ceil(sorted.length / PAGE_SIZE);
    const rows = [];

    for (let index = 0; index < slice.length; index++) {
        const userId = slice[index][0];
        const xp = slice[index][1];
        const { username, avatarUrl } = await resolveUser(interaction, scope, userId);

        // Weekly and monthly XP isn't a total, so the level shown is always the member's real one.
        const totalXp = scope === 'week' || scope === 'month' ? getXp(interaction.guild.id, userId) : xp;

        rows.push({
            position: start + index + 1,
            username: username,
            avatarUrl: avatarUrl,
            xp: xp,
            level: getLevelFromXp(totalXp).level,
        });
    }

    const { emoji, heading, color, note } = describeScope(interaction, scope, guilds);
    const footer = [`Page ${page + 1} of ${pages}`, note].filter(part => part).join(' · ');

    try {
        const buffer = await buildLeaderboardCard({
            title: heading,
            subtitle: footer,
            accent: `#${color.toString(16).padStart(6, '0')}`,
            entries: rows,
        });

        return { content: '', embeds: [], files: [new AttachmentBuilder(buffer, { name: 'leaderboard.png' })], attachments: [] };
    } catch (error) {
        console.error('Failed to build leaderboard card:', error);
    }

    const lines = rows.map(row => `**${row.position}.** ${row.username} — Level ${row.level} (${row.xp} XP)`);

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`${emoji} ${heading}`)
        .setDescription(lines.join('\n'))
        .setFooter({ text: footer });

    return { content: '', embeds: [embed], files: [], attachments: [] };
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
                    { name: 'This server — this week', value: 'week' },
                    { name: 'This server — this month', value: 'month' },
                    { name: 'Global — combined XP', value: 'global' },
                    { name: 'Global — best server', value: 'best' },
                )
        ),
    async execute(interaction) {
        const scope = interaction.options.getString('scope') || 'server';

        if (!SERVER_SCOPES.includes(scope) && !getConfig(interaction.guild.id).globalLeaderboard) {
            await interaction.reply({ content: '❌ This server has opted out of the global leaderboard.' });
            return;
        }

        await interaction.deferReply();

        const { entries, guilds } = await collectEntries(interaction, scope);

        if (entries.length === 0) {
            const empty = scope === 'week' || scope === 'month'
                ? `No one has earned any XP this ${scope} yet.`
                : 'No one has earned any XP yet.';

            await interaction.editReply({ content: empty });
            return;
        }

        const pages = Math.ceil(entries.length / PAGE_SIZE);

        let page = 0;

        const first = await buildPage(interaction, scope, entries, page, guilds);
        const message = await interaction.editReply({
            ...first,
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

            const next = await buildPage(interaction, scope, entries, page, guilds);

            await interaction.editReply({
                ...next,
                components: [buildButtons(page, pages, false)],
            });
        });

        collector.on('end', () => {
            interaction.editReply({ components: [buildButtons(page, pages, true)] }).catch(() => null);
        });
    }
};
