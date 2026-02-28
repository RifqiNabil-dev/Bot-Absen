const { google } = require("googleapis");

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

let auth = null;

try {
  if (process.env.GOOGLE_CREDENTIALS_BASE64_ABSEN) {
    const credentials = JSON.parse(
      Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64_ABSEN, "base64").toString(
        "utf-8",
      ),
    );

    auth = new google.auth.GoogleAuth({
      credentials,
      scopes: SCOPES,
    });

    console.log("Google Sheets: Loaded from environment variable.");
  } else {
    console.warn(
      "Google Sheets: GOOGLE_CREDENTIALS_BASE64_ABSEN not found. API disabled.",
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
