const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { readGiveaways, updateGiveaway, removeGiveaway } = require('./giveawayStore.js');

const MAX_TIMEOUT = 2147483647;
const KEEP_ENDED = 7 * 86400000;

const timers = new Map();

let client = null;

const cancelTimer = (id) => {
    const timer = timers.get(id);

    if (timer) {
        clearTimeout(timer);
        timers.delete(id);
    }
};

const giveawayEmbed = (giveaway) => {
    const endsAt = Math.floor(giveaway.endsAt / 1000);
    const lines = [];

    if (giveaway.ended) {
        const winners = giveaway.winnerIds.length > 0
            ? giveaway.winnerIds.map(id => `<@${id}>`).join(', ')
            : 'No one entered.';

        lines.push(giveaway.cancelled ? '**Cancelled**' : `Ended <t:${endsAt}:R>`);
        lines.push(`Winners: ${giveaway.cancelled ? 'None' : winners}`);
    } else {
        lines.push('Click **Enter** to join!');
        lines.push(`Ends <t:${endsAt}:R> (<t:${endsAt}:f>)`);
        lines.push(`Winners: **${giveaway.winners}**`);
    }

    lines.push(`Hosted by <@${giveaway.hostId}>`);

    if (giveaway.minLevel > 0) lines.push(`Requires level **${giveaway.minLevel}**`);

    return new EmbedBuilder()
        .setColor(giveaway.ended ? 0x95A5A6 : 0xF1C40F)
        .setTitle(`🎉 ${giveaway.prize}`)
        .setDescription(lines.join('\n'))
        .setFooter({ text: `${giveaway.entrants.length} ${giveaway.entrants.length === 1 ? 'entry' : 'entries'}` });
};

const giveawayRow = (ended) => {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('giveaway:enter')
            .setLabel(ended ? 'Ended' : 'Enter')
            .setEmoji('🎉')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(ended),
    );
};

const pickWinners = (entrants, count, exclude = []) => {
    const pool = entrants.filter(id => !exclude.includes(id));

    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    return pool.slice(0, count);
};

const fetchMessage = async (giveaway) => {
    try {
        const channel = await client.channels.fetch(giveaway.channelId);
        return await channel.messages.fetch(giveaway.id);
    } catch (error) {
        console.error(`Giveaway ${giveaway.id} message could not be found:`, error.message);
        return null;
    }
};

const endGiveaway = async (id, cancelled = false) => {
    cancelTimer(id);

    const current = readGiveaways()[id];

    if (!current || current.ended) return null;

    const winnerIds = cancelled ? [] : pickWinners(current.entrants, current.winners);
    const giveaway = updateGiveaway(id, { ended: true, cancelled: cancelled, winnerIds: winnerIds, endsAt: Date.now() });

    if (!client) return giveaway;

    const message = await fetchMessage(giveaway);

    if (!message) return giveaway;

    try {
        await message.edit({ embeds: [giveawayEmbed(giveaway)], components: [giveawayRow(true)] });

        if (cancelled) return giveaway;

        if (winnerIds.length === 0) {
            await message.reply(`No one entered the giveaway for **${giveaway.prize}**, so there's no winner.`);
        } else {
            await message.reply(`🎉 Congratulations ${winnerIds.map(winner => `<@${winner}>`).join(', ')}! You won **${giveaway.prize}**!`);
        }
    } catch (error) {
        console.error(`Giveaway ${id} could not announce its winners:`, error.message);
    }

    return giveaway;
};

const rerollGiveaway = async (id, count) => {
    const giveaway = readGiveaways()[id];

    if (!giveaway || !giveaway.ended || giveaway.cancelled) return null;

    const winnerIds = pickWinners(giveaway.entrants, count, giveaway.winnerIds);

    if (winnerIds.length === 0) return [];

    const updated = updateGiveaway(id, { winnerIds: [...giveaway.winnerIds, ...winnerIds] });
    const message = await fetchMessage(updated);

    if (message) {
        try {
            await message.edit({ embeds: [giveawayEmbed(updated)] });
            await message.reply(`🎉 New winner${winnerIds.length === 1 ? '' : 's'}: ${winnerIds.map(winner => `<@${winner}>`).join(', ')}! You won **${giveaway.prize}**!`);
        } catch (error) {
            console.error(`Giveaway ${id} could not announce its reroll:`, error.message);
        }
    }

    return winnerIds;
};

const scheduleGiveaway = (giveaway) => {
    cancelTimer(giveaway.id);

    const delay = giveaway.endsAt - Date.now();

    if (delay > MAX_TIMEOUT) {
        timers.set(giveaway.id, setTimeout(() => scheduleGiveaway(giveaway), MAX_TIMEOUT));
        return;
    }

    timers.set(giveaway.id, setTimeout(() => endGiveaway(giveaway.id), Math.max(delay, 0)));
};

const startGiveaways = (readyClient) => {
    client = readyClient;

    const giveaways = Object.values(readGiveaways());
    const now = Date.now();

    let armed = 0;

    giveaways.forEach(giveaway => {
        if (!giveaway.ended) {
            scheduleGiveaway(giveaway);
            armed++;
        } else if (now - giveaway.endsAt > KEEP_ENDED) {
            removeGiveaway(giveaway.id);
        }
    });

    console.log(`[GIVEAWAYS] Armed ${armed} giveaway(s).`);
};

module.exports = { startGiveaways, scheduleGiveaway, endGiveaway, rerollGiveaway, giveawayEmbed, giveawayRow };
