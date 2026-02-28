const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const path = require("path");
const fs = require("fs");

class Database {
  constructor() {
    this.db = null;
  }

  async init() {
    // Ensure db directory exists
    const dbDir = path.join(__dirname, "../../data");
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = await open({
      filename: path.join(dbDir, "database.sqlite"),
      driver: sqlite3.Database,
    });

    await this.createTables();
  }

  async createTables() {
    if (!this.db) throw new Error("Database not initialized");

    // Note: Using INTEGER instead of BOOLEAN because SQLite does not have a boolean datatype (uses 0/1)
    await this.db.exec(`
            CREATE TABLE IF NOT EXISTS bosses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE,
                points INTEGER
            );

            CREATE TABLE IF NOT EXISTS absences (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                message_id TEXT UNIQUE,
                boss_name TEXT,
                boss_points INTEGER,
                create_date TEXT,
                appear_date TEXT,
                is_active INTEGER DEFAULT 1
            );

            CREATE TABLE IF NOT EXISTS attendance (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                message_id TEXT,
                user_id TEXT,
                profile_name TEXT,
                attendance_date TEXT,
                FOREIGN KEY(message_id) REFERENCES absences(message_id)
            );
        `);
  }

  get() {
    if (!this.db) throw new Error("Database not initialized");
    return this.db;
  }
}

module.exports = new Database();
