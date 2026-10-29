// pm2 process file: `pm2 start ecosystem.config.js` keeps Crimstone running and
// restarts it after a crash. kill_timeout gives shutdown time to save data.
module.exports = {
    apps: [
        {
            name: 'crimstone',
            script: 'index.js',
            autorestart: true,
            restart_delay: 5000,
            max_restarts: 50,
            kill_timeout: 10000,
        },
    ],
};
