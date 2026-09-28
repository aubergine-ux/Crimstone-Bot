const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType, InteractionContextType } = require('discord.js');
const { getConfig, setConfig, resetConfig } = require('../utility/guildConfig.js');
const { DEFAULT_LEVELUP } = require('../utility/awardXp.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('config')
        .setDescription('Configure Crimstone for this server.')
        .setContexts(InteractionContextType.Guild)
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
            subcommand.setName('voicexp')
                .setDescription('Let members earn XP while talking in voice channels')
                .addBooleanOption(option =>
                    option.setName('enabled')
                        .setDescription('Whether time in voice earns XP')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand.setName('levelmessage')
                .setDescription('Write your own level-up message')
                .addStringOption(option =>
                    option.setName('template')
                        .setDescription('Use {user}, {username}, {level}, {server}. Leave empty for the default.')
                        .setMaxLength(500)
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand.setName('global')
                .setDescription('Choose whether this server joins the global leaderboard')
                .addBooleanOption(option =>
                    option.setName('enabled')
                        .setDescription('Whether this server\'s XP counts towards /leaderboard scope:Global')
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
                    { name: 'Voice XP', value: config.voiceXp ? 'Enabled' : 'Disabled', inline: true },
                    { name: 'Mod log', value: config.modlogChannel ? `<#${config.modlogChannel}>` : 'Disabled', inline: true },
                    { name: 'Global leaderboard', value: config.globalLeaderboard ? 'Joined' : 'Opted out', inline: true },
                    { name: 'XP-ignored channels', value: ignoredValue },
                    { name: 'Level-up message', value: `\`${config.levelupMessage || DEFAULT_LEVELUP}\``.slice(0, 1024) },
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

        if (subcommand === 'voicexp') {
            const enabled = interaction.options.getBoolean('enabled');

            setConfig(guildId, { voiceXp: enabled });

            if (enabled) {
                await interaction.reply({ content: '✅ Members will earn XP every minute they talk in voice with someone else. Muted, deafened and AFK-channel members don\'t earn any.' });
            } else {
                await interaction.reply({ content: '✅ Voice channels no longer earn XP.' });
            }
            return;
        }

        if (subcommand === 'levelmessage') {
            const template = interaction.options.getString('template');

            setConfig(guildId, { levelupMessage: template || null });

            const preview = template || DEFAULT_LEVELUP;

            await interaction.reply({
                content: `✅ Level-up message set to:\n> ${preview}\n-# {user} pings the member, {username} doesn't. Unlocked reward roles are listed underneath.`,
                allowedMentions: { parse: [] },
            });
            return;
        }

        if (subcommand === 'global') {
            const enabled = interaction.options.getBoolean('enabled');

            setConfig(guildId, { globalLeaderboard: enabled });

            if (enabled) {
                await interaction.reply({ content: '✅ This server now counts towards the global leaderboard.' });
            } else {
                await interaction.reply({ content: '✅ This server has opted out of the global leaderboard.' });
            }
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
