const { getSheetsClient, authAvailable } = require("./sheetsAuth");

/**
 * Writes the attendance record back to the sheet.
 * Format: Message ID, per-server profile name, boss name, boss points, member absence date, create absence date.
 */
async function writeAttendance(
  messageId,
  profileName,
  bossName,
  bossPoints,
  attendanceDate,
  createAbsenceDate,
  appearDate,
) {
  if (!authAvailable) {
    console.log("Cannot write attendance: Google Auth not available.");
    return false;
  }

  const spreadsheetId = process.env.ATTENDANCE_SPREADSHEET_ID;
  if (!spreadsheetId) {
    console.error("ATTENDANCE_SPREADSHEET_ID is missing from .env");
    return false;
  }

  try {
    const sheets = await getSheetsClient();

    // TODO: Update "Sheet1" with the correct attendance log sheet name.
    const range = "Boss!A:G";

    const values = [
      [
        messageId,
        profileName,
        bossName,
        bossPoints,
        attendanceDate,
        createAbsenceDate,
        appearDate,
      ],
    ];

    const resource = {
      values,
    };

    const result = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: "USER_ENTERED",
      resource,
    });

    console.log(
      `Attendance appended to Google Sheets. Cells updated: ${result.data.updates.updatedCells}`,
    );
    return true;
  } catch (error) {
    console.error("Error writing attendance to Google Sheets:", error);
    return false;
  }
}

async function deleteAttendanceByMessageId(messageId) {
  if (!authAvailable) return false;

  const spreadsheetId = process.env.ATTENDANCE_SPREADSHEET_ID;
  if (!spreadsheetId) return false;

  try {
    const sheets = await getSheetsClient();
    const sheetName = "Boss";
    const range = `${sheetName}!A:A`;

    // 1. Get all values in Column A
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) return true;

    // 2. Identify row indices to delete (0-indexed, but Google Sheets deleteDimension is also 0-indexed)
    // Note: Sheets API row indices for deleteDimension are 0-based relative to the start of the sheet.
    // If we specify range A:A, row 1 in sheet is index 0.
    const indicesToDelete = [];
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][0] === messageId) {
        indicesToDelete.push(i);
      }
    }

    if (indicesToDelete.length === 0) return true;

    // 3. Batch delete rows
    // It's easier to delete them one by one from bottom to top, or use a batch delete if possible.
    // However, deleteDimension takes a range. Multiple non-contiguous rows require multiple requests.
    const requests = indicesToDelete
      .sort((a, b) => b - a) // Sort descending so indices don't shift
      .map((index) => ({
        deleteDimension: {
          range: {
            sheetId: 0, // We should ideally get the sheet ID dynamically
            dimension: "ROWS",
            startIndex: index,
            endIndex: index + 1,
          },
        },
      }));

    // To get the correct sheetId for "Boss"
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = spreadsheet.data.sheets.find(
      (s) => s.properties.title === sheetName,
    );
    const sheetId = sheet ? sheet.properties.sheetId : 0;

    // Update sheetId in requests
    requests.forEach((req) => (req.deleteDimension.range.sheetId = sheetId));

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: { requests },
    });

    console.log(
      `Deleted ${indicesToDelete.length} rows for Message ID: ${messageId}`,
    );
    return true;
  } catch (error) {
    console.error("Error deleting from Google Sheets:", error);
    return false;
  }
}

async function removeAttendanceRecord(messageId, profileName) {
  if (!authAvailable) return false;

  const spreadsheetId = process.env.ATTENDANCE_SPREADSHEET_ID;
  if (!spreadsheetId) return false;

  try {
    const sheets = await getSheetsClient();
    const sheetName = "Boss";
    const range = `${sheetName}!A:B`; // Check Message ID and Profile Name

    // 1. Get all values in Column A and B
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) return true;

    // 2. Identify row indices to delete
    const indicesToDelete = [];
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][0] === messageId && rows[i][1] === profileName) {
        indicesToDelete.push(i);
      }
    }

    if (indicesToDelete.length === 0) return true;

    // 3. Get Sheet ID
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = spreadsheet.data.sheets.find(
      (s) => s.properties.title === sheetName,
    );
    const sheetId = sheet ? sheet.properties.sheetId : 0;

    // 4. Batch delete rows (bottom to top)
    const requests = indicesToDelete
      .sort((a, b) => b - a)
      .map((index) => ({
        deleteDimension: {
          range: {
            sheetId: sheetId,
            dimension: "ROWS",
            startIndex: index,
            endIndex: index + 1,
          },
        },
      }));

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: { requests },
    });

    console.log(
      `Removed attendance record for ${profileName} in message ${messageId}`,
    );
    return true;
  } catch (error) {
    console.error("Error removing row from Google Sheets:", error);
    return false;
  }
}

module.exports = {
  writeAttendance,
  deleteAttendanceByMessageId,
  removeAttendanceRecord,
};
