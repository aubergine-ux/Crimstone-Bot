const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { resolvePrefs, savePrefs, clearPrefs } = require('../utility/rankPrefs.js');

const HEX_PATTERN = /^[0-9A-Fa-f]{6}$/;

const parseHex = (input) => {
    if (!input) return undefined;
    if (input.toLowerCase() === 'none') return null;

    const cleaned = input.replace('#', '').trim();

    if (!HEX_PATTERN.test(cleaned)) return false;

    return `#${cleaned.toUpperCase()}`;
};

const parseImage = (input) => {
    if (!input) return undefined;
    if (input.toLowerCase() === 'none') return null;

    if (!input.startsWith('https://')) return false;

    return input;
};

const parseTagline = (input) => {
    if (!input) return undefined;
    if (input.toLowerCase() === 'none') return null;

    return input.slice(0, 40);
};

const buildOptions = (subcommand) => {
    return subcommand
        .addStringOption(option =>
            option.setName('accent').setDescription('Accent / progress bar hex color (or "none")').setRequired(false))
        .addStringOption(option =>
            option.setName('background').setDescription('Background hex color (or "none")').setRequired(false))
        .addStringOption(option =>
            option.setName('image').setDescription('Background image URL, https only (or "none")').setRequired(false))
        .addStringOption(option =>
            option.setName('tagline').setDescription('Short line under your name, 40 chars (or "none")').setRequired(false));
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rankcard')
        .setDescription('Customize your rank card.')
        .addSubcommand(subcommand =>
            buildOptions(subcommand.setName('set').setDescription('Set your personal rank card style')))
        .addSubcommand(subcommand =>
            buildOptions(subcommand.setName('server').setDescription('Set the server-wide default style (admins only)')))
        .addSubcommand(subcommand =>
            subcommand.setName('reset').setDescription('Reset your rank card back to the server default'))
        .addSubcommand(subcommand =>
            subcommand.setName('view').setDescription('See your current rank card settings')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (subcommand === 'view') {
            const prefs = resolvePrefs(guildId, interaction.user.id);

            const embed = new EmbedBuilder()
                .setColor(parseInt(prefs.accent.replace('#', ''), 16))
                .setTitle('🎨 Your Rank Card Settings')
                .addFields(
                    { name: 'Accent', value: prefs.accent, inline: true },
                    { name: 'Background', value: prefs.background, inline: true },
                    { name: 'Tagline', value: prefs.tagline || 'None', inline: true },
                    { name: 'Image', value: prefs.image || 'None' },
                );

            await interaction.reply({ embeds: [embed] });
            return;
        }

        if (subcommand === 'reset') {
            clearPrefs(guildId, interaction.user.id);
            await interaction.reply({ content: '✅ Your rank card has been reset to the server default.' });
            return;
        }

        if (subcommand === 'server' && !interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
            await interaction.reply({ content: '❌ You need the Manage Server permission to change the server default.' });
            return;
        }

        const accent = parseHex(interaction.options.getString('accent'));
        const background = parseHex(interaction.options.getString('background'));
        const image = parseImage(interaction.options.getString('image'));
        const tagline = parseTagline(interaction.options.getString('tagline'));

        if (accent === false || background === false) {
            await interaction.reply({ content: '❌ Colors need to be 6-digit hex codes, like `6B21A8`. Use `none` to clear one.' });
            return;
        }

        if (image === false) {
            await interaction.reply({ content: '❌ The image needs to be a direct `https://` link to a PNG or JPG. Use `none` to clear it.' });
            return;
        }

        const updates = {};

        if (accent !== undefined) updates.accent = accent;
        if (background !== undefined) updates.background = background;
        if (image !== undefined) updates.image = image;
        if (tagline !== undefined) updates.tagline = tagline;

        if (Object.keys(updates).length === 0) {
            await interaction.reply({ content: 'Nothing to change — pass at least one option.' });
            return;
        }

        const key = subcommand === 'server' ? '_server' : interaction.user.id;

        savePrefs(guildId, key, updates);

        const scope = subcommand === 'server' ? 'the server default' : 'your rank card';

        await interaction.reply({ content: `✅ Updated ${scope}. Run \`/rank\` to see it.` });
    }
};
