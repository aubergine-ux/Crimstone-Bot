const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'levels.json');

const readLevels = () => {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
};

const writeLevels = (levels) => {
    fs.writeFileSync(filePath, JSON.stringify(levels, null, 2));
};

module.exports = { readLevels, writeLevels };