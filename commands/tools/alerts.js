const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType, InteractionContextType } = require('discord.js');
const { alertsFor, addAlert, removeAlert } = require('../utility/alertStore.js');
const { resolveYoutube, resolveTwitch, twitchConfigured } = require('../utility/alertPoller.js');

const MAX_ALERTS = 15;

const PLATFORMS = {
    youtube: { emoji: '📺', label: 'YouTube' },
    twitch: { emoji: '🔴', label: 'Twitch' },
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('alerts')
        .setDescription('Post when a YouTube channel uploads or a Twitch streamer goes live.')
        .setContexts(InteractionContextType.Guild)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand.setName('add')
                .setDescription('Follow a YouTube channel or Twitch streamer')
                .addStringOption(option =>
                    option.setName('platform')
                        .setDescription('Where they post')
                        .setRequired(true)
                        .addChoices(
                            { name: 'YouTube', value: 'youtube' },
                            { name: 'Twitch', value: 'twitch' },
                        ))
                .addStringOption(option =>
                    option.setName('account').setDescription('Channel link, @handle or Twitch username').setMaxLength(200).setRequired(true))
                .addChannelOption(option =>
                    option.setName('channel').setDescription('Where to post the alerts')
                        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement).setRequired(true))
                .addRoleOption(option =>
                    option.setName('ping').setDescription('A role to ping with each alert'))
                .addStringOption(option =>
                    option.setName('message').setDescription('Use {name}, {title} and {link}. Twitch also has {game}.').setMaxLength(500)))
        .addSubcommand(subcommand =>
            subcommand.setName('remove')
                .setDescription('Stop following someone')
                .addStringOption(option =>
                    option.setName('alert').setDescription('The alert to remove').setRequired(true).setAutocomplete(true)))
        .addSubcommand(subcommand =>
            subcommand.setName('list')
                .setDescription('See everyone this server follows')),

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused().toLowerCase();

        const matches = alertsFor(interaction.guild.id)
            .filter(alert => !focused || alert.name.toLowerCase().includes(focused))
            .slice(0, 25)
            .map(alert => ({
                name: `${PLATFORMS[alert.platform].label}: ${alert.name}`.slice(0, 100),
                value: alert.id,
            }));

        await interaction.respond(matches);
    },

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (subcommand === 'add') {
            const platform = interaction.options.getString('platform');
            const account = interaction.options.getString('account');
            const channel = interaction.options.getChannel('channel');
            const role = interaction.options.getRole('ping');
            const message = interaction.options.getString('message');

            if (alertsFor(guildId).length >= MAX_ALERTS) {
                await interaction.reply({ content: `❌ You can follow up to ${MAX_ALERTS} accounts. Remove one first.` });
                return;
            }

            if (platform === 'twitch' && !twitchConfigured()) {
                await interaction.reply({ content: '❌ Twitch alerts aren\'t set up on this bot yet. The bot owner needs to add `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET`.' });
                return;
            }

            await interaction.deferReply();

            let resolved = null;

            try {
                resolved = platform === 'youtube' ? await resolveYoutube(account) : await resolveTwitch(account);
            } catch (error) {
                console.error(`Failed to look up ${platform} account ${account}:`, error.message);
            }

            if (!resolved) {
                const hint = platform === 'youtube'
                    ? 'Try the channel link that contains `/channel/UC...`.'
                    : 'Check the username is spelled right.';

                await interaction.editReply({ content: `❌ I couldn't find that ${PLATFORMS[platform].label} account. ${hint}` });
                return;
            }

            const id = `${platform}:${resolved.account}:${channel.id}`;

            if (alertsFor(guildId).some(alert => alert.id === id)) {
                await interaction.editReply({ content: `❌ **${resolved.name}** already posts in <#${channel.id}>.` });
                return;
            }

            addAlert(guildId, {
                id: id,
                platform: platform,
                account: resolved.account,
                name: resolved.name,
                channelId: channel.id,
                roleId: role ? role.id : null,
                message: message || null,
                lastPublished: resolved.lastPublished || 0,
                lastStreamId: resolved.lastStreamId || null,
            });

            const what = platform === 'youtube' ? 'uploads a video' : 'goes live';

            await interaction.editReply({
                content: `✅ I'll post in <#${channel.id}> whenever **${resolved.name}** ${what}.`,
                allowedMentions: { parse: [] },
            });
            return;
        }

        if (subcommand === 'remove') {
            const id = interaction.options.getString('alert');
            const alert = alertsFor(guildId).find(item => item.id === id);

            if (!alert || !removeAlert(guildId, id)) {
                await interaction.reply({ content: '❌ I couldn\'t find that alert.' });
                return;
            }

            await interaction.reply({ content: `✅ Stopped following **${alert.name}** in <#${alert.channelId}>.` });
            return;
        }

        if (subcommand === 'list') {
            const alerts = alertsFor(guildId);

            if (alerts.length === 0) {
                await interaction.reply({ content: 'This server doesn\'t follow anyone yet. Add someone with `/alerts add`.' });
                return;
            }

            const lines = alerts.map(alert => {
                const ping = alert.roleId ? ` · pings <@&${alert.roleId}>` : '';
                return `${PLATFORMS[alert.platform].emoji} **${alert.name}** → <#${alert.channelId}>${ping}`;
            });

            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('🔔 Social Alerts')
                .setDescription(lines.join('\n').slice(0, 4096));

            await interaction.reply({ embeds: [embed], allowedMentions: { parse: [] } });
        }
    },
};
