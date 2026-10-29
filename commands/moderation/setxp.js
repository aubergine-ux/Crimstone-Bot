const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, InteractionContextType } = require('discord.js');
const { setXp } = require('../utility/levelStore.js');
const { getLevelFromXp } = require('../utility/levelMath.js');
const { syncLevelRoles } = require('../utility/applyLevelRoles.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setxp')
        .setDescription('Set a user\'s XP to an exact amount.')
        .setContexts(InteractionContextType.Guild)
        .addUserOption(option =>
            option.setName('target').setDescription('The user to modify').setRequired(true))
        .addIntegerOption(option =>
            option.setName('amount').setDescription('The XP value to set').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const user = interaction.options.getUser('target');
        const amount = interaction.options.getInteger('amount');
        const guildId = interaction.guild.id;

        if (amount < 0) {
            await interaction.reply({ content: 'XP cannot be negative.' });
            return;
        }

        setXp(guildId, user.id, amount);

        const { level } = getLevelFromXp(amount);

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setDescription(`✅ Set **${user.username}**'s XP to **${amount}** (Level ${level}).`);

        await interaction.reply({ embeds: [embed] });

        const member = interaction.options.getMember('target');

        if (member) await syncLevelRoles(member);
    }
};