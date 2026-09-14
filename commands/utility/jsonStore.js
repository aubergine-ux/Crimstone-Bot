const fs = require('fs');
const path = require('path');

const stores = [];

const createStore = (fileName, flushDelay = 0) => {
    const filePath = path.join(__dirname, fileName);
    const tempPath = `${filePath}.tmp`;

    let cache = null;
    let stamp = null;
    let dirty = false;
    let blocked = false;
    let timer = null;

    const fingerprint = () => {
        try {
            const stats = fs.statSync(filePath);
            return `${stats.mtimeMs}-${stats.size}`;
        } catch (error) {
            return null;
        }
    };

    const quarantine = () => {
        const stampedPath = `${filePath}.corrupt-${Date.now()}`;

        try {
            fs.copyFileSync(filePath, stampedPath);
            console.error(`[STORE] Kept a copy of the unreadable ${fileName} at ${path.basename(stampedPath)}.`);
        } catch (error) {
            console.error(`[STORE] Could not back up the unreadable ${fileName}:`, error.message);
        }
    };

    const load = () => {
        let data;

        try {
            data = fs.readFileSync(filePath, 'utf8');
        } catch (error) {
            if (error.code === 'ENOENT') {
                blocked = false;
                return {};
            }

            blocked = true;
            console.error(`[STORE] Cannot read ${fileName}, so it will not be written to:`, error.message);
            return {};
        }

        try {
            const parsed = JSON.parse(data);
            blocked = false;
            return parsed;
        } catch (error) {
            if (!blocked) quarantine();

            blocked = true;
            console.error(`[STORE] ${fileName} is corrupt and will not be overwritten:`, error.message);
            return {};
        }
    };

    const read = () => {
        const current = fingerprint();

        if (cache === null || (!dirty && current !== stamp)) {
            cache = load();
            stamp = current;
        }

        return cache;
    };

    const flush = () => {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }

        if (!dirty) return;

        dirty = false;

        if (blocked) {
            console.error(`[STORE] Refusing to save ${fileName} over the unreadable copy on disk. Repair or delete it, then restart.`);
            return;
        }

        try {
            fs.writeFileSync(tempPath, JSON.stringify(cache, null, 2));
            fs.renameSync(tempPath, filePath);
            stamp = fingerprint();
        } catch (error) {
            console.error(`[STORE] Failed to save ${fileName}:`, error.message);
        }
    };

    const write = (value) => {
        cache = value;
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
