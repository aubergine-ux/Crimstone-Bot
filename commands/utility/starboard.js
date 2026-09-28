const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType, InteractionContextType } = require('discord.js');
const { getStarboard, setStarboard, resetStarboard, DEFAULTS } = require('../utility/starboardStore.js');

const CUSTOM_EMOJI = /^<a?:\w+:\d+>$/;
const UNICODE_EMOJI = /^\p{Extended_Pictographic}/u;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('starboard')
        .setDescription('Repost messages that get enough stars to a highlights channel.')
        .setContexts(InteractionContextType.Guild)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand.setName('setup')
                .setDescription('Turn on the starboard')
                .addChannelOption(option =>
                    option.setName('channel').setDescription('Where starred messages are posted')
                        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement).setRequired(true))
                .addIntegerOption(option =>
                    option.setName('stars').setDescription(`Stars needed (default ${DEFAULTS.threshold})`).setMinValue(1).setMaxValue(50))
                .addStringOption(option =>
                    option.setName('emoji').setDescription(`The reaction that counts (default ${DEFAULTS.emoji})`).setMaxLength(64)))
        .addSubcommand(subcommand =>
            subcommand.setName('view').setDescription('See the starboard settings'))
        .addSubcommand(subcommand =>
            subcommand.setName('disable').setDescription('Turn off the starboard')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (subcommand === 'setup') {
            const channel = interaction.options.getChannel('channel');
            const threshold = interaction.options.getInteger('stars') ?? DEFAULTS.threshold;
            const emoji = (interaction.options.getString('emoji') || DEFAULTS.emoji).trim();

            if (!CUSTOM_EMOJI.test(emoji) && !UNICODE_EMOJI.test(emoji)) {
                await interaction.reply({ content: '❌ That doesn\'t look like an emoji. Use a normal emoji or one from this server.' });
                return;
            }

            const canPost = channel.permissionsFor(interaction.guild.members.me)?.has([
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.EmbedLinks,
            ]);

            if (!canPost) {
                await interaction.reply({ content: `❌ I can't post embeds in <#${channel.id}>.` });
                return;
            }

            setStarboard(guildId, { channelId: channel.id, threshold: threshold, emoji: emoji });

            await interaction.reply({ content: `✅ Messages with **${threshold}** ${emoji} will be posted in <#${channel.id}>.` });
            return;
        }

        if (subcommand === 'view') {
            const config = getStarboard(guildId);

            if (!config.channelId) {
                await interaction.reply({ content: 'The starboard is off. Turn it on with `/starboard setup`.' });
                return;
            }

            const embed = new EmbedBuilder()
                .setColor(0xF1C40F)
                .setTitle('⭐ Starboard')
                .addFields(
                    { name: 'Channel', value: `<#${config.channelId}>`, inline: true },
                    { name: 'Needed', value: `${config.threshold} ${config.emoji}`, inline: true },
                    { name: 'Posts', value: String(Object.keys(config.posts).length), inline: true },
                );

            await interaction.reply({ embeds: [embed] });
            return;
        }

        if (subcommand === 'disable') {
            resetStarboard(guildId);
            await interaction.reply({ content: '✅ The starboard is off.' });
        }
    },
};
