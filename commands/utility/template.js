const fillTemplate = (template, values) => {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
        return values[key] !== undefined ? String(values[key]) : match;
    });
};

const memberValues = (member) => {
    return {
        user: `<@${member.id}>`,
        username: member.user.username,
        server: member.guild.name,
        count: member.guild.memberCount,
    };
};

module.exports = { fillTemplate, memberValues };
