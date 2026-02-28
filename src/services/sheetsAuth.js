const { google } = require("googleapis");
const path = require("path");
const fs = require("fs");

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

// Attempt to load credentials
const credentialsPath = path.join(__dirname, "../../credentials.json");

let auth = null;

try {
  if (fs.existsSync(credentialsPath)) {
    const credentials = require(credentialsPath);
    auth = new google.auth.GoogleAuth({
      credentials,
      scopes: SCOPES,
    });
    console.log("Google Sheets: credentials.json loaded successfully.");
  } else {
    console.warn(
      "Google Sheets: credentials.json not found. API features will be disabled.",
    );
  }
} catch (error) {
  console.error("Google Sheets auth error:", error);
}

const getSheetsClient = async () => {
  if (!auth) throw new Error("Google Auth not initialized.");
  const client = await auth.getClient();
  return google.sheets({ version: "v4", auth: client });
};

module.exports = {
  getSheetsClient,
  authAvailable: !!auth,
};
