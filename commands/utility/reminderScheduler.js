const { readReminders, removeReminder } = require('./reminderStore.js');

const MAX_TIMEOUT = 2147483647;

const timers = new Map();

let client = null;

const cancelTimer = (id) => {
    const timer = timers.get(id);

    if (timer) {
        clearTimeout(timer);
        timers.delete(id);
    }
};

const deliver = async (id) => {
    timers.delete(id);

    const reminder = readReminders()[id];

    if (!reminder) return;

    removeReminder(id);

    if (!client) return;

    const message = `⏰ <@${reminder.userId}>, you asked me to remind you: ${reminder.text}`;

    try {
        const channel = await client.channels.fetch(reminder.channelId);
        await channel.send(message);
        return;
    } catch (error) {
        console.error(`Reminder ${id} could not post in its channel:`, error.message);
    }

    try {
        const user = await client.users.fetch(reminder.userId);
        await user.send(message);
    } catch (error) {
        console.error(`Reminder ${id} could not be delivered at all:`, error.message);
    }
};

const scheduleReminder = (reminder) => {
    cancelTimer(reminder.id);

    const delay = reminder.dueAt - Date.now();

    if (delay > MAX_TIMEOUT) {
        timers.set(reminder.id, setTimeout(() => scheduleReminder(reminder), MAX_TIMEOUT));
        return;
    }

    timers.set(reminder.id, setTimeout(() => deliver(reminder.id), Math.max(delay, 0)));
};

const startReminders = (readyClient) => {
    client = readyClient;

    const reminders = Object.values(readReminders());

    reminders.forEach(reminder => scheduleReminder(reminder));

    console.log(`[REMINDERS] Armed ${reminders.length} reminder(s).`);
};

module.exports = { startReminders, scheduleReminder, cancelTimer };
