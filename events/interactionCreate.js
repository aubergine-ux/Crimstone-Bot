const { Events, MessageFlags, Collection } = require('discord.js');

function formatCommand(interaction) {
    const sub = interaction.options.getSubcommand(false);
    const group = interaction.options.getSubcommandGroup(false);
    const args = interaction.options.data
        .flatMap((o) => o.options ?? o)
        .flatMap((o) => o.options ?? o)
        .map((o) => `${o.name}:${o.value}`)
        .join(' ');

    return `/${interaction.commandName}${group ? ` ${group}` : ''}${sub ? ` ${sub}` : ''}${args ? ` ${args}` : ''}`;
}

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isChatInputCommand()) return;

        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        const { cooldowns } = interaction.client;

        if (!cooldowns.has(command.data.name)) {
            cooldowns.set(command.data.name, new Collection());
        }

        const now = Date.now();
        const timestamps = cooldowns.get(command.data.name);
        const defaultCooldownDuration = 3;
        const cooldownAmount = (command.cooldown ?? defaultCooldownDuration) * 1_000;

        if (timestamps.has(interaction.user.id)) {
            const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;
            if (now < expirationTime) {
                const expiredTimestamp = Math.round(expirationTime / 1_000);
                return interaction.reply({
                    content: `Please wait, you are on a cooldown for \`${command.data.name}\`. You can use it again <t:${expiredTimestamp}:R>.`,
                    flags: MessageFlags.Ephemeral,
                });
            }
        }

        timestamps.set(interaction.user.id, now);
        setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

        console.log(
            `[CMD] ${new Date().toISOString()} | ` +
            `${interaction.user.tag} (${interaction.user.id}) | ` +
            `${interaction.guild?.name ?? 'DM'} #${interaction.channel?.name ?? '-'} | ` +
            formatCommand(interaction)
        );

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(`[CMD ERROR] ${interaction.commandName} by ${interaction.user.tag}:`, error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: 'There was an error while executing this command!',
                    flags: MessageFlags.Ephemeral,
                });
            } else {
                await interaction.reply({
                    content: 'There was an error while executing this command!',
                    flags: MessageFlags.Ephemeral,
                });
            }
        }
    },
};