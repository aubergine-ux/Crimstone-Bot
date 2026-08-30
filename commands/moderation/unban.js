const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { logAction } = require('../utility/modLog.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Lift a ban from a User')
        .addStringOption(option =>
            option.setName('target')
                .setDescription('Start typing a name, or past a User ID')
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the Unban')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused().toLowerCase();
        
        try {
            const bans = await interaction.guild.bans.fetch();

            const matches = [...bans.values()]
                .filter(ban => {
                    if (!focused) return true;
                    return ban.user.tag.toLowerCase().includes(focused) || ban.user.id.includes(focused);
                })
                .slice(0, 25)
                .map(ban => ({
                    name: `${ban.user.tag} (${ban.user.id})`.slice(0, 100),
                    value: ban.user.id,
                }));
 
            await interaction.respond(matches);
        } catch (error) {
            await interaction.respond([]);
        }
    },
 
    async execute(interaction) {
        const targetId = interaction.options.getString('target').trim();
        const reason = interaction.options.getString('reason') || 'No Reason Provided';
 
        if (!/^\d{17,20}$/.test(targetId)) {
            return await interaction.reply({
                content: 'That doesn\'t look like a User ID. Pick someone from the suggestions, or paste their ID.',
                flags: MessageFlags.Ephemeral,
            });
        }
 
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
            return await interaction.reply({ content: 'Grant me Permission to Ban Users.', flags: MessageFlags.Ephemeral });
        }
 
        const ban = await interaction.guild.bans.fetch(targetId).catch(() => null);
 
        if (!ban) {
            return await interaction.reply({
                content: 'That User isn\'t banned from this Server.',
                flags: MessageFlags.Ephemeral,
            });
        }
 
        try {
            await interaction.guild.bans.remove(targetId, `${interaction.user.tag}: ${reason}`);
 
            await interaction.reply({ content: `Successfully unbanned **${ban.user.tag}**. Reason: *${reason}*` });
 
            await logAction({
                guild: interaction.guild,
                action: 'unban',
                target: ban.user,
                moderator: interaction.user,
                reason: reason,
                extra: ban.reason ? `Original ban reason: ${ban.reason}` : undefined,
            });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'There was an error trying to unban this User.', flags: MessageFlags.Ephemeral });
        }
    }
};