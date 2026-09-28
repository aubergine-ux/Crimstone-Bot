const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, PermissionFlagsBits, ChannelType, InteractionContextType, MessageFlags } = require('discord.js');
const { getTicketConfig, setTicketConfig, nextTicketNumber, addOpenTicket, removeOpenTicket, ticketInChannel, ticketOpenedBy } = require('../utility/ticketStore.js');

const TRANSCRIPT_LIMIT = 1000;
const CLOSE_DELAY = 5000;

const MEMBER_ACCESS = [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.ReadMessageHistory,
    PermissionFlagsBits.AttachFiles,
    PermissionFlagsBits.EmbedLinks,
];

const closeRow = () => {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket:close').setLabel('Close Ticket').setEmoji('🔒').setStyle(ButtonStyle.Danger),
    );
};

const isStaff = (member, config) => {
    return member.permissions.has(PermissionFlagsBits.ManageChannels)
        || (config.supportRoleId && member.roles.cache.has(config.supportRoleId));
};

const buildTranscript = async (channel) => {
    const messages = [];

    let before;

    while (messages.length < TRANSCRIPT_LIMIT) {
        const batch = await channel.messages.fetch({ limit: 100, before: before });

        if (batch.size === 0) break;

        messages.push(...batch.values());
        before = batch.last().id;
    }

    const lines = messages.reverse().map(message => {
        const attachments = message.attachments.map(attachment => attachment.url).join(' ');
        const embeds = message.embeds.length > 0 ? ` [${message.embeds.length} embed(s)]` : '';

        return `[${message.createdAt.toISOString()}] ${message.author.username}: ${message.content}${attachments ? ` ${attachments}` : ''}${embeds}`;
    });

    return new AttachmentBuilder(Buffer.from(lines.join('\n'), 'utf8'), { name: `${channel.name}-transcript.txt` });
};

const openTicket = async (interaction) => {
    const guild = interaction.guild;
    const config = getTicketConfig(guild.id);

    if (!config.categoryId || !guild.channels.cache.get(config.categoryId)) {
        await interaction.reply({ content: '❌ Tickets aren\'t set up yet. Ask a moderator to run `/ticket setup`.', flags: MessageFlags.Ephemeral });
        return;
    }

    const existing = ticketOpenedBy(guild.id, interaction.user.id);

    if (existing) {
        if (guild.channels.cache.get(existing.channelId)) {
            await interaction.reply({ content: `You already have a ticket open: <#${existing.channelId}>`, flags: MessageFlags.Ephemeral });
            return;
        }

        removeOpenTicket(guild.id, existing.channelId);
    }

    if (!guild.members.me.permissions.has([PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles])) {
        await interaction.reply({ content: '❌ I need the Manage Channels and Manage Roles permissions to open tickets.', flags: MessageFlags.Ephemeral });
        return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const number = nextTicketNumber(guild.id);

    const overwrites = [
        { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: interaction.user.id, allow: MEMBER_ACCESS },
        { id: guild.members.me.id, allow: [...MEMBER_ACCESS, PermissionFlagsBits.ManageChannels] },
    ];

    if (config.supportRoleId) overwrites.push({ id: config.supportRoleId, allow: MEMBER_ACCESS });

    let channel;

    try {
        channel = await guild.channels.create({
            name: `ticket-${String(number).padStart(4, '0')}`,
            type: ChannelType.GuildText,
            parent: config.categoryId,
            topic: `Ticket #${number} opened by ${interaction.user.username} (${interaction.user.id})`,
            permissionOverwrites: overwrites,
        });
    } catch (error) {
        console.error('Failed to create a ticket channel:', error.message);
        await interaction.editReply({ content: '❌ I couldn\'t create the ticket channel. Check my permissions in the ticket category.' });
        return;
    }

    addOpenTicket(guild.id, channel.id, { userId: interaction.user.id, number: number, openedAt: Date.now() });

    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`🎫 Ticket #${number}`)
        .setDescription('Thanks for reaching out! Tell us what you need and someone will be with you soon.\nPress **Close Ticket** when you\'re done.');

    const pings = [`<@${interaction.user.id}>`];

    if (config.supportRoleId) pings.push(`<@&${config.supportRoleId}>`);

    await channel.send({
        content: pings.join(' '),
        embeds: [embed],
        components: [closeRow()],
        allowedMentions: { users: [interaction.user.id], roles: config.supportRoleId ? [config.supportRoleId] : [] },
    });

    await interaction.editReply({ content: `✅ Your ticket is open: <#${channel.id}>` });
};

