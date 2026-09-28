// TOPGG_TOKEN comes from your bot's page on top.gg → Edit → Webhooks → Token.
const API = 'https://top.gg/api';
const STATS_INTERVAL = 30 * 60 * 1000;

const token = () => process.env.TOPGG_TOKEN;

const hasVoted = async (botId, userId) => {
    if (!token()) return null;

    try {
        const response = await fetch(`${API}/bots/${botId}/check?userId=${userId}`, {
            headers: { Authorization: token() },
        });

        if (!response.ok) {
            console.error('top.gg vote check returned:', response.status);
            return null;
        }

        const data = await response.json();
        return data.voted === 1;
    } catch (error) {
        console.error('Failed to check top.gg vote:', error.message);
        return null;
    }
};

const postStats = async (client) => {
    try {
        const response = await fetch(`${API}/bots/${client.user.id}/stats`, {
            method: 'POST',
            headers: { Authorization: token(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ server_count: client.guilds.cache.size }),
        });

        if (!response.ok) console.error('top.gg stats post returned:', response.status);
    } catch (error) {
        console.error('Failed to post stats to top.gg:', error.message);
    }
};

const startTopggStats = (client) => {
    if (!token()) return;

    postStats(client);
    setInterval(() => postStats(client), STATS_INTERVAL);
};

module.exports = { hasVoted, startTopggStats };
