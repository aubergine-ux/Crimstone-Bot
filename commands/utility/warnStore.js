const { createStore } = require('./jsonStore.js');

const store = createStore('warnings.json');

const readWarnings = () => store.read();

const writeWarnings = (warnings) => {
    store.write(warnings);
};

module.exports = { readWarnings, writeWarnings };
