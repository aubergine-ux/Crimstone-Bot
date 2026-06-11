const { REST, Routes } = require('discord.js');
const { clientId, guildId, token } = require('./config.json');

const commands = [
    require('./commands/utility/reload.js').data.toJSON(),
];

const rest = new REST().setToken(token);

(async () => {
    try {
        console.log('Registering private commands...');
        await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands },
        );
        console.log('Done!');
    } catch (error) {
        console.error(error);
    }
})();


// This Part was done by CLAUDE, sorry!