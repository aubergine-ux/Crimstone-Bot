const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('define')
        .setDescription('Search up the Definition of a Word!')
        .addStringOption(option =>
            option.setName('word')
                .setDescription('The Word you want to search up')
                .setRequired(true)
        ),
    async execute(interaction) {
        const word = interaction.options.getString('word');

        await interaction.deferReply();

        try {
            const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);

            if (!response.ok) throw new Error('Word not Found');

            const data = await response.json();
            const entry = data[0];

            const phonetic = entry.phonetic || '';
            const meanings = entry.meanings;

            const fields = [];

            meanings.forEach(meaning => {
                const partOfSpeech = meaning.partOfSpeech;
                const definitions = meaning.definitions;

                const defLines = [];

                definitions.slice(0, 3).forEach((def, index) => {
                    defLines.push(`${index + 1}. ${def.definition}`);
                });

                fields.push({
                    name: partOfSpeech,
                    value: defLines.join('\n'),
                });
            });

            const defineEmbed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle(`📖 ${entry.word}`)
                .setDescription(phonetic)
                .addFields(fields)
                .setFooter({ text: 'Data from dictionaryapi.dev' });

            await interaction.editReply({ embeds: [defineEmbed] });

        } catch (error) {
            console.error(error);
            await interaction.editReply({
                content: `Sorry, I couldn't find a Definition for "${word}". Please check the Spelling.`
            });
        }
    }
};