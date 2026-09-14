const { createStore } = require('./jsonStore.js');

const store = createStore('afk.json');

const readAfk = () => store.read();

const writeAfk = (afk) => {
    store.write(afk);
};

module.exports = { readAfk, writeAfk };
