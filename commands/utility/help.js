const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

const CATEGORIES = {
    moderation: '🛡️',
    leveling: '📈',
    music: '🎵',
    tools: '🔧',
    utility: '🧰',
    fun: '🎲',
    misc: '📦',
};

const ORDER = ['moderation', 'leveling', 'music', 'tools', 'utility', 'fun', 'misc'];

const HIDDEN = ['blankcommand'];

let folderCache = null;

function commandFolders() {
    if (folderCache) return folderCache;

    const map = {};
    const foldersPath = path.join(__dirname, '..');

    fs.readdirSync(foldersPath, { withFileTypes: true }).forEach(entry => {
        if (!entry.isDirectory()) return;

        const commandsPath = path.join(foldersPath, entry.name);

        fs.readdirSync(commandsPath)
            .filter(file => file.endsWith('.js'))
            .forEach(file => {
                try {
                    const command = require(path.join(commandsPath, file));

                    if ('data' in command && 'execute' in command) {
                        map[command.data.name] = entry.name;
                    }
                } catch (error) {
                    console.error(`Help couldn't read ${file}:`, error.message);
                }
            });
    });

    folderCache = map;
    return map;
}

function categoryName(folder) {
    return folder.charAt(0).toUpperCase() + folder.slice(1);
}

function chunkNames(names, limit) {
    const chunks = [];
    let current = [];
    let length = 0;

    names.forEach(name => {
        const piece = `\`${name}\``;

        if (length + piece.length + 1 > limit) {
            chunks.push(current);
            current = [];
            length = 0;
        }

        current.push(piece);
        length += piece.length + 1;
    });

    if (current.length > 0) chunks.push(current);

    return chunks;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('List every Command, or get Details on one.')
        .addStringOption(option =>
            option.setName('command')
                .setDescription('The Command you want Details on')
                .setRequired(false)
        ),
    async execute(interaction) {
        const commandName = interaction.options.getString('command');
        const folders = commandFolders();

        const visible = [...interaction.client.commands.values()]
            .filter(command => command.data && !HIDDEN.includes(command.data.name));

        if (commandName) {
            const cleaned = commandName.replace('/', '').trim().toLowerCase();
            const command = visible.find(item => item.data.name === cleaned);

            if (!command) {
                return await interaction.reply({
                    content: `There is no Command called \`${cleaned}\`. Use \`/help\` to see them all.`,
                    flags: MessageFlags.Ephemeral,
                });
            }

            const data = command.data.toJSON();
            const folder = folders[data.name] || 'misc';
            const emoji = CATEGORIES[folder] || '📁';
            const options = data.options || [];
            const hasSubcommands = options.some(option => option.type === 1);

            const permissions = data.default_member_permissions
                ? new PermissionsBitField(BigInt(data.default_member_permissions)).toArray().join(', ')
                : 'Everyone';

            const fields = [
                { name: 'Category', value: `${emoji} ${categoryName(folder)}`, inline: true },
                { name: 'Permissions', value: permissions, inline: true },
            ];

            if (options.length > 0) {
                const optionLines = options.map(option => {
                    const suffix = hasSubcommands || option.required ? '' : ' (optional)';
                    return `\`${option.name}\`${suffix} — ${option.description}`;
                });

                fields.push({
                    name: hasSubcommands ? 'Subcommands' : 'Options',
                    value: optionLines.join('\n').slice(0, 1024),
                });
            }

            const commandEmbed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle(`${emoji} /${data.name}`)
                .setDescription(data.description)
                .addFields(fields);

            return await interaction.reply({ embeds: [commandEmbed] });
        }

        const grouped = {};

        visible.forEach(command => {
            const folder = folders[command.data.name] || 'misc';

            if (!grouped[folder]) grouped[folder] = [];

            grouped[folder].push(command.data.name);
        });

        const sortedFolders = Object.keys(grouped).sort((a, b) => {
            const indexA = ORDER.indexOf(a);
            const indexB = ORDER.indexOf(b);
            return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
        });

        const fields = [];

        sortedFolders.forEach(folder => {
            const emoji = CATEGORIES[folder] || '📁';
            const names = grouped[folder].sort();

            chunkNames(names, 1000).forEach((chunk, index) => {
                fields.push({
                    name: index === 0 ? `${emoji} ${categoryName(folder)}` : '\u200b',
                    value: chunk.join(' '),
                });
            });
        });

        const helpEmbed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('📕 Crimstone Commands')
            .setDescription('Use `/help command:<name>` for Details on a Command.')
            .addFields(fields)
            .setFooter({ text: `${visible.length} Commands` });

        await interaction.reply({ embeds: [helpEmbed] });
    }
};