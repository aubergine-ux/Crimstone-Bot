const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType, InteractionContextType, MessageFlags } = require('discord.js');

const ROLE_OPTIONS = ['role1', 'role2', 'role3', 'role4', 'role5'];

const canAssign = (guild, role) => {
    const me = guild.members.me;
    return role.id !== guild.id && !role.managed && role.position < me.roles.highest.position;
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('buttonroles')
        .setDescription('Post a message with buttons members click to get roles.')
        .setContexts(InteractionContextType.Guild)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addChannelOption(option =>
            option.setName('channel').setDescription('Where to post the buttons')
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement).setRequired(true))
        .addStringOption(option =>
            option.setName('title').setDescription('The heading, e.g. "Pick your pronouns"').setMaxLength(256).setRequired(true))
        .addRoleOption(option =>
            option.setName('role1').setDescription('A role to offer').setRequired(true))
        .addRoleOption(option => option.setName('role2').setDescription('A role to offer').setRequired(false))
        .addRoleOption(option => option.setName('role3').setDescription('A role to offer').setRequired(false))
        .addRoleOption(option => option.setName('role4').setDescription('A role to offer').setRequired(false))
        .addRoleOption(option => option.setName('role5').setDescription('A role to offer').setRequired(false))
        .addStringOption(option =>
            option.setName('description').setDescription('Text shown under the heading').setMaxLength(2000).setRequired(false)),

    async execute(interaction) {
        const channel = interaction.options.getChannel('channel');
        const title = interaction.options.getString('title');
        const description = interaction.options.getString('description');

        const roles = ROLE_OPTIONS
            .map(name => interaction.options.getRole(name))
            .filter((role, index, list) => role && list.findIndex(other => other && other.id === role.id) === index);

        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
            await interaction.reply({ content: '❌ I need the Manage Roles permission to hand out roles.', flags: MessageFlags.Ephemeral });
            return;
        }

        const blocked = roles.filter(role => !canAssign(interaction.guild, role));

        if (blocked.length > 0) {
            await interaction.reply({
                content: `❌ I can't hand out ${blocked.map(role => `**${role.name}**`).join(', ')}. Pick normal roles that sit below my highest role.`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const canPost = channel.permissionsFor(interaction.guild.members.me)?.has([
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.EmbedLinks,
        ]);

        if (!canPost) {
            await interaction.reply({ content: `❌ I can't post embeds in <#${channel.id}>.`, flags: MessageFlags.Ephemeral });
            return;
        }

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(title)
            .setDescription(description || 'Click a button to get the role. Click it again to remove it.');

        const row = new ActionRowBuilder().addComponents(
            roles.map(role => new ButtonBuilder()
                .setCustomId(`buttonroles:${role.id}`)
                .setLabel(role.name.slice(0, 80))
                .setStyle(ButtonStyle.Secondary)),
        );

        await channel.send({ embeds: [embed], components: [row] });

        await interaction.reply({ content: `✅ Posted ${roles.length} role button${roles.length === 1 ? '' : 's'} in <#${channel.id}>.`, flags: MessageFlags.Ephemeral });
    },

    async button(interaction) {
        const roleId = interaction.customId.split(':')[1];
        const role = interaction.guild.roles.cache.get(roleId);

        if (!role) {
            await interaction.reply({ content: '❌ That role no longer exists.', flags: MessageFlags.Ephemeral });
            return;
        }

        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles) || !canAssign(interaction.guild, role)) {
            await interaction.reply({ content: '❌ I can\'t hand out that role any more. Ask a moderator to check my permissions.', flags: MessageFlags.Ephemeral });
            return;
        }

        const member = interaction.member;

        if (member.roles.cache.has(roleId)) {
            await member.roles.remove(roleId, 'Button role');
            await interaction.reply({ content: `➖ Removed <@&${roleId}>.`, flags: MessageFlags.Ephemeral });
            return;
        }

        await member.roles.add(roleId, 'Button role');
        await interaction.reply({ content: `➕ You now have <@&${roleId}>.`, flags: MessageFlags.Ephemeral });
    },
};
