const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  AutocompleteInteraction,
} = require("discord.js");
const dbQueries = require("../db/queries");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("delete_boss")
    .setDescription("Delete a boss from the database (Admin only)")
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("The name of the boss to delete")
        .setRequired(true)
        .setAutocomplete(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused();
    try {
      const bosses = await dbQueries.getBosses();
      const filtered = bosses
        .filter((boss) =>
          boss.name.toLowerCase().includes(focusedValue.toLowerCase()),
        )
        .slice(0, 25);

      await interaction.respond(
        filtered.map((boss) => ({ name: boss.name, value: boss.name })),
      );
    } catch (error) {
      console.error("Autocomplete error in /delete_boss:", error);
    }
  },

  async execute(interaction) {
    // Only allow in the admin channel
    if (interaction.channelId !== process.env.ADMIN_CHANNEL_ID) {
      return interaction.reply({
        content: `This command can only be used in the admin channel (<#${process.env.ADMIN_CHANNEL_ID}>).`,
        ephemeral: true,
      });
    }

    const name = interaction.options.getString("name");

    await interaction.deferReply({ ephemeral: true });

    try {
      const boss = await dbQueries.getBossByName(name);
      if (!boss) {
        return interaction.editReply(`Boss **${name}** not found.`);
      }

      const result = await dbQueries.deleteBoss(name);
      if (result.success && result.changes > 0) {
        await interaction.editReply(`Successfully deleted boss **${name}**.`);
      } else {
        await interaction.editReply(`Failed to delete boss **${name}**.`);
      }
    } catch (error) {
      console.error("Error in /delete_boss:", error);
      await interaction.editReply(
        "There was an error while deleting the boss from the database.",
      );
    }
  },
};
