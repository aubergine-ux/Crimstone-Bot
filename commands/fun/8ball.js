const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('8ball')
        .setDescription('Ask the Magic 8-Ball an Question!')
        .addStringOption(option =>
            option.setName('question')
                .setDescription('Your Yes/No Question')
                .setRequired(true)
        ),
    async execute(interaction) {
        const question = interaction.options.getString('question');

        const responses = [
            'It is certain.',
            'Without a doubt.',
            'Yes, definitely.',
            'You may rely on it.',
            'Most likely.',
            'Signs point to yes.',
            'Ask again later.',
            'Don\'t count on it.',
            'My reply is no.',
            'Very doubtful.',
            'Outlook not so good.',
        ];

        const answer = responses[Math.floor(Math.random() * responses.length)];

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🎱 Magic 8-Ball')
            .addFields(
                { name: 'Question', value: question },
                { name: 'Answer', value: answer },
            );

        await interaction.reply({ embeds: [embed] });
    }
};