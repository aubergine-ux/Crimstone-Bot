const { createStore } = require('./jsonStore.js');

const store = createStore('alerts.json');

const readAlerts = () => store.read();

const writeAlerts = (alerts) => {
    store.write(alerts);
};

const alertsFor = (guildId) => {
    return Object.values(readAlerts()[guildId] || {});
};

const addAlert = (guildId, alert) => {
    const alerts = readAlerts();

    if (!alerts[guildId]) alerts[guildId] = {};

    alerts[guildId][alert.id] = alert;

    writeAlerts(alerts);
};

const updateAlert = (guildId, id, updates) => {
    const alerts = readAlerts();

    if (!alerts[guildId] || !alerts[guildId][id]) return;

    Object.keys(updates).forEach(field => {
        alerts[guildId][id][field] = updates[field];
    });

    writeAlerts(alerts);
};

const removeAlert = (guildId, id) => {
    const alerts = readAlerts();

    if (!alerts[guildId] || !alerts[guildId][id]) return false;

    delete alerts[guildId][id];
    writeAlerts(alerts);

    return true;
};

module.exports = { readAlerts, alertsFor, addAlert, updateAlert, removeAlert };
