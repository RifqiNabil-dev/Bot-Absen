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

  const listString =
    attendanceList
      .map((record, index) => `${index + 1}. ${record.profile_name}`)
      .join("\n") || "No one has checked in yet.";

  embed.addFields({
    name: `📄Participants List (${attendanceList.length})`,
    value: listString,
  });

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

  const rows = [row];

  return { embed, components: rows };
}

module.exports = { createAttendanceUI };
