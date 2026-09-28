const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType, InteractionContextType } = require('discord.js');
const { getConfig, setConfig } = require('../utility/guildConfig.js');

const BOOSTABLE_CHANNELS = [
    ChannelType.GuildText,
    ChannelType.GuildAnnouncement,
    ChannelType.GuildVoice,
    ChannelType.GuildStageVoice,
    ChannelType.GuildForum,
];

const formatBoost = (multiplier) => `×${Number(multiplier.toFixed(2))}`;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('xpboost')
        .setDescription('Give certain roles or channels extra XP.')
        .setContexts(InteractionContextType.Guild)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand.setName('role')
                .setDescription('Boost XP for members with a role (their best role boost counts)')
                .addRoleOption(option =>
                    option.setName('role').setDescription('The role to boost').setRequired(true))
                .addNumberOption(option =>
                    option.setName('multiplier').setDescription('1.5 means 50% more XP').setRequired(true).setMinValue(1.1).setMaxValue(5)))
        .addSubcommand(subcommand =>
            subcommand.setName('channel')
                .setDescription('Boost XP earned in a channel (threads and forum posts included)')
                .addChannelOption(option =>
                    option.setName('channel').setDescription('The channel to boost').addChannelTypes(...BOOSTABLE_CHANNELS).setRequired(true))
                .addNumberOption(option =>
                    option.setName('multiplier').setDescription('1.5 means 50% more XP').setRequired(true).setMinValue(1.1).setMaxValue(5)))
        .addSubcommand(subcommand =>
            subcommand.setName('remove')
                .setDescription('Remove a role or channel boost')
                .addRoleOption(option =>
                    option.setName('role').setDescription('The role boost to remove').setRequired(false))
                .addChannelOption(option =>
                    option.setName('channel').setDescription('The channel boost to remove').addChannelTypes(...BOOSTABLE_CHANNELS).setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand.setName('list')
                .setDescription('See every XP boost')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;
        const config = getConfig(guildId);

        if (subcommand === 'role') {
            const role = interaction.options.getRole('role');
            const multiplier = interaction.options.getNumber('multiplier');

            config.roleBoosts[role.id] = multiplier;
            setConfig(guildId, { roleBoosts: config.roleBoosts });

            await interaction.reply({ content: `✅ Members with <@&${role.id}> now earn **${formatBoost(multiplier)}** XP.`, allowedMentions: { parse: [] } });
            return;
        }

        if (subcommand === 'channel') {
            const channel = interaction.options.getChannel('channel');
            const multiplier = interaction.options.getNumber('multiplier');

            config.channelBoosts[channel.id] = multiplier;
            setConfig(guildId, { channelBoosts: config.channelBoosts });

            await interaction.reply({ content: `✅ XP earned in <#${channel.id}> is now **${formatBoost(multiplier)}**.` });
            return;
        }

        if (subcommand === 'remove') {
            const role = interaction.options.getRole('role');
            const channel = interaction.options.getChannel('channel');

            if (!role && !channel) {
                await interaction.reply({ content: '❌ Pick a role or a channel to remove the boost from.' });
                return;
            }

            const removed = [];

            if (role && config.roleBoosts[role.id]) {
                delete config.roleBoosts[role.id];
                removed.push(`<@&${role.id}>`);
            }

            if (channel && config.channelBoosts[channel.id]) {
                delete config.channelBoosts[channel.id];
                removed.push(`<#${channel.id}>`);
            }

            if (removed.length === 0) {
                await interaction.reply({ content: 'There was no boost to remove there.' });
                return;
            }

            setConfig(guildId, { roleBoosts: config.roleBoosts, channelBoosts: config.channelBoosts });

            await interaction.reply({ content: `✅ Removed the boost from ${removed.join(' and ')}.`, allowedMentions: { parse: [] } });
            return;
        }

        if (subcommand === 'list') {
            const roleLines = Object.keys(config.roleBoosts)
                .map(roleId => `<@&${roleId}> — **${formatBoost(config.roleBoosts[roleId])}**`);
            const channelLines = Object.keys(config.channelBoosts)
                .map(channelId => `<#${channelId}> — **${formatBoost(config.channelBoosts[channelId])}**`);

            if (roleLines.length === 0 && channelLines.length === 0) {
                await interaction.reply({ content: 'No XP boosts are set up yet. Add one with `/xpboost role` or `/xpboost channel`.' });
                return;
            }

            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('🚀 XP Boosts')
                .addFields(
                    { name: 'Roles', value: (roleLines.join('\n') || 'None').slice(0, 1024) },
                    { name: 'Channels', value: (channelLines.join('\n') || 'None').slice(0, 1024) },
                )
                .setFooter({ text: 'A member\'s best role boost is multiplied by the channel boost.' });

            await interaction.reply({ embeds: [embed] });
        }
    },
};
