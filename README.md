# ⚔️ Bot-Absen Discord

A Discord bot designed for **Boss Attendance Management**, seamlessly integrated with **Google Sheets**. This bot is built to help gaming clans coordinate and track member participation during boss hunts effortlessly.

## 🚀 Key Features

- **📅 Automated Scheduling (Cron)**: Automatically fetches boss spawn schedules from Google Sheets every 30 minutes and creates attendance events in Discord on time.
- **✅ Interactive Attendance System**: Members can join or cancel their attendance simply by clicking buttons on the Discord embed.
- **📊 Google Sheets Integration**: All attendance data, participant lists, and boss points are synchronized in real-time to a spreadsheet for reporting and tracking.
- **🛠️ Boss Management (Admin)**: Dedicated slash commands to add, delete, or modify boss data and points directly from Discord.
- **📢 Notifications & Logs**: Includes a log channel to monitor bot performance and track attendance event history.
- **🖼️ Premium Visuals**: Each attendance event features relevant boss images (via image mapping) for a high-quality user experience.

## 📋 Prerequisites

Before running the bot, ensure you have:

- **Node.js** v18, v20, or higher.
- **Discord Bot Token** (from the [Discord Developer Portal](https://discord.com/developers/applications)).
- **Google Cloud Service Account** (`credentials.json` file) with access to the Google Sheets API.
- Google Sheets for **Schedules** and **Attendance Output**.

## 🛠️ Installation

1. **Clone this repository:**

   ```bash
   git clone https://github.com/RifqiNabil-dev/Bot-Absen.git
   cd bot-absen
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Configure Environment:**
   Copy `.env.example` to `.env` and fill in the required details:

   ```bash
   cp .env.example .env
   ```

4. **Set Up Google Credentials:**
   Place your `credentials.json` file in the root directory.

5. **Deploy Slash Commands:**

   ```bash
   node deploy-commands.js
   ```

6. **Start the Bot:**
   ```bash
   npm start
   ```

## 🎮 Slash Commands

- `/add_boss`: Add new boss data to the local database (Name & Points).
- `/delete_boss`: Delete boss data from the database.
- `/create_absence`: Manually create a boss attendance event (Admin only).
- `/delete_absence`: Delete an active attendance event.

## 📁 Project Structure

- `src/index.js`: Main entry point for the bot.
- `src/commands/`: Logic for each slash command.
- `src/services/`: Services for Google Sheets, Cron jobs, and business logic.
- `src/db/`: SQLite database setup for local data storage.
- `src/utils/`: Helper functions.

