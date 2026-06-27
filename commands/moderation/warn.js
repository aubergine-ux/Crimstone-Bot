const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Sends a Server User a Warning')
        .addUserOption(option =>
            option.setName('target').setDescription('The User to be Warned.').setRequired(true))
        .addStringOption(option =>
            option.setName('reason').setDescription('The Reason for the Warning').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    
    async execute(interaction) {

        const user = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason');

        try {
            await user.send(`You have been warned in **${interaction.guild.name}** for: ${reason}`);
            await interaction.reply({ content: `User **${user.tag}** Has Been Warned` });
        } catch (error) {
            // Send a message back to the user
            await interaction.reply({ content: `Could not DM **${user.tag}** (DMs turned off), but the warning has been logged ${reason}` });
        }
    },
};
