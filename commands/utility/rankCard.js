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
    const currentXp = options.currentXp;
    const neededXp = options.neededXp;

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

    if (rank) {
        ctx.font = '26px sans-serif';
        const rankText = `#${rank}`;
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
    const xpText = `${currentXp} / ${neededXp} XP`;
    const xpWidth = ctx.measureText(xpText).width;
    ctx.fillText(xpText, WIDTH - 50 - xpWidth, barY + barHeight + 32);

    return canvas.toBuffer('image/png');
};

module.exports = { buildRankCard };
