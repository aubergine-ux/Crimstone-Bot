const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roleinfo')
        .setDescription('View information about a role.')
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('The role to look up')
                .setRequired(true)
        ),
    async execute(interaction) {
        const role = interaction.options.getRole('role');

        const created = Math.floor(role.createdTimestamp / 1000);
        const memberCount = role.members.size;
        const hexColor = role.hexColor.toUpperCase();

        const embed = new EmbedBuilder()
            .setColor(role.color || 0x99AAB5)
            .setTitle(`Role: ${role.name}`)
            .addFields(
                { name: 'Members', value: `${memberCount}`, inline: true },
                { name: 'Color', value: hexColor, inline: true },
                { name: 'Position', value: `${role.position}`, inline: true },
                { name: 'Mentionable', value: role.mentionable ? 'Yes' : 'No', inline: true },
                { name: 'Displayed separately', value: role.hoist ? 'Yes' : 'No', inline: true },
                { name: 'Managed by integration', value: role.managed ? 'Yes' : 'No', inline: true },
                { name: 'Created', value: `<t:${created}:D> (<t:${created}:R>)` },
                { name: 'Role ID', value: role.id },
            );

        await interaction.reply({ embeds: [embed] });
    }
};