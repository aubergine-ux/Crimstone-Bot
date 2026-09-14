const { Events } = require('discord.js');
const { sendAudit, auditEmbed, trim } = require('../commands/utility/auditLog.js');

const roleNames = (roles) => roles.map(role => `<@&${role.id}>`).join(', ');

module.exports = [
    {
        name: Events.GuildMemberAdd,

        async execute(member) {
            const createdAt = Math.floor(member.user.createdTimestamp / 1000);

            const embed = auditEmbed('members', 'Member joined', 'create')
                .setDescription(`<@${member.id}> — **${member.user.username}**`)
                .setThumbnail(member.user.displayAvatarURL())
                .addFields(
                    { name: 'Account created', value: `<t:${createdAt}:R>`, inline: true },
                    { name: 'Member count', value: String(member.guild.memberCount), inline: true },
                )
                .setFooter({ text: `User ID: ${member.id}` });

            await sendAudit(member.guild, 'members', embed);
        },
    },
    {
        name: Events.GuildMemberRemove,

        async execute(member) {
            const joinedAt = member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown';

            const embed = auditEmbed('members', 'Member left', 'remove')
                .setDescription(`<@${member.id}> — **${member.user.username}**`)
                .setThumbnail(member.user.displayAvatarURL())
                .addFields(
                    { name: 'Joined', value: joinedAt, inline: true },
                    { name: 'Member count', value: String(member.guild.memberCount), inline: true },
                )
                .setFooter({ text: `User ID: ${member.id}` });

            await sendAudit(member.guild, 'members', embed);
        },
    },
    {
        name: Events.GuildMemberUpdate,

        async execute(before, after) {
            if (before.nickname !== after.nickname) {
                const embed = auditEmbed('members', 'Nickname changed', 'update')
                    .setDescription(`<@${after.id}> — **${after.user.username}**`)
                    .addFields(
                        { name: 'Before', value: trim(before.nickname, 256), inline: true },
                        { name: 'After', value: trim(after.nickname, 256), inline: true },
                    )
                    .setFooter({ text: `User ID: ${after.id}` });

                await sendAudit(after.guild, 'members', embed);
            }

            const added = after.roles.cache.filter(role => !before.roles.cache.has(role.id));
            const removed = before.roles.cache.filter(role => !after.roles.cache.has(role.id));

            if (added.size === 0 && removed.size === 0) return;

            const embed = auditEmbed('roles', 'Member roles updated', 'update')
                .setDescription(`<@${after.id}> — **${after.user.username}**`)
                .setFooter({ text: `User ID: ${after.id}` });

            if (added.size > 0) embed.addFields({ name: 'Added', value: trim(roleNames(added), 1024) });
            if (removed.size > 0) embed.addFields({ name: 'Removed', value: trim(roleNames(removed), 1024) });

            await sendAudit(after.guild, 'roles', embed);
        },
    },
];
