const {
    SlashCommandBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle,
    ActionRowBuilder, ChannelType, PermissionFlagsBits, MessageFlags, InteractionContextType,
} = require('discord.js');

const HEX_PATTERN = /^#?[0-9A-Fa-f]{6}$/;

const field = (id, label, style, required, maxLength, placeholder) => {
    const input = new TextInputBuilder()
        .setCustomId(id)
        .setLabel(label)
        .setStyle(style)
        .setRequired(required)
        .setMaxLength(maxLength);

    if (placeholder) input.setPlaceholder(placeholder);

    return new ActionRowBuilder().addComponents(input);
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Build a rich embed and post it.')
        .setContexts(InteractionContextType.Guild)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Where to post it (defaults to here)')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false)
        ),

    async execute(interaction) {
        const channel = interaction.options.getChannel('channel') || interaction.channel;

        const modal = new ModalBuilder()
            .setCustomId(`embed:${channel.id}`)
            .setTitle('Build an embed')
            .addComponents(
                field('title', 'Title', TextInputStyle.Short, true, 256),
                field('description', 'Description', TextInputStyle.Paragraph, true, 4000),
                field('color', 'Colour (hex)', TextInputStyle.Short, false, 7, '#5865F2'),
                field('image', 'Image URL', TextInputStyle.Short, false, 500, 'https://...'),
                field('footer', 'Footer', TextInputStyle.Short, false, 2048),
            );

        await interaction.showModal(modal);
    },

    async modalSubmit(interaction) {
        const channelId = interaction.customId.split(':')[1];
        const channel = interaction.guild.channels.cache.get(channelId) || interaction.channel;

        const title = interaction.fields.getTextInputValue('title');
        const description = interaction.fields.getTextInputValue('description');
        const color = interaction.fields.getTextInputValue('color').trim();
        const image = interaction.fields.getTextInputValue('image').trim();
        const footer = interaction.fields.getTextInputValue('footer').trim();

        if (color && !HEX_PATTERN.test(color)) {
            await interaction.reply({
                content: '❌ That colour is not a 6-digit hex code, for example `#5865F2`.',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        if (image && !/^https?:\/\//i.test(image)) {
            await interaction.reply({
                content: '❌ The image needs to be a link starting with `http://` or `https://`.',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const canPost = channel.permissionsFor(interaction.guild.members.me)?.has([
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.EmbedLinks,
        ]);

        if (!canPost) {
            await interaction.reply({
                content: `❌ I cannot post embeds in <#${channel.id}>.`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const builtEmbed = new EmbedBuilder()
            .setColor(color ? parseInt(color.replace('#', ''), 16) : 0x5865F2)
            .setTitle(title)
            .setDescription(description);

        if (image) builtEmbed.setImage(image);
        if (footer) builtEmbed.setFooter({ text: footer });

        try {
            await channel.send({ embeds: [builtEmbed] });

            await interaction.reply({
                content: `✅ Embed posted in <#${channel.id}>.`,
                flags: MessageFlags.Ephemeral,
            });
        } catch (error) {
            console.error('Failed to post embed:', error.message);

            await interaction.reply({
                content: '❌ Something went wrong posting that embed.',
                flags: MessageFlags.Ephemeral,
            });
        }
    }
};
