const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'warnings.json');

const readWarnings = () => {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
};

const writeWarnings = (warnings) => {
    fs.writeFileSync(filePath, JSON.stringify(warnings, null, 2));
};

module.exports = { readWarnings, writeWarnings };