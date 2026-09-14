const { Events } = require('discord.js');
const { sendAudit, auditEmbed, trim } = require('../commands/utility/auditLog.js');

module.exports = [
    {
        name: Events.GuildRoleCreate,

        async execute(role) {
            const embed = auditEmbed('roles', 'Role created', 'create')
                .setDescription(`<@&${role.id}> — **${role.name}**`)
                .setFooter({ text: `Role ID: ${role.id}` });

            await sendAudit(role.guild, 'roles', embed);
        },
    },
    {
        name: Events.GuildRoleDelete,

        async execute(role) {
            const embed = auditEmbed('roles', 'Role deleted', 'remove')
                .setDescription(`**${role.name}**`)
                .setFooter({ text: `Role ID: ${role.id}` });

            await sendAudit(role.guild, 'roles', embed);
        },
    },
    {
        name: Events.GuildRoleUpdate,

        async execute(before, after) {
            const changes = [];

            if (before.name !== after.name) {
                changes.push({ name: 'Name', value: `${trim(before.name, 100)} → ${trim(after.name, 100)}` });
            }

            if (before.hexColor !== after.hexColor) {
                changes.push({ name: 'Colour', value: `${before.hexColor} → ${after.hexColor}` });
            }

            if (before.hoist !== after.hoist) {
                changes.push({ name: 'Shown separately', value: after.hoist ? 'Yes' : 'No' });
            }

            if (before.mentionable !== after.mentionable) {
                changes.push({ name: 'Mentionable', value: after.mentionable ? 'Yes' : 'No' });
            }

            if (before.permissions.bitfield !== after.permissions.bitfield) {
                const gained = before.permissions.missing(after.permissions.toArray());
                const lost = after.permissions.missing(before.permissions.toArray());

                if (gained.length > 0) changes.push({ name: 'Permissions granted', value: trim(gained.join(', '), 1024) });
                if (lost.length > 0) changes.push({ name: 'Permissions removed', value: trim(lost.join(', '), 1024) });
            }

            if (changes.length === 0) return;

            const embed = auditEmbed('roles', 'Role updated', 'update')
                .setDescription(`<@&${after.id}>`)
                .addFields(changes)
                .setFooter({ text: `Role ID: ${after.id}` });

            await sendAudit(after.guild, 'roles', embed);
        },
    },
];
