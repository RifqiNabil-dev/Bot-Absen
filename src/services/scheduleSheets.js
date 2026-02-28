const { getSheetsClient, authAvailable } = require("./sheetsAuth2");
const fs = require("fs");
const path = require("path");
const dayjs = require("dayjs");

const cacheFilePath = path.join(__dirname, "../../data/schedule.json");

/**
 * Reads the 'Boss Next' schedule from column G.
 * Note: These ranges and sheet names are placeholders and need to be configured!
 */
async function readSchedule() {
  if (!authAvailable) {
    console.log("Cannot read schedule: Google Auth not available.");
    return [];
  }

  const spreadsheetId = process.env.SCHEDULE_SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error("SCHEDULE_SPREADSHEET_ID is missing from .env");
  }

  try {
    const sheets = await getSheetsClient();

    // TODO: Update the tab name ("Sheet1") and range (A:G) to match your actual setup.
    const range = "Erica 4!F:J";

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      console.log("No schedule data found.");
      return [];
    }

    const scheduledBosses = [];
    const now = dayjs();
    const todayStr = now.format("YYYY-MM-DD");

    // Skip header row
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 2) continue;

      // Range is "F:J", so:
      // row[0] = Column F (Boss Name)
      // row[1] = Column G (Boss Next Date)
      // row[4] = Column J (Boss Points)

      const bossName = (row[0] || "").trim();
      const bossPointsRaw = (row[4] || "").trim();
      const bossNextDateStr = (row[1] || "").trim();

      // Only read rows where points column (row[4]) has a value and not just empty/whitespace
      if (
        bossName &&
        bossNextDateStr &&
        bossPointsRaw !== "" &&
        bossName !== "Boss Name"
      ) {
        let appearDate = dayjs(`${todayStr} ${bossNextDateStr}`);
        if (!appearDate.isValid()) continue;

        // Handle midnight crossing
        if (now.diff(appearDate, "hour") > 12) {
          appearDate = appearDate.add(1, "day");
        } else if (appearDate.diff(now, "hour") > 12) {
          appearDate = appearDate.subtract(1, "day");
        }

        const minutesPastAppear = now.diff(appearDate, "minute");

        // Filter out bosses that are > 2 minutes in the past
        if (minutesPastAppear > 2) {
          continue;
        }

        const bossPoints = parseInt(bossPointsRaw) || 0;
        scheduledBosses.push({
          bossName,
          bossPoints,
          appearDate: bossNextDateStr,
        });
      }
    }

    return scheduledBosses;
  } catch (error) {
    console.error("Error reading schedule from Google Sheets:", error);
    return [];
  }
}

async function saveScheduleToCache(data) {
  try {
    const dir = path.dirname(cacheFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(cacheFilePath, JSON.stringify(data, null, 2));
    console.log("Schedule saved to cache successfully.");
  } catch (error) {
    console.error("Error saving schedule to cache:", error);
  }
}

async function readScheduleFromCache() {
  try {
    if (!fs.existsSync(cacheFilePath)) {
      return [];
    }
    const data = fs.readFileSync(cacheFilePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading schedule from cache:", error);
    return [];
  }
}

async function removeFromSchedule(bossName) {
  try {
    const scheduledBosses = await readScheduleFromCache();
    const filteredBosses = scheduledBosses.filter(
      (b) => b.bossName !== bossName,
    );
    await saveScheduleToCache(filteredBosses);
    console.log(`Boss ${bossName} removed from schedule cache.`);
    return true;
  } catch (error) {
    console.error(`Error removing ${bossName} from schedule:`, error);
    return false;
  }
}

module.exports = {
  readSchedule,
  saveScheduleToCache,
  readScheduleFromCache,
  removeFromSchedule,
};
