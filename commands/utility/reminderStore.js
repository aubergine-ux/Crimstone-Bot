const { createStore } = require('./jsonStore.js');

const store = createStore('reminders.json');

const readReminders = () => store.read();

const writeReminders = (reminders) => {
    store.write(reminders);
};

const addReminder = (reminder) => {
    const reminders = readReminders();

    reminders[reminder.id] = reminder;

    writeReminders(reminders);
};

const removeReminder = (id) => {
    const reminders = readReminders();

    if (!reminders[id]) return false;

    delete reminders[id];
    writeReminders(reminders);

    return true;
};

const remindersFor = (userId) => {
    const reminders = readReminders();

    return Object.values(reminders)
        .filter(reminder => reminder.userId === userId)
        .sort((a, b) => a.dueAt - b.dueAt);
};

module.exports = { readReminders, writeReminders, addReminder, removeReminder, remindersFor };
