const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuildRoles, setLevelRole, removeLevelRole, setStackMode } = require('../utility/levelRoles.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('levelrole')
        .setDescription('Manage roles given out at certain levels.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addSubcommand(subcommand =>
            subcommand.setName('add')
                .setDescription('Give a role when members reach a level')
                .addIntegerOption(option =>
                    option.setName('level').setDescription('The level that unlocks the role').setRequired(true).setMinValue(1))
                .addRoleOption(option =>
                    option.setName('role').setDescription('The role to hand out').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand.setName('remove')
                .setDescription('Stop giving out a role at a level')
                .addIntegerOption(option =>
                    option.setName('level').setDescription('The level to clear').setRequired(true).setMinValue(1)))
        .addSubcommand(subcommand =>
            subcommand.setName('list')
                .setDescription('See every level reward'))
        .addSubcommand(subcommand =>
            subcommand.setName('mode')
                .setDescription('Keep every reward, or only the highest one')
                .addStringOption(option =>
                    option.setName('style')
                        .setDescription('How rewards accumulate')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Highest only', value: 'highest' },
                            { name: 'Stack all', value: 'stack' },
                        ))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (subcommand === 'add') {
            const level = interaction.options.getInteger('level');
            const role = interaction.options.getRole('role');

            if (role.managed) {
                await interaction.reply({ content: '❌ That role belongs to a bot or integration, so it can\'t be handed out.' });
                return;
            }

            if (role.id === interaction.guild.id) {
                await interaction.reply({ content: '❌ That\'s the @everyone role — pick a real role.' });
                return;
            }

            const me = interaction.guild.members.me;

            if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) {
                await interaction.reply({ content: '❌ I need the Manage Roles permission before I can hand out rewards.' });
                return;
            }

            if (role.position >= me.roles.highest.position) {
                await interaction.reply({ content: `❌ **${role.name}** sits above my highest role, so I can't assign it. Drag my role above it in Server Settings.` });
                return;
            }

            setLevelRole(guildId, level, role.id);

            await interaction.reply({ content: `✅ Members reaching level **${level}** will now get <@&${role.id}>.` });
            return;
        }

        if (subcommand === 'remove') {
            const level = interaction.options.getInteger('level');
            const { roles } = getGuildRoles(guildId);

            if (!roles[level]) {
                await interaction.reply({ content: `There's no reward set for level **${level}**.` });
                return;
            }

            removeLevelRole(guildId, level);

            await interaction.reply({ content: `✅ Removed the level **${level}** reward.` });
            return;
        }

        if (subcommand === 'list') {
            const { stack, roles } = getGuildRoles(guildId);

            const thresholds = Object.keys(roles)
                .map(key => parseInt(key, 10))
                .sort((a, b) => a - b);

            if (thresholds.length === 0) {
                await interaction.reply({ content: 'No level rewards are set up yet. Add one with `/levelrole add`.' });
                return;
            }

            const lines = thresholds.map(level => `**Level ${level}** — <@&${roles[level]}>`);

            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('🎖️ Level Rewards')
                .setDescription(lines.join('\n'))
                .setFooter({ text: stack ? 'Mode: members keep every reward' : 'Mode: members keep only their highest reward' });

            await interaction.reply({ embeds: [embed] });
            return;
        }

        if (subcommand === 'mode') {
            const style = interaction.options.getString('style');

            setStackMode(guildId, style === 'stack');

            if (style === 'stack') {
                await interaction.reply({ content: '✅ Members will keep every reward role they earn.' });
            } else {
                await interaction.reply({ content: '✅ Members will only keep their highest reward role.' });
            }
        }
    }
};
