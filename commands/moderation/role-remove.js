const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('role-remove')
        .setDescription('Remove a Role from a User')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('User you want to remove Role from...')
                .setRequired(true)
        )
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Role you want to remove')
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
            return await interaction.reply({ content: 'Grant me Permission to Manage Roles.', ephemeral: true });
        }

        if (role.position >= interaction.member.roles.highest.position) {
            return await interaction.reply({ content: 'Cannot remove a Role that is equal to or higher than your own highest Role.', ephemeral: true });
        }

        if (role.position >= interaction.guild.members.me.roles.highest.position) {
            return await interaction.reply({ content: 'Cannot remove this Role because it is positioned higher than or equal to my highest Role.', ephemeral: true });
        }

        if (!targetMember.roles.cache.has(role.id)) {
            return await interaction.reply({ content: `**${targetUser.tag}** doesn't even have the Role **${role.name}**.`, ephemeral: true });
        }

        try {
            await targetMember.roles.remove(role);
            await interaction.reply({ content: `Successfully removed the Role **${role.name}** from **${targetUser.tag}**.` });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'There was an ERROR MEOW trying to remove that Role from the User.', ephemeral: true });
        }
    }
};