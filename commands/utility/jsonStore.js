const { db, migrate, readLegacy, retireLegacy } = require('./database.js');

const stores = [];

const selectRows = db.prepare('SELECT key, value FROM stores WHERE name = ?');
const upsertRow = db.prepare(`
    INSERT INTO stores (name, key, value) VALUES (?, ?, ?)
    ON CONFLICT (name, key) DO UPDATE SET value = excluded.value
`);
const deleteRow = db.prepare('DELETE FROM stores WHERE name = ? AND key = ?');

// Each store keeps its data as one row per top-level key (usually a guild ID), so a
// save only rewrites the guilds that actually changed.
const createStore = (fileName, flushDelay = 0) => {
    const name = fileName.replace(/\.json$/, '');

    migrate(`store:${name}`, () => {
        const legacy = readLegacy(fileName);

        if (!legacy) return;

        Object.keys(legacy).forEach(key => {
            const existing = db.prepare('SELECT 1 FROM stores WHERE name = ? AND key = ?').get(name, key);

            if (!existing) upsertRow.run(name, key, JSON.stringify(legacy[key]));
        });

        retireLegacy(fileName);
    });

    const cache = {};
    const saved = {};

    selectRows.all(name).forEach(row => {
        try {
            cache[row.key] = JSON.parse(row.value);
            saved[row.key] = row.value;
        } catch (error) {
            console.error(`[STORE] Skipped an unreadable ${name} entry for ${row.key}:`, error.message);
        }
    });

    let current = cache;
    let dirty = false;
    let timer = null;

    const read = () => current;

    const flush = () => {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }

        if (!dirty) return;

        dirty = false;

        try {
            db.transaction(() => {
                Object.keys(current).forEach(key => {
                    const value = JSON.stringify(current[key]);

                    if (value === undefined) return;

                    if (saved[key] !== value) {
                        upsertRow.run(name, key, value);
                        saved[key] = value;
                    }
                });

                Object.keys(saved).forEach(key => {
                    if (!(key in current)) {
                        deleteRow.run(name, key);
                        delete saved[key];
                    }
                });
            })();
        } catch (error) {
            console.error(`[STORE] Failed to save ${name}:`, error.message);
        }
    };

    const write = (value) => {
        current = value;
        dirty = true;

        if (flushDelay > 0) {
            if (!timer) timer = setTimeout(flush, flushDelay);
            return;
        }

        flush();
    };

    const store = { read: read, write: write, flush: flush };

    stores.push(store);

    return store;
};

const flushAll = () => {
    stores.forEach(store => {
        try {
            store.flush();
        } catch (error) {
            console.error('[STORE] Failed to flush on shutdown:', error.message);
        }
    });
};

module.exports = { createStore, flushAll };
