const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

const CATEGORIES = {
    fun: '🎲',
    misc: '📦',
    moderation: '🛡️',
    tools: '🔧',
    utility: '🧰',
};

const HIDDEN = ['command_name'];

function loadCommands() {
    const entries = [];
    const foldersPath = path.join(__dirname, '..');
    const commandFolders = fs.readdirSync(foldersPath);

    for (const folder of commandFolders) {
        const commandsPath = path.join(foldersPath, folder);
        const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));

        for (const file of commandFiles) {
            const command = require(path.join(commandsPath, file));

            if ('data' in command && 'execute' in command && !HIDDEN.includes(command.data.name)) {
                entries.push({ folder: folder, data: command.data.toJSON() });
            }
        }
    }

    return entries;
}

function categoryName(folder) {
    return folder.charAt(0).toUpperCase() + folder.slice(1);
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
        const entries = loadCommands();

        if (commandName) {
            const entry = entries.find(item => item.data.name === commandName.toLowerCase());

            if (!entry) {
                return await interaction.reply({
                    content: `There is no Command called \`${commandName}\`. Use \`/help\` to see them all.`,
                    flags: MessageFlags.Ephemeral,
                });
            }

            const emoji = CATEGORIES[entry.folder] || '📁';
            const options = entry.data.options || [];
            const hasSubcommands = options.some(option => option.type === 1);

            const permissions = entry.data.default_member_permissions
                ? new PermissionsBitField(BigInt(entry.data.default_member_permissions)).toArray().join(', ')
                : 'Everyone';

            const fields = [
                { name: 'Category', value: `${emoji} ${categoryName(entry.folder)}`, inline: true },
                { name: 'Permissions', value: permissions, inline: true },
            ];

            if (options.length > 0) {
                const optionLines = [];

                options.forEach(option => {
                    const suffix = hasSubcommands || option.required ? '' : ' (optional)';
                    optionLines.push(`\`${option.name}\`${suffix} — ${option.description}`);
                });

                fields.push({
                    name: hasSubcommands ? 'Subcommands' : 'Options',
                    value: optionLines.join('\n'),
                });
            }

            const commandEmbed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle(`${emoji} /${entry.data.name}`)
                .setDescription(entry.data.description)
                .addFields(fields);

            return await interaction.reply({ embeds: [commandEmbed] });
        }

        const grouped = {};

        entries.forEach(entry => {
            if (!grouped[entry.folder]) {
                grouped[entry.folder] = [];
            }

            grouped[entry.folder].push(entry.data.name);
        });

        const fields = [];

        Object.keys(grouped).sort().forEach(folder => {
            const emoji = CATEGORIES[folder] || '📁';
            const names = grouped[folder].sort().map(name => `\`${name}\``).join(' ');

            fields.push({
                name: `${emoji} ${categoryName(folder)}`,
                value: names,
            });
        });

        const helpEmbed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('📕 Crimstone Commands')
            .setDescription('Use `/help command:<name>` for Details on a Command.')
            .addFields(fields)
            .setFooter({ text: `${entries.length} Commands` });

        await interaction.reply({ embeds: [helpEmbed] });
    }
};