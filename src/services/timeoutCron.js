const cron = require("node-cron");
const dbQueries = require("../db/queries");
const dayjs = require("dayjs");

function initTimeoutCron(client) {
  // Run every minute
  cron.schedule("* * * * *", async () => {
    try {
      const activeAbsences = await dbQueries.getActiveAbsences();
      const now = dayjs();

      for (const absence of activeAbsences) {
        // Parse the creation date
        const createDate = dayjs(absence.create_date, "YYYY-MM-DD HH:mm");

        // If it's been more than 5 hours since creation
        if (now.diff(createDate, "hour", true) >= 2) {
          console.log(
            `Absence ${absence.message_id} has expired (2 hours). Closing...`,
          );

          // Mark inactive in DB
          await dbQueries.closeAbsence(absence.message_id);

          // Remove buttons from Discord Message
          const channel = client.channels.cache.get(
            process.env.ATTENDANCE_CHANNEL_ID,
          );
          if (channel) {
            try {
              const message = await channel.messages.fetch(absence.message_id);
              if (message) {
                await message.edit({ components: [] });
              }
            } catch (err) {
              if (err.code !== 10008) {
                // Ignore Unknown Message
                console.error(
                  `Could not remove buttons for expired message ${absence.message_id}:`,
                  err,
                );
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Error running timeout cron:", error);
    }
  });

  console.log("Timeout cron job initialized.");
}

module.exports = { initTimeoutCron };
