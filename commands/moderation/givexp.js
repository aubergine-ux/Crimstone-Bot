const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { readLevels, writeLevels } = require('../utility/levelStore.js');
const { getLevelFromXp } = require('../utility/levelMath.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('givexp')
        .setDescription('Add (or remove) XP from a user.')
        .addUserOption(option =>
            option.setName('target').setDescription('The user to modify').setRequired(true))
        .addIntegerOption(option =>
            option.setName('amount').setDescription('XP to add (use a negative number to remove)').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const user = interaction.options.getUser('target');
        const amount = interaction.options.getInteger('amount');
        const guildId = interaction.guild.id;

        const levels = readLevels();

        if (!levels[guildId]) levels[guildId] = {};
        if (!levels[guildId][user.id]) levels[guildId][user.id] = 0;

        levels[guildId][user.id] += amount;

        if (levels[guildId][user.id] < 0) levels[guildId][user.id] = 0;

        writeLevels(levels);

        const newTotal = levels[guildId][user.id];
        const { level } = getLevelFromXp(newTotal);

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setDescription(`✅ Gave **${user.username}** **${amount}** XP. New total: **${newTotal}** (Level ${level}).`);

        await interaction.reply({ embeds: [embed] });
    }
};