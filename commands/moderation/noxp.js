const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, InteractionContextType } = require('discord.js');
const { getConfig, setConfig } = require('../utility/guildConfig.js');

const MAX_ROLES = 25;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('noxp')
        .setDescription('Stop members with certain roles from earning XP.')
        .setContexts(InteractionContextType.Guild)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand.setName('add')
                .setDescription('Stop a role from earning XP')
                .addRoleOption(option =>
                    option.setName('role').setDescription('The role that shouldn\'t earn XP').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand.setName('remove')
                .setDescription('Let a role earn XP again')
                .addRoleOption(option =>
                    option.setName('role').setDescription('The role to allow again').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand.setName('list')
                .setDescription('See every role that can\'t earn XP')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;
        const roles = getConfig(guildId).noXpRoles;

        if (subcommand === 'add') {
            const role = interaction.options.getRole('role');

            if (role.id === interaction.guild.id) {
                await interaction.reply({ content: '❌ That\'s the @everyone role. Use `/config xp enabled:False` to turn XP off for everyone.' });
                return;
            }

            if (roles.includes(role.id)) {
                await interaction.reply({ content: `<@&${role.id}> already can't earn XP.`, allowedMentions: { parse: [] } });
                return;
            }

            if (roles.length >= MAX_ROLES) {
                await interaction.reply({ content: `❌ You can block up to ${MAX_ROLES} roles. Remove one first.` });
                return;
            }

            roles.push(role.id);
            setConfig(guildId, { noXpRoles: roles });

            await interaction.reply({ content: `✅ Members with <@&${role.id}> won't earn XP from chat or voice.`, allowedMentions: { parse: [] } });
            return;
        }

        if (subcommand === 'remove') {
            const role = interaction.options.getRole('role');
            const index = roles.indexOf(role.id);

            if (index === -1) {
                await interaction.reply({ content: `<@&${role.id}> wasn't blocked from earning XP.`, allowedMentions: { parse: [] } });
                return;
            }

            roles.splice(index, 1);
            setConfig(guildId, { noXpRoles: roles });

            await interaction.reply({ content: `✅ Members with <@&${role.id}> can earn XP again.`, allowedMentions: { parse: [] } });
            return;
        }

        if (subcommand === 'list') {
            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('🚫 No-XP Roles')
                .setDescription(roles.length > 0 ? roles.map(roleId => `<@&${roleId}>`).join('\n') : 'Every role earns XP. Block one with `/noxp add`.');

            await interaction.reply({ embeds: [embed] });
        }
    }
};
