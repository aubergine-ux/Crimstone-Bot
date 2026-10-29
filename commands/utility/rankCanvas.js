const { createCanvas, loadImage } = require('@napi-rs/canvas');

const WIDTH = 934;
const HEIGHT = 282;

const hexToRgb = (hex) => {
    const int = parseInt(hex.replace('#', ''), 16);
    return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
};

const isLight = (hex) => {
    const { r, g, b } = hexToRgb(hex);
    const luminance = ((0.299 * r) + (0.587 * g) + (0.114 * b)) / 255;
    return luminance > 0.55;
};

const formatNumber = (number) => new Intl.NumberFormat('en-US').format(number);

const formatVoice = (minutes) => {
    const hours = Math.floor(minutes / 60);

    return hours > 0 ? `${hours}H ${minutes % 60}M` : `${minutes}M`;
};

const roundedRect = (ctx, x, y, width, height, radius) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
};

const buildRankCard = async (options) => {
    const accent = options.accent;
    const background = options.background;
    const backgroundImage = options.backgroundImage;
    const tagline = options.tagline;
    const username = options.username;
    const avatarUrl = options.avatarUrl;
    const level = options.level;
    const rank = options.rank;
    const globalRank = options.globalRank;
    const currentXp = options.currentXp;
    const neededXp = options.neededXp;
    const stats = options.stats;

    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = background;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    let darkOverlay = false;

    if (backgroundImage) {
        try {
            const image = await loadImage(backgroundImage);
            const scale = Math.max(WIDTH / image.width, HEIGHT / image.height);
            const drawWidth = image.width * scale;
            const drawHeight = image.height * scale;
            ctx.drawImage(image, (WIDTH - drawWidth) / 2, (HEIGHT - drawHeight) / 2, drawWidth, drawHeight);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
            ctx.fillRect(0, 0, WIDTH, HEIGHT);
            darkOverlay = true;
        } catch (error) {
            console.error('Rank card background failed to load:', error);
        }
    }

    const textColor = darkOverlay ? '#FFFFFF' : (isLight(background) ? '#101010' : '#FFFFFF');
    const mutedColor = darkOverlay ? 'rgba(255,255,255,0.7)' : (isLight(background) ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.6)');
    const trackColor = darkOverlay ? 'rgba(255,255,255,0.25)' : (isLight(background) ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)');

    const avatarSize = 180;
    const avatarX = 50;
    const avatarY = (HEIGHT - avatarSize) / 2;

    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + (avatarSize / 2), avatarY + (avatarSize / 2), (avatarSize / 2) + 6, 0, Math.PI * 2);
    ctx.fillStyle = accent;
    ctx.fill();
    ctx.restore();

    try {
        const avatar = await loadImage(avatarUrl);
        ctx.save();
        ctx.beginPath();
        ctx.arc(avatarX + (avatarSize / 2), avatarY + (avatarSize / 2), avatarSize / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
        ctx.restore();
    } catch (error) {
        console.error('Avatar failed to load:', error);
    }

    const contentX = avatarX + avatarSize + 40;

    ctx.fillStyle = textColor;
    ctx.font = 'bold 42px sans-serif';
    ctx.fillText(username, contentX, 100);

    ctx.font = 'bold 34px sans-serif';
    const levelText = `LEVEL ${level}`;
    const levelWidth = ctx.measureText(levelText).width;
    ctx.fillStyle = accent;
    ctx.fillText(levelText, WIDTH - 50 - levelWidth, 100);

    if (rank || globalRank) {
        const parts = [];

        if (rank) parts.push(`#${rank}`);
        if (globalRank) parts.push(`GLOBAL #${globalRank}`);

        ctx.font = '26px sans-serif';
        const rankText = parts.join('  ·  ');
        const rankWidth = ctx.measureText(rankText).width;
        ctx.fillStyle = mutedColor;
        ctx.fillText(rankText, WIDTH - 50 - rankWidth, 60);
    }

    if (tagline) {
        ctx.font = 'italic 24px sans-serif';
        ctx.fillStyle = mutedColor;
        ctx.fillText(tagline, contentX, 136);
    }

    const barX = contentX;
    const barY = 180;
    const barWidth = WIDTH - contentX - 50;
    const barHeight = 34;
    const progress = Math.min(currentXp / neededXp, 1);

    ctx.fillStyle = trackColor;
    roundedRect(ctx, barX, barY, barWidth, barHeight, barHeight / 2);
    ctx.fill();

    if (progress > 0) {
        ctx.fillStyle = accent;
        roundedRect(ctx, barX, barY, Math.max(barWidth * progress, barHeight), barHeight, barHeight / 2);
        ctx.fill();
    }

    ctx.font = '24px sans-serif';
    ctx.fillStyle = mutedColor;
    const xpText = `${formatNumber(currentXp)} / ${formatNumber(neededXp)} XP`;
    const xpWidth = ctx.measureText(xpText).width;

    if (stats) {
        ctx.fillText(xpText, WIDTH - 50 - xpWidth, barY - 14);

        const parts = [`${formatNumber(stats.messages)} MSGS`, `${formatVoice(stats.voiceMinutes)} VOICE`];

        if (stats.streak > 0) parts.push(`${stats.streak} DAY STREAK`);

        ctx.font = '22px sans-serif';
        ctx.fillText(parts.join('  ·  '), barX, barY + barHeight + 32);
    } else {
        ctx.fillText(xpText, WIDTH - 50 - xpWidth, barY + barHeight + 32);
    }

    return canvas.toBuffer('image/png');
};

