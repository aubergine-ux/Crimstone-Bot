const { PermissionFlagsBits } = require('discord.js');
const { readAlerts, updateAlert } = require('./alertStore.js');
const { fillTemplate } = require('./template.js');

const POLL_INTERVAL = 3 * 60 * 1000;
const REQUEST_TIMEOUT = 10000;

const DEFAULT_MESSAGES = {
    youtube: '📺 **{name}** just posted a new video: **{title}**\n{link}',
    twitch: '🔴 **{name}** is live on Twitch: **{title}**\n{link}',
};

let twitchToken = null;
let running = false;

const decodeXml = (text) => {
    return text
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, '\'')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
};

const fetchYoutubeFeed = async (channelId) => {
    const response = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    });

    if (!response.ok) throw new Error(`YouTube feed returned ${response.status}`);

    const xml = await response.text();
    const name = xml.match(/<title>([^<]*)<\/title>/);

    const videos = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(entry => {
        const body = entry[1];

        return {
            id: body.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1],
            title: decodeXml(body.match(/<title>([^<]*)<\/title>/)?.[1] || ''),
            published: Date.parse(body.match(/<published>([^<]+)<\/published>/)?.[1] || 0),
        };
    }).filter(video => video.id);

    return { name: name ? decodeXml(name[1]) : channelId, videos: videos };
};

const resolveYoutube = async (input) => {
    const cleaned = input.trim();
    const direct = cleaned.match(/(UC[\w-]{22})/);

    let channelId = direct ? direct[1] : null;

    if (!channelId) {
        const handle = cleaned.match(/@([\w.-]+)/)?.[1] || cleaned;
        const response = await fetch(`https://www.youtube.com/@${encodeURIComponent(handle)}`, {
            signal: AbortSignal.timeout(REQUEST_TIMEOUT),
        });

        if (!response.ok) return null;

        const html = await response.text();
        const found = html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})"/)
            || html.match(/"externalId":"(UC[\w-]{22})"/);

        if (!found) return null;

        channelId = found[1];
    }

    const feed = await fetchYoutubeFeed(channelId);
    const latest = Math.max(0, ...feed.videos.map(video => video.published));

    return { account: channelId, name: feed.name, lastPublished: latest || Date.now() };
};

const twitchConfigured = () => Boolean(process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET);

const getTwitchToken = async () => {
    if (twitchToken && twitchToken.expiresAt > Date.now() + 60000) return twitchToken.value;

    const params = new URLSearchParams({
        client_id: process.env.TWITCH_CLIENT_ID,
        client_secret: process.env.TWITCH_CLIENT_SECRET,
        grant_type: 'client_credentials',
    });

    const response = await fetch(`https://id.twitch.tv/oauth2/token?${params}`, {
        method: 'POST',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    });

    if (!response.ok) throw new Error(`Twitch login returned ${response.status}`);

    const data = await response.json();

    twitchToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };

    return twitchToken.value;
};

