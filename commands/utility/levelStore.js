const { db, migrate, readLegacy, retireLegacy } = require('./database.js');

migrate('levels', () => {
    const legacy = readLegacy('levels.json');

    if (!legacy) return;

    const insert = db.prepare(`
        INSERT INTO levels (guild_id, user_id, xp) VALUES (?, ?, ?)
        ON CONFLICT (guild_id, user_id) DO UPDATE SET xp = xp + excluded.xp
    `);

    Object.keys(legacy).forEach(guildId => {
        Object.keys(legacy[guildId]).forEach(userId => {
            const xp = Math.floor(Number(legacy[guildId][userId]));

            if (Number.isFinite(xp) && xp > 0) insert.run(guildId, userId, xp);
        });
    });

    retireLegacy('levels.json');
});

const DAY = 86400000;

const dayKey = (time = Date.now()) => new Date(time).toISOString().slice(0, 10);

const weekKey = (time = Date.now()) => {
    const date = new Date(time);
    const sinceMonday = (date.getUTCDay() + 6) % 7;

    date.setUTCDate(date.getUTCDate() - sinceMonday);

    return date.toISOString().slice(0, 10);
};

const monthKey = (time = Date.now()) => new Date(time).toISOString().slice(0, 7);

const selectRow = db.prepare('SELECT * FROM levels WHERE guild_id = ? AND user_id = ?');
const ensureRow = db.prepare('INSERT OR IGNORE INTO levels (guild_id, user_id) VALUES (?, ?)');

const liveStreak = (row) => {
    if (!row || !row.streak_day) return 0;

    const today = dayKey();
    const yesterday = dayKey(Date.now() - DAY);

    return row.streak_day === today || row.streak_day === yesterday ? row.streak : 0;
};

const getMember = (guildId, userId) => {
    const row = selectRow.get(guildId, userId);

    if (!row) {
        return { xp: 0, messages: 0, voiceMinutes: 0, weeklyXp: 0, monthlyXp: 0, streak: 0, lastActive: null };
    }

    return {
        xp: row.xp,
        messages: row.messages,
        voiceMinutes: row.voice_minutes,
        weeklyXp: row.week === weekKey() ? row.weekly_xp : 0,
        monthlyXp: row.month === monthKey() ? row.monthly_xp : 0,
        streak: liveStreak(row),
        lastActive: row.last_active,
    };
};

const getXp = (guildId, userId) => getMember(guildId, userId).xp;

const setXp = (guildId, userId, xp) => {
    db.prepare(`
        INSERT INTO levels (guild_id, user_id, xp) VALUES (?, ?, ?)
        ON CONFLICT (guild_id, user_id) DO UPDATE SET xp = excluded.xp
    `).run(guildId, userId, Math.max(0, xp));
};

const addXp = db.transaction((guildId, userId, amount) => {
    ensureRow.run(guildId, userId);

    const row = selectRow.get(guildId, userId);
    const week = weekKey();
    const month = monthKey();
    const after = Math.max(0, row.xp + amount);

    db.prepare(`
        UPDATE levels SET xp = ?, weekly_xp = ?, week = ?, monthly_xp = ?, month = ?, last_active = ?
        WHERE guild_id = ? AND user_id = ?
    `).run(
        after,
        (row.week === week ? row.weekly_xp : 0) + Math.max(0, amount),
        week,
        (row.month === month ? row.monthly_xp : 0) + Math.max(0, amount),
        month,
        Date.now(),
        guildId,
        userId,
    );

    return { before: row.xp, after: after };
});

// Counts today towards the member's daily streak and returns the streak afterwards.
const touchStreak = db.transaction((guildId, userId) => {
    ensureRow.run(guildId, userId);

    const row = selectRow.get(guildId, userId);
    const today = dayKey();

    if (row.streak_day === today) return row.streak;

    const streak = row.streak_day === dayKey(Date.now() - DAY) ? row.streak + 1 : 1;

    db.prepare('UPDATE levels SET streak = ?, streak_day = ? WHERE guild_id = ? AND user_id = ?')
        .run(streak, today, guildId, userId);

    return streak;
});

