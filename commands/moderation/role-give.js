const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('role-give')
        .setDescription('Give User a Role')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('User you want to give a Role to...')
                .setRequired(true)
        )
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Role you want to assign')
                .setRequired(true)
        ),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('target');
        const role = interaction.options.getRole('role');

        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) {
            return await interaction.reply({ content: 'User not in the Server.', ephemeral: true });
        }

        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return await interaction.reply({ content: 'No Permission to Manage Roles.', ephemeral: true });
        }

        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return await interaction.reply({ content: 'Grant me Permission to Manage Moles.', ephemeral: true });
        }

        if (role.position >= interaction.member.roles.highest.position) {
            return await interaction.reply({ content: 'Cannot assign a Role that is equal to or higher than your own highest Role.', ephemeral: true });
        }

        if (role.position >= interaction.guild.members.me.roles.highest.position) {
            return await interaction.reply({ content: 'Cannot assign this Role because it is positioned higher than or equal to my highest Role.', ephemeral: true });
        }

        if (targetMember.roles.cache.has(role.id)) {
            return await interaction.reply({ content: `**${targetUser.tag}** already has the Role **${role.name}**.`, ephemeral: true });
        }

        try {
            await targetMember.roles.add(role);
            await interaction.reply({ content: `Successfully gave the Role **${role.name}** to **${targetUser.tag}**.` });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'There was an ERROR MEOW trying to add that Role to the User.', ephemeral: true });
        }
    }
};