const twitchRequest = async (path) => {
    const response = await fetch(`https://api.twitch.tv/helix/${path}`, {
        headers: {
            'Client-ID': process.env.TWITCH_CLIENT_ID,
            Authorization: `Bearer ${await getTwitchToken()}`,
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    });

    if (response.status === 401) twitchToken = null;
    if (!response.ok) throw new Error(`Twitch returned ${response.status}`);

    return (await response.json()).data;
};

const fetchTwitchStreams = async (logins) => {
    const streams = {};

    for (let i = 0; i < logins.length; i += 100) {
        const query = logins.slice(i, i + 100).map(login => `user_login=${encodeURIComponent(login)}`).join('&');
        const data = await twitchRequest(`streams?${query}`);

        data.forEach(stream => {
            streams[stream.user_login.toLowerCase()] = stream;
        });
    }

    return streams;
};

const resolveTwitch = async (input) => {
    const login = input.trim().replace(/^https?:\/\/(www\.)?twitch\.tv\//i, '').replace(/\/.*$/, '').toLowerCase();

    if (!/^\w{3,25}$/.test(login)) return null;

    const users = await twitchRequest(`users?login=${login}`);

    if (users.length === 0) return null;

    const streams = await fetchTwitchStreams([login]);

    return { account: login, name: users[0].display_name, lastStreamId: streams[login]?.id || null };
};

const announce = async (client, alert, values) => {
    const channel = client.channels.cache.get(alert.channelId);

    if (!channel) return;

    const canPost = channel.permissionsFor(channel.guild.members.me)?.has([
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
    ]);

    if (!canPost) return;

    let content = fillTemplate(alert.message || DEFAULT_MESSAGES[alert.platform], values);

    if (alert.roleId) content = `<@&${alert.roleId}> ${content}`;

    try {
        await channel.send({
            content: content.slice(0, 2000),
            allowedMentions: { roles: alert.roleId ? [alert.roleId] : [] },
        });
    } catch (error) {
        console.error(`Failed to post the ${alert.platform} alert for ${alert.name}:`, error.message);
    }
};

const pollYoutube = async (client, entries) => {
    const feeds = {};

    for (const { alert } of entries) {
        if (feeds[alert.account] !== undefined) continue;

        try {
            feeds[alert.account] = await fetchYoutubeFeed(alert.account);
        } catch (error) {
            console.error(`[ALERTS] Couldn't read the YouTube feed for ${alert.name}:`, error.message);
            feeds[alert.account] = null;
        }
    }

    for (const { guildId, alert } of entries) {
        const feed = feeds[alert.account];

        if (!feed) continue;

        const fresh = feed.videos
            .filter(video => video.published > alert.lastPublished)
            .sort((a, b) => a.published - b.published);

        if (fresh.length === 0) continue;

        updateAlert(guildId, alert.id, { lastPublished: fresh[fresh.length - 1].published, name: feed.name });

        for (const video of fresh.slice(-3)) {
            await announce(client, alert, {
                name: feed.name,
                title: video.title,
                link: `https://www.youtube.com/watch?v=${video.id}`,
            });
        }
    }
};

const pollTwitch = async (client, entries) => {
    if (!twitchConfigured()) return;

    let streams;

    try {
        streams = await fetchTwitchStreams([...new Set(entries.map(({ alert }) => alert.account))]);
    } catch (error) {
        console.error('[ALERTS] Couldn\'t check Twitch:', error.message);
        return;
    }

    for (const { guildId, alert } of entries) {
        const stream = streams[alert.account];

        if (!stream || stream.id === alert.lastStreamId) continue;

        updateAlert(guildId, alert.id, { lastStreamId: stream.id, name: stream.user_name });

        await announce(client, alert, {
            name: stream.user_name,
            title: stream.title,
            game: stream.game_name,
            link: `https://twitch.tv/${alert.account}`,
        });
    }
};

const poll = async (client) => {
    if (running) return;

    running = true;

    try {
        const alerts = readAlerts();
        const entries = { youtube: [], twitch: [] };

        Object.keys(alerts).forEach(guildId => {
            Object.values(alerts[guildId]).forEach(alert => {
                if (entries[alert.platform]) entries[alert.platform].push({ guildId: guildId, alert: alert });
            });
        });

        if (entries.youtube.length > 0) await pollYoutube(client, entries.youtube);
        if (entries.twitch.length > 0) await pollTwitch(client, entries.twitch);
    } catch (error) {
        console.error('[ALERTS] Poll failed:', error.message);
    } finally {
        running = false;
    }
};

const startAlerts = (client) => {
    setTimeout(() => poll(client), 15000);
    setInterval(() => poll(client), POLL_INTERVAL);
};

module.exports = { startAlerts, resolveYoutube, resolveTwitch, twitchConfigured, DEFAULT_MESSAGES };
