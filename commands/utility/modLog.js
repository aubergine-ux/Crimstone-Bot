const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getConfig } = require('./guildConfig.js');
const { db, migrate, readLegacy, retireLegacy } = require('./database.js');

// Warnings used to live in their own file, separate from the case history. They're now
// warn cases that stay active until removed, so this matches each old warning to its case.
const WARNING_MATCH_WINDOW = 120000;

migrate('cases', () => {
    const counters = readLegacy('modCases.json') || {};
    const history = readLegacy('modHistory.json') || {};
    const warnings = readLegacy('warnings.json') || {};

    const insertCase = db.prepare(`
        INSERT OR IGNORE INTO cases (guild_id, case_number, action, user_id, user_tag, moderator, reason, duration, active, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const setCounter = db.prepare(`
        INSERT INTO case_counters (guild_id, last_case) VALUES (?, ?)
        ON CONFLICT (guild_id) DO UPDATE SET last_case = MAX(last_case, excluded.last_case)
    `);

    Object.keys(history).forEach(guildId => {
        history[guildId].forEach(entry => {
            insertCase.run(guildId, entry.case, entry.action, entry.userId, entry.userTag, entry.moderator, entry.reason, entry.duration, entry.action === 'warn' ? 0 : 1, entry.timestamp);
        });
    });

    Object.keys(counters).forEach(guildId => setCounter.run(guildId, counters[guildId]));

    db.prepare('SELECT guild_id, MAX(case_number) AS last_case FROM cases GROUP BY guild_id').all()
        .forEach(row => setCounter.run(row.guild_id, row.last_case));

    const findMatch = db.prepare(`
        SELECT case_number FROM cases
        WHERE guild_id = ? AND user_id = ? AND action = 'warn' AND active = 0 AND reason IS ? AND ABS(timestamp - ?) <= ?
        ORDER BY ABS(timestamp - ?) LIMIT 1
    `);
    const activate = db.prepare('UPDATE cases SET active = 1 WHERE guild_id = ? AND case_number = ?');

    Object.keys(warnings).forEach(guildId => {
        Object.keys(warnings[guildId]).forEach(userId => {
            warnings[guildId][userId].forEach(warning => {
                const match = findMatch.get(guildId, userId, warning.reason, warning.timestamp, WARNING_MATCH_WINDOW, warning.timestamp);

                if (match) {
                    activate.run(guildId, match.case_number);
                    return;
                }

                const caseNumber = nextCase(guildId);

                insertCase.run(guildId, caseNumber, 'warn', userId, null, warning.moderator, warning.reason, null, 1, warning.timestamp);
            });
        });
    });

    retireLegacy('modCases.json');
    retireLegacy('modHistory.json');
    retireLegacy('warnings.json');
});

const ACTIONS = {
    ban: { emoji: '🔨', label: 'Ban', color: 0xE74C3C },
    unban: { emoji: '🕊️', label: 'Unban', color: 0x2ECC71 },
    kick: { emoji: '👢', label: 'Kick', color: 0xE67E22 },
    timeout: { emoji: '⏳', label: 'Timeout', color: 0xE67E22 },
    untimeout: { emoji: '⌛', label: 'Timeout Removed', color: 0x2ECC71 },
    warn: { emoji: '⚠️', label: 'Warning', color: 0xF1C40F },
    unwarn: { emoji: '✅', label: 'Warning Removed', color: 0x2ECC71 },
    purge: { emoji: '🧹', label: 'Purge', color: 0x95A5A6 },
    nickname: { emoji: '✏️', label: 'Nickname Change', color: 0x5865F2 },
    role: { emoji: '🎭', label: 'Role Change', color: 0x5865F2 },
};

// A function declaration so the migration above can use it before this line runs.
function nextCase(guildId) {
    return db.prepare(`
        INSERT INTO case_counters (guild_id, last_case) VALUES (?, 1)
        ON CONFLICT (guild_id) DO UPDATE SET last_case = last_case + 1
        RETURNING last_case
    `).get(guildId).last_case;
}

const recordCase = (guildId, caseNumber, options) => {
    db.prepare(`
        INSERT INTO cases (guild_id, case_number, action, user_id, user_tag, moderator, reason, duration, active, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).run(
        guildId,
        caseNumber,
        options.action,
        options.target ? options.target.id : null,
        options.target ? (options.target.tag || options.target.username) : null,
        options.moderator ? (options.moderator.tag || options.moderator.username) : null,
        options.reason || null,
        options.duration || null,
        Date.now(),
    );
};

const toCase = (row) => {
    return {
        case: row.case_number,
        action: row.action,
        userId: row.user_id,
        userTag: row.user_tag,
        moderator: row.moderator,
        reason: row.reason,
        duration: row.duration,
        active: row.active === 1,
        timestamp: row.timestamp,
    };
};

const getUserCases = (guildId, userId) => {
    return db.prepare('SELECT * FROM cases WHERE guild_id = ? AND user_id = ? ORDER BY case_number')
        .all(guildId, userId)
        .map(toCase);
};

const modlogChannel = (guild) => {
    const config = getConfig(guild.id);

    if (!config.modlogChannel) return null;

    const channel = guild.channels.cache.get(config.modlogChannel);

    if (!channel) return null;

    const canPost = channel.permissionsFor(guild.members.me)?.has([
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
    ]);

    return canPost ? channel : null;
};

// Posts to the mod log without opening a case, for notices that aren't punishments.
const postModlog = async (guild, embed) => {
    const channel = modlogChannel(guild);

    if (!channel) return;

    try {
        await channel.send({ embeds: [embed] });
    } catch (error) {
        console.error('Failed to write mod log:', error.message);
    }
};

const logAction = async (options) => {
    const guild = options.guild;
    const action = options.action;

    if (!guild) return null;

    const style = ACTIONS[action] || { emoji: '📋', label: action, color: 0x5865F2 };
    const caseNumber = nextCase(guild.id);

    recordCase(guild.id, caseNumber, options);

    if (!modlogChannel(guild)) return caseNumber;

    const fields = [];

    if (options.target) {
        fields.push({
            name: 'User',
            value: `${options.target.tag || options.target.username} (<@${options.target.id}>)`,
            inline: true,
        });
    }

    if (options.moderator) {
        fields.push({
            name: 'Moderator',
            value: `${options.moderator.tag || options.moderator.username}`,
            inline: true,
        });
    }

    if (options.duration) {
        fields.push({ name: 'Duration', value: options.duration, inline: true });
    }

    if (options.channel) {
        fields.push({ name: 'Channel', value: `<#${options.channel.id}>`, inline: true });
    }

    fields.push({ name: 'Reason', value: options.reason || 'No reason given' });

    if (options.extra) {
        fields.push({ name: 'Details', value: String(options.extra).slice(0, 1024) });
    }

    const embed = new EmbedBuilder()
        .setColor(style.color)
        .setAuthor({
            name: `${style.emoji} ${style.label} — Case #${caseNumber}`,
            iconURL: options.target?.displayAvatarURL ? options.target.displayAvatarURL() : undefined,
        })
        .addFields(fields)
        .setFooter({ text: options.target ? `User ID: ${options.target.id}` : `Guild: ${guild.name}` })
        .setTimestamp();

    await postModlog(guild, embed);

    return caseNumber;
};

module.exports = { logAction, postModlog, getUserCases, ACTIONS };
