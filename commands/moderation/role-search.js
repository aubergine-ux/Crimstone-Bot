const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('role-search')
        .setDescription('List all Members in a specific Role.')
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Role you want to search for')
                .setRequired(true)
        ),
    async execute(interaction) {
        const role = interaction.options.getRole('role');
        const membersWithRole = role.members;

        if (membersWithRole.size === 0) {
            return await interaction.reply({
                content: `No Members found with the Role **${role.name}**.`,
                ephemeral: true
            });
        }

        const memberList = membersWithRole.map(member => `${member}`).join(', ');
        const responseHeader = `**Members with the Role ${role} (${membersWithRole.size}):**\n\n`;
        let finalResponse = responseHeader + memberList; 
        
        if (finalResponse.length > 2000) {
            const safeList = memberList.substring(0, 1900);
            finalResponse = responseHeader + safeList + `... *and more (list truncated due to Discord character limits).*`;
        }

        await interaction.reply({
            content: finalResponse
        });
    }
};