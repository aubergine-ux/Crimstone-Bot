const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const LEGACY_DIR = __dirname;

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'crimstone.db'));

db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
        name TEXT PRIMARY KEY,
        ran_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS stores (
        name TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        PRIMARY KEY (name, key)
    );

    CREATE TABLE IF NOT EXISTS levels (
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        xp INTEGER NOT NULL DEFAULT 0,
        messages INTEGER NOT NULL DEFAULT 0,
        voice_minutes INTEGER NOT NULL DEFAULT 0,
        weekly_xp INTEGER NOT NULL DEFAULT 0,
        week TEXT,
        monthly_xp INTEGER NOT NULL DEFAULT 0,
        month TEXT,
        streak INTEGER NOT NULL DEFAULT 0,
        streak_day TEXT,
        last_active INTEGER,
        PRIMARY KEY (guild_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS cases (
        guild_id TEXT NOT NULL,
        case_number INTEGER NOT NULL,
        action TEXT NOT NULL,
        user_id TEXT,
        user_tag TEXT,
        moderator TEXT,
        reason TEXT,
        duration TEXT,
        active INTEGER NOT NULL DEFAULT 1,
        timestamp INTEGER NOT NULL,
        PRIMARY KEY (guild_id, case_number)
    );

    CREATE INDEX IF NOT EXISTS cases_by_user ON cases (guild_id, user_id);

    CREATE TABLE IF NOT EXISTS case_counters (
        guild_id TEXT PRIMARY KEY,
        last_case INTEGER NOT NULL
    );
`);

// Runs a one-off import from the old JSON files. A migration is only marked as done
// when it succeeds, so a corrupt file gets another go on the next start once it's fixed.
const migrate = (name, run) => {
    const done = db.prepare('SELECT 1 FROM migrations WHERE name = ?').get(name);

    if (done) return;

    try {
        db.transaction(() => {
            run();
            db.prepare('INSERT INTO migrations (name, ran_at) VALUES (?, ?)').run(name, Date.now());
        })();
    } catch (error) {
        console.error(`[DATABASE] Migration "${name}" failed and will be retried on the next start:`, error.message);
    }
};

// Returns the parsed contents of an old JSON data file, or null when there isn't one.
// Throws on a corrupt file so the migration that called it is rolled back.
const readLegacy = (fileName) => {
    const filePath = path.join(LEGACY_DIR, fileName);

    if (!fs.existsSync(filePath)) return null;

    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};

const retireLegacy = (fileName) => {
    const filePath = path.join(LEGACY_DIR, fileName);

    if (!fs.existsSync(filePath)) return;

    try {
        fs.renameSync(filePath, `${filePath}.migrated`);
        console.log(`[DATABASE] Imported ${fileName} into the database and renamed it to ${fileName}.migrated.`);
    } catch (error) {
        console.error(`[DATABASE] Imported ${fileName} but could not rename it:`, error.message);
    }
};

module.exports = { db, migrate, readLegacy, retireLegacy };
