const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('poll')
        .setDescription('Create a Yes/No Poll')
        .addStringOption(option =>
            option.setName('question')
                .setDescription('Poll Question')
                .setRequired(true)
        ),
    async execute(interaction) {
        const question = interaction.options.getString('question');

        const pollEmbed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('📊 New Poll')
            .setDescription(question)
            .setFooter({ text: `Poll by ${interaction.user.username}` })
            .setTimestamp();

        await interaction.reply({embeds: [pollEmbed] });

        const pollMessage = await interaction.fetchReply();

        await pollMessage.react('👍');
        await pollMessage.react('👎');
    }
};