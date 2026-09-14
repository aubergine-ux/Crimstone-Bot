const { Events } = require('discord.js');
const { sendAudit, auditEmbed, trim } = require('../commands/utility/auditLog.js');

module.exports = [
    {
        name: Events.GuildUpdate,

        async execute(before, after) {
            const changes = [];

            if (before.name !== after.name) {
                changes.push({ name: 'Name', value: `${trim(before.name, 100)} → ${trim(after.name, 100)}` });
            }

            if (before.iconURL() !== after.iconURL()) {
                changes.push({ name: 'Icon', value: 'The server icon was changed.' });
            }

            if (before.ownerId !== after.ownerId) {
                changes.push({ name: 'Owner', value: `<@${before.ownerId}> → <@${after.ownerId}>` });
            }

            if (before.premiumTier !== after.premiumTier) {
                changes.push({ name: 'Boost level', value: `${before.premiumTier} → ${after.premiumTier}` });
            }

            if (changes.length === 0) return;

            const embed = auditEmbed('server', 'Server updated', 'update').addFields(changes);

            await sendAudit(after, 'server', embed);
        },
    },
    {
        name: Events.GuildEmojiCreate,

        async execute(emoji) {
            const embed = auditEmbed('server', 'Emoji added', 'create')
                .setDescription(`**${emoji.name}**`)
                .setThumbnail(emoji.imageURL())
                .setFooter({ text: `Emoji ID: ${emoji.id}` });

            await sendAudit(emoji.guild, 'server', embed);
        },
    },
    {
        name: Events.GuildEmojiDelete,

        async execute(emoji) {
            const embed = auditEmbed('server', 'Emoji removed', 'remove')
                .setDescription(`**${emoji.name}**`)
                .setFooter({ text: `Emoji ID: ${emoji.id}` });

            await sendAudit(emoji.guild, 'server', embed);
        },
    },
];
