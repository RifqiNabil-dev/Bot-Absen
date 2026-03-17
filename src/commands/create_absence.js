const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  AttachmentBuilder,
} = require("discord.js");
const dbQueries = require("../db/queries");
const dayjs = require("dayjs");
const { getBossImage } = require("../utils/imageMapper");
const { createAttendanceUI } = require("../utils/attendanceUI");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("create_absence")
    .setDescription("Create a new boss absence (Admin only)")
    .addStringOption((option) =>
      option
        .setName("boss")
        .setDescription("Select the boss")
        .setRequired(true)
        .setAutocomplete(true),
    )
    .addStringOption((option) =>
      option
        .setName("appear_date")
        .setDescription("When will the boss appear? (e.g. HH:mm)")
        .setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused();
    const bosses = await dbQueries.getBosses();

    let filtered = bosses.filter((boss) =>
      boss.name.toLowerCase().includes(focusedValue.toLowerCase()),
    );

    // Discord allows max 25 choices
    if (filtered.length > 25) {
      filtered = filtered.slice(0, 25);
    }

    await interaction.respond(
      filtered.map((boss) => ({
        name: `${boss.name} (${boss.points} pts)`,
        value: boss.name,
      })),
    );
  },

  async execute(interaction) {
    // Only allow in the admin channel to trigger it
    if (interaction.channelId !== process.env.ADMIN_CHANNEL_ID) {
      return interaction.reply({
        content: `This command can only be used in the admin channel (<#${process.env.ADMIN_CHANNEL_ID}>).`,
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const bossName = interaction.options.getString("boss");
    const appearDateStr = interaction.options.getString("appear_date");

    // Parse the time string and combine with today's date for validation
    const now = dayjs();
    const todayStr = now.format("YYYY-MM-DD");
    const appearDate = dayjs(`${todayStr} ${appearDateStr}`);

    if (!appearDate.isValid()) {
      return interaction.editReply(
        "Invalid `appear_date` format. Please use a format like `HH:mm` (e.g. 14:30).",
      );
    }

    const bossData = await dbQueries.getBossByName(bossName);
    if (!bossData) {
      return interaction.editReply(
        `Boss **${bossName}** not found. Please add it using \`/add_boss\` first.`,
      );
    }

    try {
      // Target the Attendance Channel
      const attendanceChannel = interaction.client.channels.cache.get(
        process.env.ATTENDANCE_CHANNEL_ID,
      );
      if (!attendanceChannel) {
        return interaction.editReply(
          `Could not find the attendance channel. Please check \`ATTENDANCE_CHANNEL_ID\` in .env.`,
        );
      }

      const now = dayjs();
      const createDateStr = now.format("YYYY-MM-DD HH:mm");
      const formattedAppearDate = appearDate.format("HH:mm");

      const bossImageUrl = getBossImage(bossData.name);

      const { embed, components: rows } = createAttendanceUI(
        bossData.name,
        bossData.points,
        formattedAppearDate,
        createDateStr,
      );

      // 2. Send the message to Channel 2
      const message = await attendanceChannel.send({
        embeds: [embed],
        components: rows,
      });

      // 3. Update footer with Message ID now that we have it
      const profileName =
        interaction.member?.nickname ||
        interaction.user.globalName ||
        interaction.user.username;
      embed.setFooter({
        text: `Message ID: ${message.id} • Created by: ${profileName}`,
      });
      await message.edit({ embeds: [embed] });

      // 4. Save to Database
      await dbQueries.createAbsence(
        message.id,
        bossData.name,
        bossData.points,
        createDateStr,
        formattedAppearDate,
      );

      await interaction.editReply(
        `Successfully created absence for **${bossData.name}** in <#${process.env.ATTENDANCE_CHANNEL_ID}>.`,
      );
    } catch (error) {
      console.error("Error creating absence:", error);
      await interaction.editReply(
        "An error occurred while creating the absence.",
      );
    }
  },
};
