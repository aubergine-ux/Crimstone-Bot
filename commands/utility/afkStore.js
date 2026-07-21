const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'afk.json');

const readAfk = () => {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
};

const writeAfk = (afk) => {
    fs.writeFileSync(filePath, JSON.stringify(afk, null, 2));
};

module.exports = { readAfk, writeAfk };