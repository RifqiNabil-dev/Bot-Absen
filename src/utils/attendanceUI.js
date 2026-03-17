const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

function createAttendanceUI(
  bossName,
  bossPoints,
  appearDate,
  createDate,
  attendanceList = [],
) {
  const isOrfen = bossName.toLowerCase() === "orfen";
  const { getBossImage } = require("./imageMapper");
  const bossImageUrl = getBossImage(bossName);

  const embed = new EmbedBuilder()
    .setColor("#0099ff")
    .setTitle(`⚔️ Boss Spawn: ${bossName} ⚔️`)
    .setImage(bossImageUrl)
    .addFields(
      { name: "Boss Points", value: `${bossPoints}`, inline: true },
      { name: "Spawn Time", value: appearDate, inline: true },
      { name: "Created Time", value: createDate, inline: true },
    )
    .setTimestamp();

  if (isOrfen) {
    for (let p = 1; p <= 3; p++) {
      const phaseAttendance = attendanceList.filter((a) => a.phase === p);
      const points = p === 2 ? 65 : 30;
      const listString =
        phaseAttendance
          .map((record, index) => `${index + 1}. ${record.profile_name}`)
          .join("\n") || "No one checked in.";

      embed.addFields({
        name: `📄Phase ${p} (${points} pts) (${phaseAttendance.length})`,
        value: listString,
      });
    }
  } else {
    const listString =
      attendanceList
        .map((record, index) => `${index + 1}. ${record.profile_name}`)
        .join("\n") || "No one has checked in yet.";

    embed.addFields({
      name: `📄Participants List (${attendanceList.length})`,
      value: listString,
    });
  }

  let rows = [];
  if (isOrfen) {
    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("orfen_p1")
        .setLabel("Phase 1")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("1️⃣"),
      new ButtonBuilder()
        .setCustomId("orfen_p2")
        .setLabel("Phase 2")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("2️⃣"),
      new ButtonBuilder()
        .setCustomId("orfen_p3")
        .setLabel("Phase 3")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("3️⃣"),
    );
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("cancel_attendance")
        .setLabel("Cancel Attendance")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("❌"),
      new ButtonBuilder()
        .setCustomId("close_absence")
        .setLabel("Close Event")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("🛑"),
    );
    rows = [row1, row2];
  } else {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("take_attendance")
        .setLabel("Join Attendance")
        .setStyle(ButtonStyle.Success)
        .setEmoji("✅"),
      new ButtonBuilder()
        .setCustomId("cancel_attendance")
        .setLabel("Cancel Attendance")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("❌"),
      new ButtonBuilder()
        .setCustomId("close_absence")
        .setLabel("Close Event")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("🛑"),
    );
    rows = [row];
  }

  return { embed, components: rows };
}

module.exports = { createAttendanceUI };
