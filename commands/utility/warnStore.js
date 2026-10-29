const { db } = require('./database.js');
const { getConfig } = require('./guildConfig.js');

const DAY = 86400000;

// Active warnings are warn cases that haven't been removed or expired, oldest first.
const getWarnings = (guildId, userId) => {
    const expiryDays = getConfig(guildId).warnExpiryDays;
    const since = expiryDays > 0 ? Date.now() - (expiryDays * DAY) : 0;

    return db.prepare(`
        SELECT case_number, reason, moderator, timestamp FROM cases
        WHERE guild_id = ? AND user_id = ? AND action = 'warn' AND active = 1 AND timestamp >= ?
        ORDER BY timestamp
    `).all(guildId, userId, since).map(row => ({
        case: row.case_number,
        reason: row.reason,
        moderator: row.moderator,
        timestamp: row.timestamp,
    }));
};

const removeWarning = (guildId, caseNumber) => {
    db.prepare('UPDATE cases SET active = 0 WHERE guild_id = ? AND case_number = ?').run(guildId, caseNumber);
};

module.exports = { getWarnings, removeWarning };
