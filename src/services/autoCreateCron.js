const cron = require("node-cron");
const dayjs = require("dayjs");
const {
  EmbedBuilder,
  AttachmentBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const {
  readSchedule,
  saveScheduleToCache,
  readScheduleFromCache,
} = require("./scheduleSheets");
const dbQueries = require("../db/queries");
const { getBossImage } = require("../utils/imageMapper");
const { createAttendanceUI } = require("../utils/attendanceUI");

function initAutoCreateCron(client) {
  // 1. Fetch from Google Sheets every 30 minutes and save to JSON cache
  cron.schedule("*/30 * * * *", async () => {
    try {
      console.log("Fetching latest schedule from Google Sheets...");
      const scheduledBosses = await readSchedule();
      if (scheduledBosses.length > 0) {
        await saveScheduleToCache(scheduledBosses);
      }
    } catch (error) {
      console.error("Error fetching schedule for cache:", error);
    }
  });

  // 2. Check local JSON cache every 10 seconds and create absence if needed
  cron.schedule("*/10 * * * * *", async () => {
    try {
      const scheduledBosses = await readScheduleFromCache();
      if (scheduledBosses.length === 0) return;

      const now = dayjs();
      const attendanceChannel = client.channels.cache.get(
        process.env.ATTENDANCE_CHANNEL_ID,
      );

      if (!attendanceChannel) {
        console.error("Attendance channel not found for auto-create.");
        return;
      }

      for (const boss of scheduledBosses) {
        const todayStr = now.format("YYYY-MM-DD");
        let appearDate = dayjs(`${todayStr} ${boss.appearDate}`);

        if (!appearDate.isValid()) continue;

        if (now.diff(appearDate, "hour") > 12) {
          appearDate = appearDate.add(1, "day");
        }

        const minutesPastAppear = now.diff(appearDate, "minute");

        // Create the absence if it's at or within 1 minutes after the spawn time
        if (minutesPastAppear >= 0 && minutesPastAppear <= 1) {
          const existingAbsences = await dbQueries.getActiveAbsences();
          const alreadyExists = existingAbsences.some(
            (a) =>
              a.boss_name === boss.bossName &&
              a.appear_date === appearDate.format("HH:mm"),
          );

          if (alreadyExists) continue;

          const createDateStr = now.format("YYYY-MM-DD HH:mm");
          const formattedAppearDate = appearDate.format("HH:mm");
          const { embed, components: rows } = createAttendanceUI(
            boss.bossName,
            boss.bossPoints,
            formattedAppearDate,
            createDateStr,
          );

          const message = await attendanceChannel.send({
            embeds: [embed],
            components: rows,
          });

          embed.setFooter({ text: `Message ID: ${message.id}` });
          await message.edit({ embeds: [embed] });

          await dbQueries.createAbsence(
            message.id,
            boss.bossName,
            boss.bossPoints,
            createDateStr,
            formattedAppearDate,
          );

          const logChannel = client.channels.cache.get(
            process.env.LOG_CHANNEL_ID,
          );
          if (logChannel) {
            const logEmbed = new EmbedBuilder()
              .setColor("#ff0000")
              .setTitle(`🛠️ Control Spawn: ${boss.bossName}`)
              .setDescription(
                `A new boss appearance has been auto-created.\n**Channel**: <#${process.env.ATTENDANCE_CHANNEL_ID}>\n**Boss SpawnTime**: ${formattedAppearDate}\n**Created Time**: ${createDateStr}\n**Message ID**: ${message.id}`,
              )
              .setTimestamp();

            const logRow = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId(`delete_absence_${message.id}`)
                .setLabel("Delete Absensi")
                .setStyle(ButtonStyle.Danger)
                .setEmoji("🗑️"),
            );

            await logChannel.send({ embeds: [logEmbed], components: [logRow] });
          }
        }
      }
    } catch (error) {
      console.error("Error in auto-create check cron:", error);
    }
  });

  // Initial fetch on startup
  (async () => {
    try {
      console.log("Performing initial schedule fetch on startup...");
      const scheduledBosses = await readSchedule();
      if (scheduledBosses.length > 0) {
        await saveScheduleToCache(scheduledBosses);
      }
    } catch (error) {
      console.error("Initial schedule fetch failed:", error);
    }
  })();

  console.log("Auto-create schedule crons initialized.");
}

module.exports = { initAutoCreateCron };
