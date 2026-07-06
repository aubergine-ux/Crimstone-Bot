const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('github-track')
        .setDescription('Track a GitHub Repository LIVE through a Webhook.')
        .addStringOption(option =>
            option.setName('repository_url')
                .setDescription('Full URL of your GitHub Repository.')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageWebhooks),
    async execute(interaction) {
        const repoUrl = interaction.options.getString('repository_url');
        const channel = interaction.channel;

        await interaction.deferReply({ ephemeral: true });

        try {
            const webhook = await channel.createWebhook({
                name: 'Github Tracker',
                avatar: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
                reason: 'Tracking Repository: ${repoUrl}'
            });

            const githubCompatibleUrl = `${webhook.url}/github`;

            await interaction.editReply({
                content: `Webhook Created Successfully!\n` +
                         `I have set up a tracking hook for this channel. To activate the live feed, follow these steps:\n\n` +
                         `**1:** Go to your GitHub Repository.\n` +
                         
                         `**2:** Click **Settings** -> **Webhooks** -> **Add Webhook**.\n` +
                         `**3:** Paste this exact link into the **Payload URL** field:\n` +
                         `\`\`\`\n${githubCompatibleUrl}\n\`\`\`\n` +
                         `**4:** Change the **Content type** dropdown setting to: \`application/json\`.\n` +
                         `**5:** Under "Which events would you like to trigger this webhook?", select **Send me everything** or pick individual items like Issues and Pull Requests.\n` +
                         `**6:** Click **Add webhook** at the bottom!`
            });

        } catch (error) {
            console.error(error);
            await interaction.editReply({
                content: '❌ Failed to create the Tracker. Grant me the **Manage Webhooks** Permission in this Server!'
            })
        }
    },
};