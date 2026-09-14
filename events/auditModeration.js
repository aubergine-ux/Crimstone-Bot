const { Events } = require('discord.js');
const { sendAudit, auditEmbed, trim } = require('../commands/utility/auditLog.js');

module.exports = [
    {
        name: Events.GuildBanAdd,

        async execute(ban) {
            const embed = auditEmbed('moderation', 'Member banned', 'remove')
                .setDescription(`<@${ban.user.id}> — **${ban.user.username}**`)
                .setThumbnail(ban.user.displayAvatarURL())
                .addFields({ name: 'Reason', value: trim(ban.reason, 1024) })
                .setFooter({ text: `User ID: ${ban.user.id}` });

            await sendAudit(ban.guild, 'moderation', embed);
        },
    },
    {
        name: Events.GuildBanRemove,

        async execute(ban) {
            const embed = auditEmbed('moderation', 'Member unbanned', 'create')
                .setDescription(`<@${ban.user.id}> — **${ban.user.username}**`)
                .setThumbnail(ban.user.displayAvatarURL())
                .setFooter({ text: `User ID: ${ban.user.id}` });

            await sendAudit(ban.guild, 'moderation', embed);
        },
    },
];
