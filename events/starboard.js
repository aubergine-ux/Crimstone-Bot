const { Events, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getStarboard, setPost } = require('../commands/utility/starboardStore.js');

const locks = new Map();

const matchesEmoji = (emoji, configured) => {
    const custom = configured.match(/^<a?:\w+:(\d+)>$/);

    if (custom) return emoji.id === custom[1];

    return emoji.name === configured;
};

const starEmbed = (message) => {
    const embed = new EmbedBuilder()
        .setColor(0xF1C40F)
        .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
        .addFields({ name: 'Source', value: `[Jump to message](${message.url})` })
        .setFooter({ text: `Message ID: ${message.id}` })
        .setTimestamp(message.createdAt);

    if (message.content) embed.setDescription(message.content.slice(0, 4096));

    const image = message.attachments.find(attachment => attachment.contentType?.startsWith('image/'));

    if (image) embed.setImage(image.url);

    return embed;
};

const countStars = async (reaction, authorId) => {
    const users = await reaction.users.fetch();

    return users.filter(user => user.id !== authorId && !user.bot).size;
};

const updateStarboard = async (reaction) => {
    const guildId = reaction.message.guildId;

    if (!guildId) return;

    const config = getStarboard(guildId);

    if (!config.channelId || reaction.message.channelId === config.channelId) return;
    if (!matchesEmoji(reaction.emoji, config.emoji)) return;

    let count;

    try {
        if (reaction.partial) await reaction.fetch();
        count = reaction.count;
    } catch {
        count = 0;
    }

    const message = reaction.message.partial ? await reaction.message.fetch() : reaction.message;

    if (message.author.bot) return;

    const starboard = message.guild.channels.cache.get(config.channelId);

    if (!starboard) return;
    if (message.channel.nsfw && !starboard.nsfw) return;

    const canPost = starboard.permissionsFor(message.guild.members.me)?.has([
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
    ]);

    if (!canPost) return;

    const stars = count >= config.threshold ? await countStars(reaction, message.author.id) : 0;
    const postId = config.posts[message.id];
    const content = `${config.emoji} **${stars}** · <#${message.channel.id}>`;

    if (stars >= config.threshold) {
        if (postId) {
            const post = await starboard.messages.fetch(postId).catch(() => null);

            if (post) {
                await post.edit({ content: content });
                return;
            }
        }

        const post = await starboard.send({ content: content, embeds: [starEmbed(message)] });
        setPost(message.guild.id, message.id, post.id);
        return;
    }

    if (postId) {
        await starboard.messages.delete(postId).catch(() => null);
        setPost(message.guild.id, message.id, null);
    }
};

const handleReaction = async (reaction) => {
    const key = reaction.message.id;
    const previous = locks.get(key) || Promise.resolve();

    const current = previous
        .then(() => updateStarboard(reaction))
        .catch(error => console.error('Failed to update the starboard:', error.message))
        .finally(() => {
            if (locks.get(key) === current) locks.delete(key);
        });

    locks.set(key, current);

    await current;
};

module.exports = [
    {
        name: Events.MessageReactionAdd,

        async execute(reaction) {
            await handleReaction(reaction);
        },
    },
    {
        name: Events.MessageReactionRemove,

        async execute(reaction) {
            await handleReaction(reaction);
        },
    },
];
