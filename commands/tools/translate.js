const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const LANGUAGES = {
    en: 'English',
    sq: 'Albanian',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    it: 'Italian',
    ru: 'Russian',
    ja: 'Japanese',
};

function truncate(text) {
    return text.length > 1024 ? `${text.slice(0, 1021)}...` : text;
}

async function translateWithGoogle(text, target) {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${target}&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    if (!response.ok) throw new Error(`Google responded with ${response.status}`);

    const data = await response.json();

    // data[0] is a list of translated segments, data[2] is the detected source language.
    const translated = data[0].map(segment => segment[0]).join('');

    return { translated, detected: data[2] };
}

async function translateWithMyMemory(text, target) {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(`Autodetect|${target}`)}`;
    const response = await fetch(url);

    if (!response.ok) throw new Error(`MyMemory responded with ${response.status}`);

    const data = await response.json();

    if (data.responseStatus !== 200) throw new Error(data.responseDetails || 'MyMemory rejected the request');

    return { translated: data.responseData.translatedText, detected: null };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('translate')
        .setDescription('Translate text into another language.')
        .addStringOption(option =>
            option.setName('text')
                .setDescription('The text to Translate')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('to')
                .setDescription('Target language')
                .setRequired(true)
                .addChoices(
                    ...Object.entries(LANGUAGES).map(([value, name]) => ({ name, value })),
                )),
    async execute(interaction) {
        const text = interaction.options.getString('text');
        const target = interaction.options.getString('to');

        await interaction.deferReply();

        try {
            let result;

            try {
                result = await translateWithGoogle(text, target);
            } catch (error) {
                console.error('Google translate failed, falling back to MyMemory:', error);
                result = await translateWithMyMemory(text, target);
            }

            if (!result.translated) throw new Error('Translation came back empty');

            const from = LANGUAGES[result.detected] || result.detected || 'Auto-detected';

            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('🌐 Translation')
                .addFields(
                    { name: `Original (${from})`, value: truncate(text) },
                    { name: `Translated (${LANGUAGES[target]})`, value: truncate(result.translated) },
                );

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error(error);
            await interaction.editReply({
                content: '❌ Translation failed. The service may be down or the text couldn\'t be Translated.'
            });
        }
    }
};
