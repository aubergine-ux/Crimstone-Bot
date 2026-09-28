const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType, InteractionContextType, MessageFlags } = require('discord.js');
const { getAutomodConfig, setAutomodConfig, resetAutomodConfig } = require('../utility/automodConfig.js');
const { getConfig } = require('../utility/guildConfig.js');

const MAX_WORDS = 100;

const onOff = (value) => value ? 'On' : 'Off';

const reply = (interaction, content) => interaction.reply({ content: content, flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });

const missingPermissions = (guild) => {
    const me = guild.members.me;
    const missing = [];

    if (!me.permissions.has(PermissionFlagsBits.ManageMessages)) missing.push('Manage Messages (to delete messages)');
    if (!me.permissions.has(PermissionFlagsBits.ModerateMembers)) missing.push('Timeout Members (to time out spammers)');
    if (!me.permissions.has(PermissionFlagsBits.KickMembers)) missing.push('Kick Members (for the account age rule)');

    return missing;
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('automod')
        .setDescription('Automatically remove spam, links and blocked words, and watch for raids.')
        .setContexts(InteractionContextType.Guild)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand.setName('view').setDescription('See the current automod setup'))
        .addSubcommand(subcommand =>
            subcommand.setName('spam')
                .setDescription('Remove and time out members who send messages too fast')
                .addBooleanOption(option =>
                    option.setName('enabled').setDescription('Whether the spam filter is on').setRequired(true))
                .addIntegerOption(option =>
                    option.setName('messages').setDescription('How many messages count as spam (default 5)').setMinValue(3).setMaxValue(20))
                .addIntegerOption(option =>
                    option.setName('seconds').setDescription('Within how many seconds (default 5)').setMinValue(2).setMaxValue(60))
                .addIntegerOption(option =>
                    option.setName('timeout').setDescription('Timeout in minutes, 0 to only delete (default 5)').setMinValue(0).setMaxValue(1440)))
        .addSubcommand(subcommand =>
            subcommand.setName('invites')
                .setDescription('Remove Discord server invites')
                .addBooleanOption(option =>
                    option.setName('enabled').setDescription('Whether invites are removed').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand.setName('links')
                .setDescription('Remove every link')
                .addBooleanOption(option =>
                    option.setName('enabled').setDescription('Whether links are removed').setRequired(true)))
        .addSubcommandGroup(group =>
            group.setName('words')
                .setDescription('Manage blocked words')
                .addSubcommand(subcommand =>
                    subcommand.setName('add')
                        .setDescription('Block a word or phrase')
                        .addStringOption(option =>
                            option.setName('word').setDescription('Matched as a whole word, ignoring case').setRequired(true).setMaxLength(50)))
                .addSubcommand(subcommand =>
                    subcommand.setName('remove')
                        .setDescription('Unblock a word or phrase')
                        .addStringOption(option =>
                            option.setName('word').setDescription('The word to unblock').setRequired(true).setMaxLength(50)))
                .addSubcommand(subcommand =>
                    subcommand.setName('list').setDescription('See every blocked word')))
        .addSubcommand(subcommand =>
            subcommand.setName('exempt')
                .setDescription('Let a role or channel skip automod')
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Add or remove the exemption')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Add', value: 'add' },
                            { name: 'Remove', value: 'remove' },
                        ))
                .addRoleOption(option =>
                    option.setName('role').setDescription('A role to exempt').setRequired(false))
                .addChannelOption(option =>
                    option.setName('channel').setDescription('A channel or category to exempt')
                        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildForum, ChannelType.GuildCategory)
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand.setName('raid')
                .setDescription('Alert the mod log when lots of members join at once')
                .addBooleanOption(option =>
                    option.setName('enabled').setDescription('Whether raid alerts are on').setRequired(true))
                .addIntegerOption(option =>
                    option.setName('joins').setDescription('How many joins count as a raid (default 10)').setMinValue(3).setMaxValue(100))
                .addIntegerOption(option =>
                    option.setName('seconds').setDescription('Within how many seconds (default 30)').setMinValue(5).setMaxValue(600)))
        .addSubcommand(subcommand =>
            subcommand.setName('accountage')
                .setDescription('Kick accounts younger than a number of days as they join')
                .addIntegerOption(option =>
                    option.setName('days').setDescription('Minimum account age in days, 0 to turn off').setRequired(true).setMinValue(0).setMaxValue(365)))
        .addSubcommand(subcommand =>
            subcommand.setName('reset').setDescription('Turn every automod rule off')),

    async execute(interaction) {
        const group = interaction.options.getSubcommandGroup(false);
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;
        const config = getAutomodConfig(guildId);

        if (group === 'words') {
            if (subcommand === 'list') {
                if (config.words.length === 0) {
                    await reply(interaction, 'No words are blocked yet. Add one with `/automod words add`.');
                    return;
                }

                await reply(interaction, `🚫 **Blocked words (${config.words.length}):**\n${config.words.map(word => `||${word}||`).join(', ')}`.slice(0, 2000));
                return;
            }

            const word = interaction.options.getString('word').trim().toLowerCase();

            if (!word) {
                await reply(interaction, '❌ That word is empty.');
                return;
            }

            if (subcommand === 'add') {
                if (config.words.includes(word)) {
                    await reply(interaction, `||${word}|| is already blocked.`);
                    return;
                }

                if (config.words.length >= MAX_WORDS) {
                    await reply(interaction, `❌ You can block up to ${MAX_WORDS} words. Remove one first.`);
                    return;
                }

                config.words.push(word);
                setAutomodConfig(guildId, { words: config.words });

                await reply(interaction, `✅ Blocked ||${word}||.`);
                return;
            }

            const index = config.words.indexOf(word);

            if (index === -1) {
                await reply(interaction, `||${word}|| wasn't blocked.`);
                return;
            }

            config.words.splice(index, 1);
            setAutomodConfig(guildId, { words: config.words });

            await reply(interaction, `✅ Unblocked ||${word}||.`);
            return;
        }

        if (subcommand === 'view') {
            const exempt = [
                ...config.exemptRoles.map(id => `<@&${id}>`),
                ...config.exemptChannels.map(id => `<#${id}>`),
            ];

            const spamValue = config.spam.enabled
                ? `On — ${config.spam.messages} messages in ${config.spam.seconds}s, ${config.spam.timeoutMinutes > 0 ? `${config.spam.timeoutMinutes} min timeout` : 'delete only'}`
                : 'Off';

            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle(`🤖 Automod for ${interaction.guild.name}`)
                .addFields(
                    { name: 'Spam', value: spamValue },
                    { name: 'Invites', value: onOff(config.invites), inline: true },
                    { name: 'Links', value: onOff(config.links), inline: true },
                    { name: 'Blocked words', value: String(config.words.length), inline: true },
                    { name: 'Raid alerts', value: config.raid.enabled ? `On — ${config.raid.joins} joins in ${config.raid.seconds}s` : 'Off', inline: true },
                    { name: 'Minimum account age', value: config.minAccountDays > 0 ? `${config.minAccountDays} days` : 'Off', inline: true },
                    { name: 'Exempt', value: (exempt.join(', ') || 'None').slice(0, 1024) },
                )
                .setFooter({ text: 'Members with Manage Messages are always exempt.' });

            const warnings = missingPermissions(interaction.guild).map(permission => `⚠️ I'm missing **${permission}**.`);

            if (!getConfig(guildId).modlogChannel) {
                warnings.push('⚠️ No mod log is set, so automod actions and raid alerts aren\'t recorded. Set one with `/config modlog`.');
            }

            if (warnings.length > 0) embed.setDescription(warnings.join('\n'));

            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            return;
        }

        if (subcommand === 'spam') {
            const spam = {
                enabled: interaction.options.getBoolean('enabled'),
                messages: interaction.options.getInteger('messages') ?? config.spam.messages,
                seconds: interaction.options.getInteger('seconds') ?? config.spam.seconds,
                timeoutMinutes: interaction.options.getInteger('timeout') ?? config.spam.timeoutMinutes,
            };

            setAutomodConfig(guildId, { spam: spam });

            if (!spam.enabled) {
                await reply(interaction, '✅ The spam filter is off.');
                return;
            }

            const action = spam.timeoutMinutes > 0 ? `removed and timed out for ${spam.timeoutMinutes} minutes` : 'removed';

            await reply(interaction, `✅ Members sending **${spam.messages} messages in ${spam.seconds} seconds** will have them ${action}.`);
            return;
        }

        if (subcommand === 'invites' || subcommand === 'links') {
            const enabled = interaction.options.getBoolean('enabled');

            setAutomodConfig(guildId, { [subcommand]: enabled });

            const label = subcommand === 'invites' ? 'Discord invites' : 'Links';

            await reply(interaction, enabled ? `✅ ${label} will be removed.` : `✅ ${label} are allowed again.`);
            return;
        }

        if (subcommand === 'exempt') {
            const action = interaction.options.getString('action');
            const role = interaction.options.getRole('role');
            const channel = interaction.options.getChannel('channel');

            if (!role && !channel) {
                await reply(interaction, '❌ Pick a role or a channel.');
                return;
            }

            const update = (list, id) => {
                const index = list.indexOf(id);

                if (action === 'add' && index === -1) list.push(id);
                if (action === 'remove' && index !== -1) list.splice(index, 1);
            };

            const names = [];

            if (role) {
                update(config.exemptRoles, role.id);
                names.push(`<@&${role.id}>`);
            }

            if (channel) {
                update(config.exemptChannels, channel.id);
                names.push(`<#${channel.id}>`);
            }

            setAutomodConfig(guildId, { exemptRoles: config.exemptRoles, exemptChannels: config.exemptChannels });

            await reply(interaction, action === 'add'
                ? `✅ ${names.join(' and ')} now skip automod.`
                : `✅ ${names.join(' and ')} no longer skip automod.`);
            return;
        }

        if (subcommand === 'raid') {
            const raid = {
                enabled: interaction.options.getBoolean('enabled'),
                joins: interaction.options.getInteger('joins') ?? config.raid.joins,
                seconds: interaction.options.getInteger('seconds') ?? config.raid.seconds,
            };

            setAutomodConfig(guildId, { raid: raid });

            if (!raid.enabled) {
                await reply(interaction, '✅ Raid alerts are off.');
                return;
            }

            let content = `✅ The mod log will be alerted when **${raid.joins} members join within ${raid.seconds} seconds**.`;

            if (!getConfig(guildId).modlogChannel) content += '\n⚠️ Set a mod log with `/config modlog` first, or the alerts have nowhere to go.';

            await reply(interaction, content);
            return;
        }

        if (subcommand === 'accountage') {
            const days = interaction.options.getInteger('days');

            setAutomodConfig(guildId, { minAccountDays: days });

            await reply(interaction, days > 0
                ? `✅ Accounts younger than **${days} day${days === 1 ? '' : 's'}** will be kicked when they join, with a DM explaining why.`
                : '✅ Accounts of any age can join.');
            return;
        }

        if (subcommand === 'reset') {
            resetAutomodConfig(guildId);
            await reply(interaction, '✅ Every automod rule is off.');
        }
    },
};
