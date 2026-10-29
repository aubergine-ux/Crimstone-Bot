const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, InteractionContextType } = require('discord.js');
const { importXp } = require('../utility/levelStore.js');

const PAGE_LIMIT = 1000;
const MAX_PAGES = 50;
const MAX_FILE_SIZE = 5000000;

const fetchMee6 = async (guildId) => {
    const players = [];

    for (let page = 0; page < MAX_PAGES; page++) {
        const response = await fetch(`https://mee6.xyz/api/plugins/levels/leaderboard/${guildId}?page=${page}&limit=${PAGE_LIMIT}`);

        if (response.status === 404) return { error: 'MEE6 has no levels for this server. Make sure MEE6 is in the server and its Levels plugin is on.' };
        if (response.status === 401 || response.status === 403) return { error: 'The MEE6 leaderboard is private. Make it public in the MEE6 dashboard (Levels → Leaderboard), then try again.' };
        if (response.status === 429) return { error: 'MEE6 is rate-limiting me right now. Please try again in a few minutes.' };
        if (!response.ok) throw new Error(`MEE6 responded with ${response.status}`);

        const data = await response.json();

        if (!Array.isArray(data.players)) throw new Error('MEE6 response had no players list');

        players.push(...data.players);

        if (data.players.length < PAGE_LIMIT) break;
    }

    return { players: players };
};

// Reads a file from /exportxp, a list of { userId, xp }, or a plain { userId: xp } object.
const readFile = async (attachment) => {
    if (attachment.size > MAX_FILE_SIZE) return { error: 'That file is too big. Exports are well under 5 MB.' };

    const response = await fetch(attachment.url);

    if (!response.ok) throw new Error(`Attachment download responded with ${response.status}`);

    let data;

    try {
        data = JSON.parse(await response.text());
    } catch (error) {
        return { error: 'That file isn\'t valid JSON. Use a file made by `/exportxp`.' };
    }

    let list = null;

    if (Array.isArray(data)) list = data;
    else if (data && Array.isArray(data.members)) list = data.members;

    if (list) {
        return { players: list.map(entry => ({ id: entry && (entry.userId || entry.id), xp: entry && entry.xp })) };
    }

    if (data && typeof data === 'object') {
        return { players: Object.keys(data).map(userId => ({ id: userId, xp: data[userId] })) };
    }

    return { error: 'I couldn\'t find any XP in that file. Use a file made by `/exportxp`.' };
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('importxp')
        .setDescription('Import XP from the MEE6 leaderboard or an /exportxp file.')
        .setContexts(InteractionContextType.Guild)
        .addStringOption(option =>
            option.setName('mode')
                .setDescription('What to do when a member already has XP here')
                .setRequired(false)
                .addChoices(
                    { name: 'Keep whichever is higher', value: 'higher' },
                    { name: 'Replace with imported XP', value: 'replace' },
                    { name: 'Add imported XP on top', value: 'add' },
                ))
        .addAttachmentOption(option =>
            option.setName('file').setDescription('An /exportxp file to import instead of MEE6').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const mode = interaction.options.getString('mode') || 'higher';
        const file = interaction.options.getAttachment('file');
        const guildId = interaction.guild.id;
        const source = file ? 'File' : 'MEE6';

        await interaction.deferReply();

        let result;

        try {
            result = file ? await readFile(file) : await fetchMee6(guildId);
        } catch (error) {
            console.error(`Failed to import ${source} XP:`, error);
            await interaction.editReply({ content: file ? '❌ I couldn\'t download that file. Please try again!' : '❌ I couldn\'t read the MEE6 leaderboard. Please try again later!' });
            return;
        }

        if (result.error) {
            await interaction.editReply({ content: `❌ ${result.error}` });
            return;
        }

        const players = result.players;

        if (players.length === 0) {
            await interaction.editReply({ content: file ? 'That file has no members in it, so there\'s nothing to import.' : 'The MEE6 leaderboard for this server is empty, so there\'s nothing to import.' });
            return;
        }

        const entries = [];

        let skipped = 0;

        players.forEach(player => {
            const xp = Math.floor(Number(player.xp));

            if (!/^\d{17,20}$/.test(String(player.id)) || !Number.isFinite(xp) || xp <= 0) {
                skipped++;
                return;
            }

            entries.push({ userId: String(player.id), xp: xp });
        });

        importXp(guildId, entries, mode);

        const imported = entries.length;

        const modeNames = { higher: 'Kept whichever was higher', replace: 'Replaced with imported XP', add: 'Added imported XP on top' };
        const curveNote = file ? '' : '\nMEE6 uses the same level curve, so everyone keeps their level.';

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(`📥 ${source} Import Complete`)
            .setDescription(`Imported XP for **${imported}** member${imported === 1 ? '' : 's'}.${curveNote}\nRun \`/levelsync\` to hand out level reward roles.`)
            .setFooter({ text: skipped > 0 ? `${modeNames[mode]} · ${skipped} entries skipped` : modeNames[mode] });

        await interaction.editReply({ embeds: [embed] });
    }
};
