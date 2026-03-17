process.env.TZ = "Asia/Jakarta";
require("dotenv").config();
const { Client, GatewayIntentBits, Collection } = require("discord.js");
const fs = require("fs");
const path = require("path");
const dns = require("dns");
const db = require("./db/connection");

// Force IPv4 as a priority. This fixes ConnectTimeoutError in many environments (Docker/Linux)
// where IPv6 lookup or connection might be problematic.
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder("ipv4first");
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  rest: {
    timeout: 30000, // Increase REST timeout to 30 seconds
    retries: 3,
  },
});

client.commands = new Collection();

// Load Commands
const commandsPath = path.join(__dirname, "commands");
if (fs.existsSync(commandsPath)) {
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".js"));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ("data" in command && "execute" in command) {
      client.commands.set(command.data.name, command);
    } else {
      console.log(
        `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`,
      );
    }
  }
}

// Load Events
const eventsPath = path.join(__dirname, "events");
if (fs.existsSync(eventsPath)) {
  const eventFiles = fs
    .readdirSync(eventsPath)
    .filter((file) => file.endsWith(".js"));
  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
  }
}

(async () => {
  try {
    console.log("Initializing database...");
    await db.init();

    console.log("Logging in...");
    await client.login(process.env.DISCORD_TOKEN);

    // Initialize cron jobs after client starts
    const { initTimeoutCron } = require("./services/timeoutCron");
    const { initAutoCreateCron } = require("./services/autoCreateCron");

    initTimeoutCron(client);
    initAutoCreateCron(client);
  } catch (error) {
    console.error("Failed to start bot:", error);
  }
})();
