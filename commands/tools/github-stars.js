const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stars')
        .setDescription('Check how many Stars a GitHub Repo has')
        .addStringOption(option =>
            option.setName('repo')
                .setDescription('The Repo in owner/name format, e.g. discordjs/discord.js')
                .setRequired(true)
        ),

    async execute(interaction) {

        const repoInput = interaction.options.getString('repo');

        if (!repoInput.includes('/')) {
            return await interaction.reply({ content: 'Please use the format `owner/repo`, e.g. `discordjs/discord.js`.', ephemeral: true });
        }

        await interaction.deferReply();

        try {
            const response = await fetch(`https://api.github.com/repos/${repoInput}`);

            if (response.status === 404) {
                return await interaction.editReply('Could not find that Repo. Check the spelling?');
            }
            if (!response.ok) {
                return await interaction.editReply(`GitHub returned an Error (Status ${response.status}). Try again later.`);
            }

            const repo = await response.json();

            await interaction.editReply(`**${repo.full_name}** has ⭐ **${repo.stargazers_count.toLocaleString()}** Stars!`);
        } catch (error) {
            console.error(error);
            await interaction.editReply('There was an error talking to GitHub.');
        }
    }
};