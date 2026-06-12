const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('announce')
        .setDescription('Sends an Announcement in the Desired Channel')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addStringOption((option) =>
            option
                .setName('input')
                .setDescription('The input to announce back')
                .setRequired(true)
                .setMaxLength(2_000),
        )
        .addChannelOption((option) =>
            option
                .setName('channel')
                .setDescription('The channel to announce into')
                .addChannelTypes(ChannelType.GuildText),
        )
        .addBooleanOption((option) =>
            option
                .setName('embed')
                .setDescription('Whether or not the announcement should be embedded'),
        ),
    async execute(interaction) {
        const input = interaction.options.getString('input');
        const channel = interaction.options.getChannel('channel') ?? interaction.channel;
        const embed = interaction.options.getBoolean('embed') ?? false;

        if (embed) {
            await channel.send({ embeds: [{ description: input }] });
        } else {
            await channel.send(input);
        }

        // Acknowledge the interaction if echoing to a different channel
        if (channel.id !== interaction.channel.id) {
            await interaction.reply({ content: `Message sent to ${channel}!`, ephemeral: true });
        } else {
            await interaction.reply({ content: 'Done!', ephemeral: true });
        }
    },
}