const addMessage = (guildId, userId) => {
    db.prepare(`
        INSERT INTO levels (guild_id, user_id, messages, last_active) VALUES (?, ?, 1, ?)
        ON CONFLICT (guild_id, user_id) DO UPDATE SET messages = messages + 1, last_active = excluded.last_active
    `).run(guildId, userId, Date.now());
};

const addVoiceMinute = (guildId, userId) => {
    db.prepare(`
        INSERT INTO levels (guild_id, user_id, voice_minutes, last_active) VALUES (?, ?, 1, ?)
        ON CONFLICT (guild_id, user_id) DO UPDATE SET voice_minutes = voice_minutes + 1, last_active = excluded.last_active
    `).run(guildId, userId, Date.now());
};

const removeMember = (guildId, userId) => {
    return db.prepare('DELETE FROM levels WHERE guild_id = ? AND user_id = ?').run(guildId, userId).changes > 0;
};

const removeGuild = (guildId) => {
    return db.prepare('DELETE FROM levels WHERE guild_id = ?').run(guildId).changes;
};

const countMembers = (guildId) => {
    return db.prepare('SELECT COUNT(*) AS count FROM levels WHERE guild_id = ? AND xp > 0').get(guildId).count;
};

// Returns [userId, xp] pairs, highest first. Period is 'all', 'week' or 'month'.
const guildRanking = (guildId, period = 'all', limit = -1) => {
    let rows;

    if (period === 'week') {
        rows = db.prepare('SELECT user_id, weekly_xp AS total FROM levels WHERE guild_id = ? AND week = ? AND weekly_xp > 0 ORDER BY weekly_xp DESC LIMIT ?')
            .all(guildId, weekKey(), limit);
    } else if (period === 'month') {
        rows = db.prepare('SELECT user_id, monthly_xp AS total FROM levels WHERE guild_id = ? AND month = ? AND monthly_xp > 0 ORDER BY monthly_xp DESC LIMIT ?')
            .all(guildId, monthKey(), limit);
    } else {
        rows = db.prepare('SELECT user_id, xp AS total FROM levels WHERE guild_id = ? AND xp > 0 ORDER BY xp DESC LIMIT ?')
            .all(guildId, limit);
    }

    return rows.map(row => [row.user_id, row.total]);
};

const guildPosition = (guildId, userId) => {
    const xp = getXp(guildId, userId);

    if (xp <= 0) return null;

    return db.prepare('SELECT COUNT(*) + 1 AS position FROM levels WHERE guild_id = ? AND xp > ?').get(guildId, xp).position;
};

// Mode 'combined' adds every server together, 'best' takes each member's strongest server.
const globalRanking = (mode, excludedGuilds = [], limit = -1) => {
    const excluded = JSON.stringify(excludedGuilds);
    const total = mode === 'best' ? 'MAX(xp)' : 'SUM(xp)';

    const rows = db.prepare(`
        SELECT user_id, ${total} AS total FROM levels
        WHERE xp > 0 AND guild_id NOT IN (SELECT value FROM json_each(?))
        GROUP BY user_id ORDER BY total DESC LIMIT ?
    `).all(excluded, limit);

    const { guilds } = db.prepare(`
        SELECT COUNT(DISTINCT guild_id) AS guilds FROM levels
        WHERE xp > 0 AND guild_id NOT IN (SELECT value FROM json_each(?))
    `).get(excluded);

    return { entries: rows.map(row => [row.user_id, row.total]), guilds: guilds };
};

const importXp = db.transaction((guildId, entries, mode) => {
    entries.forEach(entry => {
        const current = getXp(guildId, entry.userId);

        if (mode === 'replace') setXp(guildId, entry.userId, entry.xp);
        if (mode === 'add') setXp(guildId, entry.userId, current + entry.xp);
        if (mode === 'higher') setXp(guildId, entry.userId, Math.max(current, entry.xp));
    });
});

module.exports = {
    getMember,
    getXp,
    setXp,
    addXp,
    touchStreak,
    addMessage,
    addVoiceMinute,
    removeMember,
    removeGuild,
    countMembers,
    guildRanking,
    guildPosition,
    globalRanking,
    importXp,
};
