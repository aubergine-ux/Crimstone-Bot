const xpForLevel = (level) => {
    return 5 * (level ** 2) + 50 * level + 100;
};

const getLevelFromXp = (xp) => {
    let level = 0;
    let remaining = xp;

    while (remaining >= xpForLevel(level)) {
        remaining -= xpForLevel(level);
        level++;
    }

    return { level: level, currentXp: remaining, neededXp: xpForLevel(level) };
};

module.exports = { xpForLevel, getLevelFromXp };