const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { logAction } = require('../utility/modLog.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nickname')
        .setDescription('Change a User\'s Nickname')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('User you want to change Nickname of')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('nickname')
                .setDescription('New Nickname (use "reset" to clear it)')
                .setRequired(true)
                .setMaxLength(32)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('target');
        let newNick = interaction.options.getString('nickname');

        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) {
            return await interaction.reply({ content: 'User is not in the Server.', flags: MessageFlags.Ephemeral });
        }

        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageNicknames)) {
            return await interaction.reply({ content: 'Do not have Permission to change Nicknames.', flags: MessageFlags.Ephemeral });
        }

        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageNicknames)) {
            return await interaction.reply({ content: 'Grant me Permission to Manage Nicknames.', flags: MessageFlags.Ephemeral });
        }

        if (targetMember.id === interaction.guild.ownerId) {
            return await interaction.reply({ content: 'Cannot change the Nickname of Server Owner.', flags: MessageFlags.Ephemeral });
        }

        if (targetMember.roles.highest.position >= interaction.guild.members.me.roles.highest.position) {
            return await interaction.reply({ content: 'Cannot change this User\'s Nickname. They have a role equal to or higher than mine.', flags: MessageFlags.Ephemeral });
        }

        const oldNick = targetMember.nickname;

        if (newNick.toLowerCase() === 'reset') {
            newNick = null;
        }

        try {
            await targetMember.setNickname(newNick, `${interaction.user.tag} changed the nickname`);

            if (newNick === null) {
                await interaction.reply({ content: `Successfully reset the Nickname for **${targetUser.tag}**.` });
            } else {
                await interaction.reply({ content: `Successfully changed **${targetUser.tag}**'s Nickname to **${newNick}**.` });
            }

            await logAction({
                guild: interaction.guild,
                action: 'nickname',
                target: targetUser,
                moderator: interaction.user,
                reason: newNick === null ? 'Nickname reset' : 'Nickname changed',
                extra: `${oldNick || targetUser.username} → ${newNick || targetUser.username}`,
            });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'There was an error trying to change this User\'s Nickname.', flags: MessageFlags.Ephemeral });
        }
    }
};
