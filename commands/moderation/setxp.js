const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { readLevels, writeLevels } = require('../utility/levelStore.js');
const { getLevelFromXp } = require('../utility/levelMath.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setxp')
        .setDescription('Set a user\'s XP to an exact amount.')
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

        const levels = readLevels();

        if (!levels[guildId]) levels[guildId] = {};
        levels[guildId][user.id] = amount;

        writeLevels(levels);

        const { level } = getLevelFromXp(amount);

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setDescription(`✅ Set **${user.username}**'s XP to **${amount}** (Level ${level}).`);

        await interaction.reply({ embeds: [embed] });
    }
};