const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('translate')
        .setDescription('Translate text into another language.')
        .addStringOption(option =>
            option.setName('text')
                .setDescription('The text to translate')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('to')
                .setDescription('Target language')
                .setRequired(true)
                .addChoices(
                    { name: 'English', value: 'en' },
                    { name: 'Albanian', value: 'sq' },
                    { name: 'Spanish', value: 'es' },
                    { name: 'French', value: 'fr' },
                    { name: 'German', value: 'de' },
                    { name: 'Italian', value: 'it' },
                    { name: 'Russian', value: 'ru' },
                    { name: 'Japanese', value: 'ja' },
                )),
    async execute(interaction) {
        const text = interaction.options.getString('text');
        const target = interaction.options.getString('to');

        await interaction.deferReply();

        try {
            const response = await fetch(`https://lingva.ml/api/v1/auto/${target}/${encodeURIComponent(text)}`);

            if (!response.ok) throw new Error('Translation failed');

            const data = await response.json();
            const translated = data.translation;

            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('🌐 Translation')
                .addFields(
                    { name: 'Original', value: text },
                    { name: 'Translated', value: translated },
                );

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error(error);
            await interaction.editReply({
                content: '❌ Translation failed. The service may be down or the text couldn\'t be translated.'
            });
        }
    }
};