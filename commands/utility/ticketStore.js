const { createStore } = require('./jsonStore.js');

const store = createStore('tickets.json');

const readTickets = () => store.read();

const writeTickets = (tickets) => {
    store.write(tickets);
};

const getTicketConfig = (guildId) => {
    const saved = readTickets()[guildId] || {};

    return {
        categoryId: saved.categoryId || null,
        supportRoleId: saved.supportRoleId || null,
        logChannelId: saved.logChannelId || null,
        count: saved.count || 0,
        open: { ...(saved.open || {}) },
    };
};

const setTicketConfig = (guildId, updates) => {
    const tickets = readTickets();

    if (!tickets[guildId]) tickets[guildId] = {};

    Object.keys(updates).forEach(field => {
        tickets[guildId][field] = updates[field];
    });

    writeTickets(tickets);
};

const nextTicketNumber = (guildId) => {
    const tickets = readTickets();

    if (!tickets[guildId]) tickets[guildId] = {};

    tickets[guildId].count = (tickets[guildId].count || 0) + 1;

    writeTickets(tickets);

    return tickets[guildId].count;
};

const addOpenTicket = (guildId, channelId, ticket) => {
    const tickets = readTickets();

    if (!tickets[guildId]) tickets[guildId] = {};
    if (!tickets[guildId].open) tickets[guildId].open = {};

    tickets[guildId].open[channelId] = ticket;

    writeTickets(tickets);
};

const removeOpenTicket = (guildId, channelId) => {
    const tickets = readTickets();

    if (!tickets[guildId] || !tickets[guildId].open || !tickets[guildId].open[channelId]) return false;

    delete tickets[guildId].open[channelId];
    writeTickets(tickets);

    return true;
};

const ticketInChannel = (guildId, channelId) => {
    return getTicketConfig(guildId).open[channelId] || null;
};

const ticketOpenedBy = (guildId, userId) => {
    const open = getTicketConfig(guildId).open;
    const channelId = Object.keys(open).find(id => open[id].userId === userId);

    return channelId ? { channelId: channelId, ...open[channelId] } : null;
};

module.exports = {
    getTicketConfig,
    setTicketConfig,
    nextTicketNumber,
    addOpenTicket,
    removeOpenTicket,
    ticketInChannel,
    ticketOpenedBy,
};
