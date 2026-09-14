const { SlashCommandBuilder, EmbedBuilder, InteractionContextType } = require('discord.js');
const { getSnipes, clearSnipes, SNIPE_LIMIT } = require('../utility/snipeStore.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('snipe')
        .setDescription('Bring back a recently deleted message from this channel.')
        .setContexts(InteractionContextType.Guild)
        .addIntegerOption(option =>
            option.setName('index')
                .setDescription('How far back to look (1 is the most recent)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(SNIPE_LIMIT)
        )
        .addBooleanOption(option =>
            option.setName('clear')
                .setDescription('Forget the deleted messages kept for this channel')
                .setRequired(false)
        ),
    async execute(interaction) {
        const channelId = interaction.channel.id;

        if (interaction.options.getBoolean('clear')) {
            clearSnipes(channelId);
            await interaction.reply({ content: '✅ Cleared the sniped messages for this channel.' });
            return;
        }

        const index = interaction.options.getInteger('index') || 1;
        const snipes = getSnipes(channelId);

        if (snipes.length === 0) {
            await interaction.reply({ content: 'Nothing has been deleted here recently.' });
            return;
        }

        if (index > snipes.length) {
            await interaction.reply({ content: `I only kept ${snipes.length} deleted message(s) for this channel.` });
            return;
        }

        const snipe = snipes[index - 1];

        const snipeEmbed = new EmbedBuilder()
            .setColor(0x95A5A6)
            .setAuthor({ name: snipe.authorTag, iconURL: snipe.avatarUrl || undefined })
            .setDescription(snipe.content || '*No text — attachment only*')
            .setFooter({ text: `Message ${index} of ${snipes.length} · deleted` })
            .setTimestamp(snipe.timestamp);

        if (snipe.attachment) snipeEmbed.setImage(snipe.attachment);

        await interaction.reply({ embeds: [snipeEmbed] });
    }
};
