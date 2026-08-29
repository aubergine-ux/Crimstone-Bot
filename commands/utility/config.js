const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { getConfig, setConfig, resetConfig } = require('../utility/guildConfig.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('config')
        .setDescription('Configure Crimstone for this server.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand.setName('view').setDescription('See the current settings'))
        .addSubcommand(subcommand =>
            subcommand.setName('levelup')
                .setDescription('Choose where level-up messages are posted')
                .addStringOption(option =>
                    option.setName('mode')
                        .setDescription('Where to announce level-ups')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Current channel', value: 'current' },
                            { name: 'Specific channel', value: 'channel' },
                            { name: 'Disabled', value: 'off' },
                        ))
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Required when mode is "Specific channel"')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand.setName('modlog')
                .setDescription('Set the channel for moderation logs')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Leave empty to disable logging')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand.setName('xp')
                .setDescription('Turn the leveling system on or off')
                .addBooleanOption(option =>
                    option.setName('enabled')
                        .setDescription('Whether members earn XP')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand.setName('ignore')
                .setDescription('Stop or resume XP gain in a channel')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('The channel to ignore or un-ignore')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Add or remove from the ignore list')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Add', value: 'add' },
                            { name: 'Remove', value: 'remove' },
                        )))
        .addSubcommand(subcommand =>
            subcommand.setName('reset').setDescription('Restore every setting to its default')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (subcommand === 'view') {
            const config = getConfig(guildId);

            let levelupValue = 'Current channel';
            if (config.levelupMode === 'off') levelupValue = 'Disabled';
            if (config.levelupMode === 'channel') levelupValue = `<#${config.levelupChannel}>`;

            const ignoredValue = config.ignoredChannels.length === 0
                ? 'None'
                : config.ignoredChannels.map(id => `<#${id}>`).join(', ');

            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle(`⚙️ Settings for ${interaction.guild.name}`)
                .addFields(
                    { name: 'Level-up messages', value: levelupValue, inline: true },
                    { name: 'XP system', value: config.xpEnabled ? 'Enabled' : 'Disabled', inline: true },
                    { name: 'Mod log', value: config.modlogChannel ? `<#${config.modlogChannel}>` : 'Disabled', inline: true },
                    { name: 'XP-ignored channels', value: ignoredValue },
                );

            await interaction.reply({ embeds: [embed] });
            return;
        }

        if (subcommand === 'levelup') {
            const mode = interaction.options.getString('mode');
            const channel = interaction.options.getChannel('channel');

            if (mode === 'channel' && !channel) {
                await interaction.reply({ content: '❌ Pick a channel when using "Specific channel" mode.' });
                return;
            }

            setConfig(guildId, {
                levelupMode: mode,
                levelupChannel: mode === 'channel' ? channel.id : null,
            });

            if (mode === 'off') {
                await interaction.reply({ content: '✅ Level-up messages are now disabled.' });
            } else if (mode === 'current') {
                await interaction.reply({ content: '✅ Level-up messages will post wherever the member was chatting.' });
            } else {
                await interaction.reply({ content: `✅ Level-up messages will post in <#${channel.id}>.` });
            }
            return;
        }

        if (subcommand === 'modlog') {
            const channel = interaction.options.getChannel('channel');

            setConfig(guildId, { modlogChannel: channel ? channel.id : null });

            if (channel) {
                await interaction.reply({ content: `✅ Moderation actions will be logged in <#${channel.id}>.` });
            } else {
                await interaction.reply({ content: '✅ Moderation logging is now disabled.' });
            }
            return;
        }

        if (subcommand === 'xp') {
            const enabled = interaction.options.getBoolean('enabled');

            setConfig(guildId, { xpEnabled: enabled });

            await interaction.reply({ content: enabled ? '✅ Members will earn XP.' : '✅ XP gain is now turned off.' });
            return;
        }

        if (subcommand === 'ignore') {
            const channel = interaction.options.getChannel('channel');
            const action = interaction.options.getString('action');

            const config = getConfig(guildId);
            const ignored = config.ignoredChannels;

            if (action === 'add') {
                if (ignored.includes(channel.id)) {
                    await interaction.reply({ content: `<#${channel.id}> is already ignored.` });
                    return;
                }

                ignored.push(channel.id);
                setConfig(guildId, { ignoredChannels: ignored });

                await interaction.reply({ content: `✅ No more XP will be earned in <#${channel.id}>.` });
                return;
            }

            const index = ignored.indexOf(channel.id);

            if (index === -1) {
                await interaction.reply({ content: `<#${channel.id}> wasn't on the ignore list.` });
                return;
            }

            ignored.splice(index, 1);
            setConfig(guildId, { ignoredChannels: ignored });

            await interaction.reply({ content: `✅ XP can be earned in <#${channel.id}> again.` });
            return;
        }

        if (subcommand === 'reset') {
            resetConfig(guildId);
            await interaction.reply({ content: '✅ Every setting has been restored to its default.' });
        }
    }
};
