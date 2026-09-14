const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType, InteractionContextType } = require('discord.js');
const { CATEGORIES, getAuditConfig, setAuditChannel, setAuditCategory, resetAudit } = require('../utility/auditConfig.js');

const CHOICES = Object.keys(CATEGORIES).map(key => ({ name: CATEGORIES[key].label, value: key }));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('auditlog')
        .setDescription('Control what Crimstone records about this server.')
        .setContexts(InteractionContextType.Guild)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand.setName('view').setDescription('See which categories are being logged'))
        .addSubcommand(subcommand =>
            subcommand.setName('channel')
                .setDescription('Set the channel every category logs to by default')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Leave empty to turn the audit log off')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand.setName('category')
                .setDescription('Turn one category on or off, or give it its own channel')
                .addStringOption(option =>
                    option.setName('category')
                        .setDescription('Which category to change')
                        .setRequired(true)
                        .addChoices(...CHOICES))
                .addBooleanOption(option =>
                    option.setName('enabled')
                        .setDescription('Whether this category is recorded')
                        .setRequired(true))
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Send this category somewhere other than the default channel')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand.setName('reset').setDescription('Forget every audit log setting')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (subcommand === 'view') {
            const config = getAuditConfig(guildId);

            const lines = Object.keys(CATEGORIES).map(key => {
                const style = CATEGORIES[key];
                const settings = config.categories[key];
                const mark = settings.enabled ? '✅' : '❌';
                const target = settings.channel ? ` → <#${settings.channel}>` : '';

                return `${mark} ${style.emoji} **${style.label}**${target}\n${style.hint}`;
            });

            const viewEmbed = new EmbedBuilder()
                .setColor(config.channel ? 0x5865F2 : 0x95A5A6)
                .setTitle(`🗂️ Audit log for ${interaction.guild.name}`)
                .setDescription(config.channel
                    ? `Default channel: <#${config.channel}>`
                    : 'No channel set yet — nothing is being recorded. Use `/auditlog channel`.')
                .addFields({ name: 'Categories', value: lines.join('\n\n') });

            await interaction.reply({ embeds: [viewEmbed] });
            return;
        }

        if (subcommand === 'channel') {
            const channel = interaction.options.getChannel('channel');

            setAuditChannel(guildId, channel ? channel.id : null);

            if (channel) {
                await interaction.reply({ content: `✅ Audit entries will go to <#${channel.id}>. Use \`/auditlog view\` to pick categories.` });
            } else {
                await interaction.reply({ content: '✅ The audit log is now off.' });
            }
            return;
        }

        if (subcommand === 'category') {
            const category = interaction.options.getString('category');
            const enabled = interaction.options.getBoolean('enabled');
            const channel = interaction.options.getChannel('channel');
            const style = CATEGORIES[category];

            setAuditCategory(guildId, category, {
                enabled: enabled,
                channel: channel ? channel.id : null,
            });

            const config = getAuditConfig(guildId);

            if (!enabled) {
                await interaction.reply({ content: `✅ ${style.emoji} **${style.label}** will no longer be recorded.` });
                return;
            }

            if (channel) {
                await interaction.reply({ content: `✅ ${style.emoji} **${style.label}** will be recorded in <#${channel.id}>.` });
                return;
            }

            if (!config.channel) {
                await interaction.reply({ content: `⚠️ ${style.emoji} **${style.label}** is on, but there is no channel to log to yet. Set one with \`/auditlog channel\`.` });
                return;
            }

            await interaction.reply({ content: `✅ ${style.emoji} **${style.label}** will be recorded in <#${config.channel}>.` });
            return;
        }

        if (subcommand === 'reset') {
            resetAudit(guildId);
            await interaction.reply({ content: '✅ Every audit log setting has been cleared.' });
        }
    }
};