const closeTicket = async (interaction, reason) => {
    const guild = interaction.guild;
    const channel = interaction.channel;
    const config = getTicketConfig(guild.id);
    const ticket = ticketInChannel(guild.id, channel.id);

    if (!ticket) {
        await interaction.reply({ content: '❌ This isn\'t a ticket channel.', flags: MessageFlags.Ephemeral });
        return;
    }

    if (ticket.userId !== interaction.user.id && !isStaff(interaction.member, config)) {
        await interaction.reply({ content: '❌ Only the ticket owner or support staff can close this ticket.', flags: MessageFlags.Ephemeral });
        return;
    }

    await interaction.reply({ content: `🔒 Closing this ticket in ${CLOSE_DELAY / 1000} seconds...` });

    removeOpenTicket(guild.id, channel.id);

    let transcript = null;

    try {
        transcript = await buildTranscript(channel);
    } catch (error) {
        console.error('Failed to build a ticket transcript:', error.message);
    }

    const embed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle(`🎫 Ticket #${ticket.number} closed`)
        .addFields(
            { name: 'Opened by', value: `<@${ticket.userId}>`, inline: true },
            { name: 'Closed by', value: `<@${interaction.user.id}>`, inline: true },
            { name: 'Opened', value: `<t:${Math.floor(ticket.openedAt / 1000)}:R>`, inline: true },
            { name: 'Reason', value: reason || 'No reason given' },
        )
        .setTimestamp();

    const logChannel = config.logChannelId ? guild.channels.cache.get(config.logChannelId) : null;

    if (logChannel) {
        try {
            await logChannel.send({ embeds: [embed], files: transcript ? [transcript] : [] });
        } catch (error) {
            console.error('Failed to log a closed ticket:', error.message);
        }
    }

    try {
        const opener = await interaction.client.users.fetch(ticket.userId);
        await opener.send({ content: `Your ticket in **${guild.name}** was closed.`, embeds: [embed], files: transcript ? [transcript] : [] });
    } catch {
        // DMs closed.
    }

    setTimeout(() => {
        channel.delete(`Ticket #${ticket.number} closed by ${interaction.user.username}`)
            .catch(error => console.error('Failed to delete a ticket channel:', error.message));
    }, CLOSE_DELAY);
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Private support tickets members open with a button.')
        .setContexts(InteractionContextType.Guild)
        .addSubcommand(subcommand =>
            subcommand.setName('setup')
                .setDescription('Choose where tickets go and who answers them (Manage Server)')
                .addChannelOption(option =>
                    option.setName('category').setDescription('The category new tickets are created in')
                        .addChannelTypes(ChannelType.GuildCategory).setRequired(true))
                .addRoleOption(option =>
                    option.setName('support_role').setDescription('The role that can see and answer tickets'))
                .addChannelOption(option =>
                    option.setName('log_channel').setDescription('Where closed tickets and transcripts are posted')
                        .addChannelTypes(ChannelType.GuildText)))
        .addSubcommand(subcommand =>
            subcommand.setName('panel')
                .setDescription('Post the "Open a Ticket" button (Manage Server)')
                .addChannelOption(option =>
                    option.setName('channel').setDescription('Where to post the panel')
                        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement).setRequired(true))
                .addStringOption(option =>
                    option.setName('title').setDescription('The panel heading').setMaxLength(256))
                .addStringOption(option =>
                    option.setName('description').setDescription('The panel text').setMaxLength(2000)))
        .addSubcommand(subcommand =>
            subcommand.setName('close')
                .setDescription('Close this ticket')
                .addStringOption(option =>
                    option.setName('reason').setDescription('Why it was closed').setMaxLength(500)))
        .addSubcommand(subcommand =>
            subcommand.setName('add')
                .setDescription('Add someone to this ticket')
                .addUserOption(option =>
                    option.setName('user').setDescription('Who to add').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand.setName('remove')
                .setDescription('Remove someone from this ticket')
                .addUserOption(option =>
                    option.setName('user').setDescription('Who to remove').setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;
        const config = getTicketConfig(guildId);

        if (subcommand === 'setup' || subcommand === 'panel') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
                await interaction.reply({ content: '❌ You need the Manage Server permission for that.', flags: MessageFlags.Ephemeral });
                return;
            }
        }

        if (subcommand === 'setup') {
            const category = interaction.options.getChannel('category');
            const role = interaction.options.getRole('support_role');
            const logChannel = interaction.options.getChannel('log_channel');

            setTicketConfig(guildId, {
                categoryId: category.id,
                supportRoleId: role ? role.id : null,
                logChannelId: logChannel ? logChannel.id : null,
            });

            const lines = [`✅ New tickets will open in **${category.name}**.`];

            lines.push(role ? `<@&${role.id}> can see and answer every ticket.` : 'Only members with Manage Channels can answer tickets.');
            lines.push(logChannel ? `Transcripts will be posted in <#${logChannel.id}>.` : 'Transcripts will only be sent to the ticket owner.');
            lines.push('Post the button with `/ticket panel`.');

            await interaction.reply({ content: lines.join('\n'), allowedMentions: { parse: [] } });
            return;
        }

        if (subcommand === 'panel') {
            if (!config.categoryId) {
                await interaction.reply({ content: '❌ Run `/ticket setup` first.', flags: MessageFlags.Ephemeral });
                return;
            }

            const channel = interaction.options.getChannel('channel');

            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle(interaction.options.getString('title') || '🎫 Need help?')
                .setDescription(interaction.options.getString('description') || 'Press the button below to open a private ticket with the staff team.');

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket:open').setLabel('Open a Ticket').setEmoji('📩').setStyle(ButtonStyle.Primary),
            );

            try {
                await channel.send({ embeds: [embed], components: [row] });
            } catch {
                await interaction.reply({ content: `❌ I can't post in <#${channel.id}>.`, flags: MessageFlags.Ephemeral });
                return;
            }

            await interaction.reply({ content: `✅ Ticket panel posted in <#${channel.id}>.`, flags: MessageFlags.Ephemeral });
            return;
        }

        if (subcommand === 'close') {
            await closeTicket(interaction, interaction.options.getString('reason'));
            return;
        }

        const ticket = ticketInChannel(guildId, interaction.channel.id);

        if (!ticket) {
            await interaction.reply({ content: '❌ This isn\'t a ticket channel.', flags: MessageFlags.Ephemeral });
            return;
        }

        if (!isStaff(interaction.member, config)) {
            await interaction.reply({ content: '❌ Only support staff can change who\'s in a ticket.', flags: MessageFlags.Ephemeral });
            return;
        }

        const user = interaction.options.getUser('user');

        if (subcommand === 'add') {
            await interaction.channel.permissionOverwrites.edit(user.id, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true,
                AttachFiles: true,
                EmbedLinks: true,
            });

            await interaction.reply({ content: `✅ Added <@${user.id}> to this ticket.` });
            return;
        }

        if (subcommand === 'remove') {
            if (user.id === ticket.userId) {
                await interaction.reply({ content: '❌ You can\'t remove the ticket owner. Close the ticket instead.', flags: MessageFlags.Ephemeral });
                return;
            }

            await interaction.channel.permissionOverwrites.delete(user.id);
            await interaction.reply({ content: `✅ Removed <@${user.id}> from this ticket.`, allowedMentions: { parse: [] } });
        }
    },

    async button(interaction) {
        const action = interaction.customId.split(':')[1];

        if (action === 'open') {
            await openTicket(interaction);
            return;
        }

        if (action === 'close') {
            await closeTicket(interaction, null);
        }
    },
};
