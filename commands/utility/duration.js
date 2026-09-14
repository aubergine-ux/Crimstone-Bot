const UNITS = {
    s: 1000,
    m: 60000,
    h: 3600000,
    d: 86400000,
    w: 604800000,
};

const parseDuration = (input) => {
    if (!input) return null;

    const cleaned = String(input).trim().toLowerCase();
    const matches = [...cleaned.matchAll(/(\d+)\s*([smhdw])/g)];

    if (matches.length === 0) return null;

    let total = 0;

    matches.forEach(match => {
        total += Number(match[1]) * UNITS[match[2]];
    });

    return total > 0 ? total : null;
};

const formatDuration = (ms) => {
    if (ms < 1000) return 'a moment';

    const units = [
        { label: 'd', size: UNITS.d },
        { label: 'h', size: UNITS.h },
        { label: 'm', size: UNITS.m },
        { label: 's', size: UNITS.s },
    ];

    const parts = [];

    let remaining = ms;

    units.forEach(unit => {
        const value = Math.floor(remaining / unit.size);

        if (value > 0) {
            parts.push(`${value}${unit.label}`);
            remaining -= value * unit.size;
        }
    });

    return parts.slice(0, 2).join(' ');
};

module.exports = { parseDuration, formatDuration };
