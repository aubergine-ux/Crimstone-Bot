const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, InteractionContextType } = require('discord.js');
const { readLevels, writeLevels } = require('../utility/levelStore.js');
const { syncLevelRoles } = require('../utility/applyLevelRoles.js');

const CONFIRM_TIME = 30000;

const buildButtons = (finished) => {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('resetxp-confirm')
            .setLabel('Reset everyone')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(finished),
        new ButtonBuilder()
            .setCustomId('resetxp-cancel')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(finished),
    );
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resetxp')
        .setDescription('Reset XP for one member, or for the whole server.')
        .setContexts(InteractionContextType.Guild)
        .addUserOption(option =>
            option.setName('target').setDescription('The member to reset (leave empty to reset everyone)').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const user = interaction.options.getUser('target');
        const guildId = interaction.guild.id;

        if (user) {
            const levels = readLevels();

            if (!levels[guildId] || !levels[guildId][user.id]) {
                await interaction.reply({ content: `**${user.username}** has no XP to reset.` });
                return;
            }

            delete levels[guildId][user.id];

            writeLevels(levels);

            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setDescription(`✅ Reset **${user.username}**'s XP to **0**.`);

            await interaction.reply({ embeds: [embed] });

            const member = interaction.options.getMember('target');

            if (member) await syncLevelRoles(member);
            return;
        }

        const levels = readLevels();
        const count = Object.keys(levels[guildId] || {}).length;

        if (count === 0) {
            await interaction.reply({ content: 'No one in this server has any XP yet.' });
            return;
        }

        const response = await interaction.reply({
            content: `⚠️ This wipes XP for all **${count}** member${count === 1 ? '' : 's'} in this server and can't be undone. Are you sure?`,
            components: [buildButtons(false)],
            withResponse: true,
        });

        let button;

        try {
            button = await response.resource.message.awaitMessageComponent({
                filter: (pressed) => pressed.user.id === interaction.user.id,
                time: CONFIRM_TIME,
            });
        } catch (error) {
            await interaction.editReply({ content: 'Reset cancelled — no answer in time.', components: [buildButtons(true)] });
            return;
        }

        if (button.customId === 'resetxp-cancel') {
            await button.update({ content: 'Reset cancelled.', components: [buildButtons(true)] });
            return;
        }

        const fresh = readLevels();

        delete fresh[guildId];

        writeLevels(fresh);

        await button.update({
            content: `✅ Reset XP for **${count}** member${count === 1 ? '' : 's'}.\nLevel reward roles were left as they are — run \`/levelsync\` to remove them.`,
            components: [buildButtons(true)],
        });
    }
};
