const { Events } = require("discord.js");

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);

      if (!command) {
        console.error(
          `No command matching ${interaction.commandName} was found.`,
        );
        return;
      }

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(`Error executing ${interaction.commandName}`);
        console.error(error);
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({
            content: "There was an error while executing this command!",
            ephemeral: true,
          });
        } else {
          await interaction.reply({
            content: "There was an error while executing this command!",
            ephemeral: true,
          });
        }
      }
    } else if (interaction.isButton()) {
      const { customId, message, user, member } = interaction;
      const dbQueries = require("../db/queries");
      const { writeAttendance } = require("../services/attendanceSheets");

      if (customId === "take_attendance") {
        await interaction.deferReply({ ephemeral: true });

        try {
          const absence = await dbQueries.getAbsence(message.id);
          if (!absence) {
            return interaction.editReply(
              "Cannot find this absence in the database.",
            );
          }
          if (!absence.is_active) {
            return interaction.editReply("This absence is no longer active.");
          }

          const profileName =
            member?.nickname || user.globalName || user.username;
          const attendanceDate = require("dayjs")().format(
            "YYYY-MM-DD HH:mm:ss",
          );

          const result = await dbQueries.addAttendance(
            message.id,
            user.id,
            profileName,
            attendanceDate,
          );

          if (!result.success) {
            return interaction.editReply(
              "You have already taken attendance for this boss!",
            );
          }

          // Rebuild the embed list
          const latestAttendance = await dbQueries.getAttendance(message.id);
          const embed = message.embeds[0];
          if (embed) {
            const { EmbedBuilder } = require("discord.js");
            const newEmbed = EmbedBuilder.from(embed);

            const listString =
              latestAttendance
                .map((record, index) => `${index + 1}. ${record.profile_name}`)
                .join("\n") || "No one has checked in yet.";

            const fieldIndex = newEmbed.data.fields?.findIndex((f) =>
              f.name.includes("📄Participants List"),
            );
            if (fieldIndex !== undefined && fieldIndex !== -1) {
              newEmbed.data.fields[fieldIndex].name = `📄Participants List (${latestAttendance.length})`;
              newEmbed.data.fields[fieldIndex].value = listString;
            }

            await message.edit({ embeds: [newEmbed] });
          }

          // Write to Google Sheets
          await writeAttendance(
            message.id,
            profileName,
            absence.boss_name,
            absence.boss_points,
            attendanceDate,
            absence.create_date,
            absence.appear_date,
          );

          await interaction.editReply(
            `Successfully recorded attendance as **${profileName}**.`,
          );
        } catch (error) {
          console.error("Error taking attendance:", error);
          await interaction.editReply(
            "An error occurred while processing your attendance.",
          );
        }
      } else if (customId === "cancel_attendance") {
        await interaction.deferReply({ ephemeral: true });

        try {
          const absence = await dbQueries.getAbsence(message.id);
          if (!absence) {
            return interaction.editReply(
              "Cannot find this absence in the database.",
            );
          }
          if (!absence.is_active) {
            return interaction.editReply("This absence is no longer active.");
          }

          // Check if user has an attendance record
          const latestAttendance = await dbQueries.getAttendance(message.id);
          const userRecord = latestAttendance.find(
            (r) => r.user_id === user.id,
          );

          if (!userRecord) {
            return interaction.editReply(
              "You have not joined this attendance.",
            );
          }

          const profileName = userRecord.profile_name;

          // 1. Remove from Database
          await dbQueries.removeAttendance(message.id, user.id);

          // 2. Remove from Google Sheets
          const {
            removeAttendanceRecord,
          } = require("../services/attendanceSheets");
          await removeAttendanceRecord(message.id, profileName);

          // 3. Update the Embed
          const updatedAttendance = await dbQueries.getAttendance(message.id);
          const embed = message.embeds[0];
          if (embed) {
            const newEmbed = require("discord.js").EmbedBuilder.from(embed);

            const listString =
              updatedAttendance
                .map((record, index) => `${index + 1}. ${record.profile_name}`)
                .join("\n") || "No one has checked in yet.";

            const fieldIndex = newEmbed.data.fields?.findIndex((f) =>
              f.name.includes("📄Participants List"),
            );
            if (fieldIndex !== undefined && fieldIndex !== -1) {
              const totalCount = updatedAttendance.length;
              newEmbed.data.fields[fieldIndex].name = `📄Participants List (${totalCount})`;
              newEmbed.data.fields[fieldIndex].value = listString;
            }

            await message.edit({ embeds: [newEmbed] });
          }

          await interaction.editReply(
            `Successfully canceled your attendance as **${profileName}**.`,
          );
        } catch (error) {
          console.error("Error canceling attendance:", error);
          await interaction.editReply(
            "An error occurred while canceling your attendance.",
          );
        }
      } else if (customId === "close_absence") {
        // Check permissions
        if (!member.roles.cache.has(process.env.CLOSE_ROLE_ID)) {
          return interaction.reply({
            content: `You do not have permission to close this absence. You need the <@&${process.env.CLOSE_ROLE_ID}> role.`,
            ephemeral: true,
          });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
          await dbQueries.closeAbsence(message.id);

          // Remove buttons from message as per spec
          const embed = message.embeds[0];
          if (embed) {
            const { EmbedBuilder } = require("discord.js");
            const newEmbed = EmbedBuilder.from(embed);
            const footerText = embed.footer?.text || "";

            const closingProfileName =
              interaction.member?.nickname ||
              interaction.user.globalName ||
              interaction.user.username;

            const closeTime = require("dayjs")().format("HH:mm");

            newEmbed.setFooter({
              text: `${footerText}\nClosed by: ${closingProfileName} • ${closeTime}`,
            });
            await message.edit({ embeds: [newEmbed], components: [] });
          } else {
            await message.edit({ components: [] });
          }

          await interaction.editReply(
            "Absence closed successfully. Buttons have been removed.",
          );
        } catch (error) {
          console.error("Error closing absence:", error);
          await interaction.editReply("Failed to close the absence.");
        }
      } else if (customId.startsWith("delete_absence_")) {
        const targetMessageId = customId.replace("delete_absence_", "");
        const {
          EmbedBuilder,
          ActionRowBuilder,
          ButtonBuilder,
          ButtonStyle,
        } = require("discord.js");

        await interaction.deferReply({ ephemeral: true });

        try {
          const absence = await dbQueries.getAbsence(targetMessageId);
          if (!absence) {
            return interaction.editReply("Absence not found in database.");
          }

          const confirmEmbed = new EmbedBuilder()
            .setColor("#ff9900")
            .setTitle("⚠️ Confirm Delete")
            .setDescription(
              `Are you sure you want to delete the absence record for **${absence.boss_name}**?\n\nThis will:\n1. Delete the message from <#${process.env.ATTENDANCE_CHANNEL_ID}>\n2. Remove all records from the database\n3. Remove records from Google Sheets\n4. Remove from the spawn schedule`,
            )
            .setTimestamp();

          const confirmRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(
                `confirm_delete_absence_${targetMessageId}_${interaction.message.id}`,
              )
              .setLabel("Yes, Delete")
              .setStyle(ButtonStyle.Danger)
              .setEmoji("🗑️"),
            new ButtonBuilder()
              .setCustomId(`cancel_delete_absence`)
              .setLabel("No, Cancel")
              .setStyle(ButtonStyle.Secondary),
          );

          await interaction.editReply({
            embeds: [confirmEmbed],
            components: [confirmRow],
          });
        } catch (error) {
          console.error("Error showing deletion confirmation:", error);
          await interaction.editReply(
            "An error occurred while preparing the confirmation.",
          );
        }
      } else if (customId.startsWith("confirm_delete_absence_")) {
        const parts = customId.split("_");
        const targetMessageId = parts[3];
        const logMessageId = parts[4];
        const {
          deleteAttendanceByMessageId,
        } = require("../services/attendanceSheets");
        const { removeFromSchedule } = require("../services/scheduleSheets");

        await interaction.deferUpdate();

        try {
          // 0. Fetch absence data
          const absence = await dbQueries.getAbsence(targetMessageId);
          if (!absence) {
            return interaction.followUp({
              content: "Absence not found in database.",
              ephemeral: true,
            });
          }

          // 1. Delete from Discord (Attendance Channel)
          const attendanceChannel = client.channels.cache.get(
            process.env.ATTENDANCE_CHANNEL_ID,
          );
          if (attendanceChannel) {
            try {
              const targetMessage =
                await attendanceChannel.messages.fetch(targetMessageId);
              if (targetMessage) await targetMessage.delete();
            } catch (err) {
              console.warn(
                `Target message ${targetMessageId} not found or already deleted.`,
              );
            }
          }

          // 2. Delete from SQLite
          await dbQueries.deleteAbsenceByMessageId(targetMessageId);

          // 3. Delete from Google Sheets
          await deleteAttendanceByMessageId(targetMessageId);

          // 4. Remove from schedule cache to prevent auto-create re-loading
          await removeFromSchedule(absence.boss_name);

          // 5. Update the Log Message
          const logEmbed = require("discord.js").EmbedBuilder.from(
            message.embeds[0],
          )
            .setColor("#808080")
            .setDescription(
              (message.embeds[0].description || "") +
                "\n\n✅ **Deleted successfully from system and schedule.**",
            );

          await interaction.editReply({
            content: `Successfully deleted absence for **${absence.boss_name}** and removed from schedule.`,
            embeds: [logEmbed],
            components: [],
          });

          // 6. Update the original Log Message (remove buttons)
          const logChannel = client.channels.cache.get(
            process.env.LOG_CHANNEL_ID,
          );
          if (logChannel && logMessageId) {
            try {
              const originalLogMessage =
                await logChannel.messages.fetch(logMessageId);
              if (originalLogMessage) {
                const logEmbed = require("discord.js").EmbedBuilder.from(
                  originalLogMessage.embeds[0],
                )
                  .setColor("#808080")
                  .setDescription(
                    (originalLogMessage.embeds[0].description || "") +
                      "\n\n✅ **Absence Deleted and processed.**",
                  );
                await originalLogMessage.edit({
                  embeds: [logEmbed],
                  components: [],
                });
              }
            } catch (err) {
              console.warn(
                `Could not fetch or update original log message ${logMessageId}:`,
                err,
              );
            }
          }
        } catch (error) {
          console.error("Error during full deletion cleanup:", error);
          await interaction.followUp({
            content: "An error occurred during deletion.",
            ephemeral: true,
          });
        }
      } else if (customId === "cancel_delete_absence") {
        await interaction.update({
          content: "❌ Deletion cancelled.",
          embeds: [],
          components: [],
        });
      }
    } else if (interaction.isAutocomplete()) {
      const command = interaction.client.commands.get(interaction.commandName);

      if (!command) {
        console.error(
          `No command matching ${interaction.commandName} was found.`,
        );
        return;
      }

      try {
        if ("autocomplete" in command) {
          await command.autocomplete(interaction);
        }
      } catch (error) {
        console.error(error);
      }
    }
  },
};
