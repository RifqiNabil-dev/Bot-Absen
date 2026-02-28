const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const dbQueries = require("../db/queries");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("delete_absence")
    .setDescription("Delete an absence by Spawn Time (Admin only)")
    .addStringOption((option) =>
      option
        .setName("time")
        .setDescription('The spawn time to delete (e.g., "HH:mm")')
        .setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    if (interaction.channelId !== process.env.ADMIN_CHANNEL_ID) {
      return interaction.reply({
        content: `This command can only be used in the admin channel (<#${process.env.ADMIN_CHANNEL_ID}>).`,
        ephemeral: true,
      });
    }

    const targetDate = interaction.options.getString("time");
    await interaction.deferReply({ ephemeral: true });

    try {
      // Find messages matching this date in DB *before* deleting them from DB
      const db = require("../db/connection").get();
      const absences = await db.all(
        "SELECT message_id FROM absences WHERE appear_date LIKE ?",
        [`${targetDate}%`],
      );

      if (absences.length === 0) {
        return interaction.editReply(
          `No absences found matching date: \`${targetDate}\``,
        );
      }

      // Attempt to delete original Discord messages first
      const attendanceChannel = interaction.client.channels.cache.get(
        process.env.ATTENDANCE_CHANNEL_ID,
      );
      let deletedMessagesCount = 0;

      if (attendanceChannel) {
        for (const absence of absences) {
          try {
            const message = await attendanceChannel.messages.fetch(
              absence.message_id,
            );
            if (message) {
              await message.delete();
              deletedMessagesCount++;
            }
          } catch (error) {
            // Ignore Unknown Message errors (10008), they might already be deleted
            if (error.code !== 10008) {
              console.error(
                `Failed to delete message ${absence.message_id}:`,
                error,
              );
            }
          }
        }
      }

      // Delete from Database
      const result = await dbQueries.deleteAbsence(targetDate);

      if (result.success) {
        await interaction.editReply(
          `Successfully deleted ${result.deleted} database records and ${deletedMessagesCount} Discord messages for date: \`${targetDate}\`.`,
        );
      } else {
        await interaction.editReply(
          `Failed to delete database records for date: \`${targetDate}\`.`,
        );
      }
    } catch (error) {
      console.error("Error in /delete_absence:", error);
      await interaction.editReply(
        "There was an error while deleting the absence.",
      );
    }
  },
};
