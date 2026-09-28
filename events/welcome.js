const { Events } = require('discord.js');
const { checkJoin, wasAutoKicked } = require('../commands/utility/automodEngine.js');
const { sendGreeting, giveAutoRoles } = require('../commands/utility/welcomeConfig.js');

module.exports = [
    {
        name: Events.GuildMemberAdd,

        async execute(member) {
            try {
                if (await checkJoin(member)) return;

                if (!member.pending) await giveAutoRoles(member);

                await sendGreeting(member, 'join');
            } catch (error) {
                console.error('Failed to handle a member joining:', error.message);
            }
        },
    },
    {
        name: Events.GuildMemberUpdate,

        async execute(oldMember, newMember) {
            if (oldMember.pending && !newMember.pending) await giveAutoRoles(newMember);
        },
    },
    {
        name: Events.GuildMemberRemove,

        async execute(member) {
            if (wasAutoKicked(member)) return;

            await sendGreeting(member, 'leave');
        },
    },
];
