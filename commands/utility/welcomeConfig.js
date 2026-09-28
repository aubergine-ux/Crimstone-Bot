const { PermissionFlagsBits } = require('discord.js');
const { createStore } = require('./jsonStore.js');
const { fillTemplate, memberValues } = require('./template.js');

const store = createStore('welcomeConfig.json');

const DEFAULTS = {
    joinChannel: null,
    joinMessage: '👋 Welcome to **{server}**, {user}! You\'re member **#{count}**.',
    leaveChannel: null,
    leaveMessage: '📤 **{username}** has left **{server}**.',
    autoRoles: [],
};

const readWelcome = () => store.read();

const getWelcomeConfig = (guildId) => {
    const saved = readWelcome()[guildId] || {};

    return {
        joinChannel: saved.joinChannel || DEFAULTS.joinChannel,
        joinMessage: saved.joinMessage || DEFAULTS.joinMessage,
        leaveChannel: saved.leaveChannel || DEFAULTS.leaveChannel,
        leaveMessage: saved.leaveMessage || DEFAULTS.leaveMessage,
        autoRoles: [...(saved.autoRoles || DEFAULTS.autoRoles)],
    };
};

const setWelcomeConfig = (guildId, updates) => {
    const config = readWelcome();

    if (!config[guildId]) config[guildId] = {};

    Object.keys(updates).forEach(field => {
        config[guildId][field] = updates[field];
    });

    store.write(config);
};

const resetWelcomeConfig = (guildId) => {
    const config = readWelcome();

    if (config[guildId]) {
        delete config[guildId];
        store.write(config);
    }
};

// type is 'join' or 'leave'. Returns false when there's nowhere to post.
const sendGreeting = async (member, type) => {
    const config = getWelcomeConfig(member.guild.id);
    const channelId = type === 'join' ? config.joinChannel : config.leaveChannel;
    const template = type === 'join' ? config.joinMessage : config.leaveMessage;

    if (!channelId) return false;

    const channel = member.guild.channels.cache.get(channelId);

    if (!channel) return false;

    const canPost = channel.permissionsFor(member.guild.members.me)?.has([
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
    ]);

    if (!canPost) return false;

    try {
        await channel.send({
            content: fillTemplate(template, memberValues(member)).slice(0, 2000),
            allowedMentions: { users: type === 'join' ? [member.id] : [] },
        });
        return true;
    } catch (error) {
        console.error(`Failed to send the ${type} message:`, error.message);
        return false;
    }
};

const giveAutoRoles = async (member) => {
    const { autoRoles } = getWelcomeConfig(member.guild.id);

    if (autoRoles.length === 0 || member.user.bot) return;

    const me = member.guild.members.me;

    if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) return;

    const assignable = autoRoles.filter(roleId => {
        const role = member.guild.roles.cache.get(roleId);
        return role && !role.managed && role.position < me.roles.highest.position;
    });

    if (assignable.length === 0) return;

    try {
        await member.roles.add(assignable, 'Auto role on join');
    } catch (error) {
        console.error('Failed to give auto roles:', error.message);
    }
};

module.exports = { getWelcomeConfig, setWelcomeConfig, resetWelcomeConfig, sendGreeting, giveAutoRoles, DEFAULTS };
