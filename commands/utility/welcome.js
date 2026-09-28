const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType, InteractionContextType } = require('discord.js');
const { getWelcomeConfig, setWelcomeConfig, resetWelcomeConfig, sendGreeting } = require('../utility/welcomeConfig.js');

const MAX_AUTO_ROLES = 5;

const PLACEHOLDERS = 'Use {user}, {username}, {server} and {count}.';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('welcome')
        .setDescription('Greet new members, say goodbye, and hand out roles on join.')
        .setContexts(InteractionContextType.Guild)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand.setName('view').setDescription('See the current welcome setup'))
        .addSubcommand(subcommand =>
            subcommand.setName('join')
                .setDescription('Post a message when someone joins')
                .addChannelOption(option =>
                    option.setName('channel').setDescription('Where to post, leave empty to turn off')
                        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement).setRequired(false))
                .addStringOption(option =>
                    option.setName('message').setDescription(PLACEHOLDERS).setMaxLength(1000).setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand.setName('leave')
                .setDescription('Post a message when someone leaves')
                .addChannelOption(option =>
                    option.setName('channel').setDescription('Where to post, leave empty to turn off')
                        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement).setRequired(false))
                .addStringOption(option =>
                    option.setName('message').setDescription(PLACEHOLDERS).setMaxLength(1000).setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand.setName('autorole')
                .setDescription('Give a role to every new member')
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Add or remove the role')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Add', value: 'add' },
                            { name: 'Remove', value: 'remove' },
                        ))
                .addRoleOption(option =>
                    option.setName('role').setDescription('The role to give').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand.setName('test')
                .setDescription('Send the join and leave messages as if you had just joined and left'))
        .addSubcommand(subcommand =>
            subcommand.setName('reset').setDescription('Turn off welcome messages and auto roles')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;
        const config = getWelcomeConfig(guildId);

        if (subcommand === 'view') {
            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle(`👋 Welcome setup for ${interaction.guild.name}`)
                .addFields(
                    { name: 'Join channel', value: config.joinChannel ? `<#${config.joinChannel}>` : 'Off', inline: true },
                    { name: 'Leave channel', value: config.leaveChannel ? `<#${config.leaveChannel}>` : 'Off', inline: true },
                    { name: 'Auto roles', value: config.autoRoles.map(id => `<@&${id}>`).join(', ') || 'None', inline: true },
                    { name: 'Join message', value: config.joinMessage.slice(0, 1024) },
                    { name: 'Leave message', value: config.leaveMessage.slice(0, 1024) },
                );

            await interaction.reply({ embeds: [embed] });
            return;
        }

        if (subcommand === 'join' || subcommand === 'leave') {
            const channel = interaction.options.getChannel('channel');
            const message = interaction.options.getString('message');
            const updates = { [`${subcommand}Channel`]: channel ? channel.id : null };

            if (message) updates[`${subcommand}Message`] = message;

            setWelcomeConfig(guildId, updates);

            const label = subcommand === 'join' ? 'Join' : 'Leave';

            if (!channel) {
                await interaction.reply({ content: `✅ ${label} messages are off.` });
                return;
            }

            await interaction.reply({
                content: `✅ ${label} messages will post in <#${channel.id}>. Try it with \`/welcome test\`.`,
            });
            return;
        }

        if (subcommand === 'autorole') {
            const action = interaction.options.getString('action');
            const role = interaction.options.getRole('role');
            const autoRoles = config.autoRoles;

            if (action === 'remove') {
                const index = autoRoles.indexOf(role.id);

                if (index === -1) {
                    await interaction.reply({ content: `<@&${role.id}> isn't an auto role.`, allowedMentions: { parse: [] } });
                    return;
                }

                autoRoles.splice(index, 1);
                setWelcomeConfig(guildId, { autoRoles: autoRoles });

                await interaction.reply({ content: `✅ New members will no longer get <@&${role.id}>.`, allowedMentions: { parse: [] } });
                return;
            }

            if (role.managed || role.id === guildId) {
                await interaction.reply({ content: '❌ That role can\'t be handed out.' });
                return;
            }

            const me = interaction.guild.members.me;

            if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) {
                await interaction.reply({ content: '❌ I need the Manage Roles permission to give auto roles.' });
                return;
            }

            if (role.position >= me.roles.highest.position) {
                await interaction.reply({ content: `❌ **${role.name}** sits above my highest role, so I can't assign it. Drag my role above it in Server Settings.` });
                return;
            }

            if (autoRoles.includes(role.id)) {
                await interaction.reply({ content: `<@&${role.id}> is already an auto role.`, allowedMentions: { parse: [] } });
                return;
            }

            if (autoRoles.length >= MAX_AUTO_ROLES) {
                await interaction.reply({ content: `❌ You can have up to ${MAX_AUTO_ROLES} auto roles. Remove one first.` });
                return;
            }

            autoRoles.push(role.id);
            setWelcomeConfig(guildId, { autoRoles: autoRoles });

            await interaction.reply({ content: `✅ New members will get <@&${role.id}>. Bots are skipped.`, allowedMentions: { parse: [] } });
            return;
        }

        if (subcommand === 'test') {
            if (!config.joinChannel && !config.leaveChannel) {
                await interaction.reply({ content: 'Nothing to test yet — set a channel with `/welcome join` or `/welcome leave`.' });
                return;
            }

            const joined = await sendGreeting(interaction.member, 'join');
            const left = await sendGreeting(interaction.member, 'leave');

            const lines = [];

            if (config.joinChannel) lines.push(joined ? `✅ Join message sent to <#${config.joinChannel}>.` : `❌ Couldn't post in <#${config.joinChannel}> — check my permissions there.`);
            if (config.leaveChannel) lines.push(left ? `✅ Leave message sent to <#${config.leaveChannel}>.` : `❌ Couldn't post in <#${config.leaveChannel}> — check my permissions there.`);

            await interaction.reply({ content: lines.join('\n') });
            return;
        }

        if (subcommand === 'reset') {
            resetWelcomeConfig(guildId);
            await interaction.reply({ content: '✅ Welcome messages and auto roles are off.' });
        }
    },
};
