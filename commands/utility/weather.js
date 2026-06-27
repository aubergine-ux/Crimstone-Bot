const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('weather')
        .setDescription('Check current Weather in any City.')
        .addStringOption(option =>
            option.setName('location')
                .setDescription('City or Area (E.g., New York, Tirana, London')
                .setRequired(true)
        ),
    async execute(interaction) {
        const location = interaction.options.getString('location');

        await interaction.deferReply();

        try {
            const response = await fetch(`https://wttr.in/${encodeURIComponent(location)}?format=j1`);
            
            if (!response.ok) throw new Error('Weather data unavailable');
            
            const weatherData = await response.json();

            const currentCondition = weatherData.current_condition[0];
            const nearestArea = weatherData.nearest_area[0];

            const tempC = currentCondition.temp_C;
            const tempF = currentCondition.temp_F;
            const conditionText = currentCondition.weatherDesc[0].value;
            const humidity = currentCondition.humidity;
            const cityName = nearestArea.areaName[0].value;
            const country = nearestArea.country[0].value;

            await interaction.editReply({
                content: `🌤️ **Current Weather for ${cityName}, ${country}** 🌤️\n\n` +
                         `**Condition:** ${conditionText}\n` +
                         `**Temperature:** ${tempC}°C (${tempF}°F)\n` +
                         `**Humidity:** ${humidity}%`
            });

        } catch (error) {
            console.error(error);
            await interaction.editReply({
                content: `❌ Sorry, I couldn't find Weather Data for "${location}". Please make sure the name is spelled correctly.`
            });
        }
    }
};