const ROW_HEIGHT = 72;
const BOARD_TOP = 110;
const BOARD_AVATAR = 52;

const fitText = (ctx, text, maxWidth) => {
    if (ctx.measureText(text).width <= maxWidth) return text;

    let trimmed = text;

    while (trimmed.length > 1 && ctx.measureText(`${trimmed}…`).width > maxWidth) {
        trimmed = trimmed.slice(0, -1);
    }

    return `${trimmed}…`;
};

const buildLeaderboardCard = async (options) => {
    const title = options.title;
    const subtitle = options.subtitle;
    const accent = options.accent;
    const entries = options.entries;

    const height = BOARD_TOP + (entries.length * ROW_HEIGHT) + 30;
    const canvas = createCanvas(WIDTH, height);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#1E1F22';
    ctx.fillRect(0, 0, WIDTH, height);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 38px sans-serif';
    ctx.fillText(fitText(ctx, title, WIDTH - 100), 50, 58);

    if (subtitle) {
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '22px sans-serif';
        ctx.fillText(fitText(ctx, subtitle, WIDTH - 100), 50, 90);
    }

    ctx.font = '24px sans-serif';
    const xpColumn = Math.max(...entries.map(entry => ctx.measureText(`${formatNumber(entry.xp)} XP`).width));

    const avatars = await Promise.all(entries.map(entry =>
        entry.avatarUrl ? loadImage(entry.avatarUrl).catch(() => null) : null,
    ));

    entries.forEach((entry, index) => {
        const rowY = BOARD_TOP + (index * ROW_HEIGHT);
        const centerY = rowY + (ROW_HEIGHT / 2);

        ctx.fillStyle = index % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)';
        roundedRect(ctx, 30, rowY + 4, WIDTH - 60, ROW_HEIGHT - 8, 14);
        ctx.fill();

        const podium = ['#F1C40F', '#BDC3C7', '#CD7F32'];

        ctx.fillStyle = podium[entry.position - 1] || 'rgba(255,255,255,0.7)';
        ctx.font = 'bold 28px sans-serif';
        ctx.fillText(`#${entry.position}`, 50, centerY + 10);

        const avatarX = 130;
        const avatarY = centerY - (BOARD_AVATAR / 2);

        ctx.save();
        ctx.beginPath();
        ctx.arc(avatarX + (BOARD_AVATAR / 2), centerY, BOARD_AVATAR / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fillStyle = accent;
        ctx.fill();

        if (avatars[index]) {
            ctx.clip();
            ctx.drawImage(avatars[index], avatarX, avatarY, BOARD_AVATAR, BOARD_AVATAR);
        }

        ctx.restore();

        ctx.font = '24px sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        const xpText = `${formatNumber(entry.xp)} XP`;
        const xpWidth = ctx.measureText(xpText).width;
        ctx.fillText(xpText, WIDTH - 50 - xpWidth, centerY + 9);

        ctx.font = 'bold 26px sans-serif';
        ctx.fillStyle = accent;
        const levelText = `LVL ${entry.level}`;
        const levelWidth = ctx.measureText(levelText).width;
        const levelX = WIDTH - 50 - xpColumn - 30 - levelWidth;
        ctx.fillText(levelText, levelX, centerY + 9);

        const nameX = avatarX + BOARD_AVATAR + 20;

        ctx.font = 'bold 28px sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(fitText(ctx, entry.username, levelX - nameX - 20), nameX, centerY + 10);
    });

    return canvas.toBuffer('image/png');
};

module.exports = { buildRankCard, buildLeaderboardCard };
