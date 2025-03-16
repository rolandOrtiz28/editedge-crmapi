const { google } = require("googleapis");

const getGmailClient = async () => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    access_token: process.env.BUSINESS_ACCESS_TOKEN,
    refresh_token: process.env.BUSINESS_REFRESH_TOKEN,
  });

  try {
    const { credentials } = await oauth2Client.refreshAccessToken();
    process.env.BUSINESS_ACCESS_TOKEN = credentials.access_token;
    if (credentials.refresh_token) {
      process.env.BUSINESS_REFRESH_TOKEN = credentials.refresh_token;
    }
    console.log("🔹 Business email access token refreshed");
  } catch (error) {
    console.error("Error refreshing business email access token:", error);
  }

  return google.gmail({ version: "v1", auth: oauth2Client });
};

module.exports = { getGmailClient };