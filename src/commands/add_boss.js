const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const dbQueries = require("../db/queries");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("add_boss")
    .setDescription("Add a new boss to the database (Admin only)")
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("The name of the boss")
        .setRequired(true),
    )
    .addIntegerOption((option) =>
      option
        .setName("points")
        .setDescription("The points awarded for this boss")
        .setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild), // Require management permissions

  async execute(interaction) {
    // Only allow in the admin channel
    if (interaction.channelId !== process.env.ADMIN_CHANNEL_ID) {
      return interaction.reply({
        content: `This command can only be used in the admin channel (<#${process.env.ADMIN_CHANNEL_ID}>).`,
        ephemeral: true,
      });
    }

    const name = interaction.options.getString("name");
    const points = interaction.options.getInteger("points");

    await interaction.deferReply({ ephemeral: true });

    try {
      const result = await dbQueries.addBoss(name, points);
      if (result.success) {
        await interaction.editReply(
          `Successfully added boss **${name}** with **${points} points**.`,
        );
      } else {
        await interaction.editReply(`Failed to add boss: ${result.error}`);
      }
    } catch (error) {
      console.error("Error in /add_boss:", error);
      await interaction.editReply(
        "There was an error while adding the boss to the database.",
      );
    }
  },
};
