const { google } = require("googleapis");

const getGmailClient = async () => {
  const redirectUri =
    process.env.NODE_ENV === "production"
      ? process.env.GOOGLE_REDIRECT_URI_PROD
      : process.env.GOOGLE_REDIRECT_URI_DEV;

  if (!redirectUri) {
    throw new Error("Redirect URI is not set. Check GOOGLE_REDIRECT_URI_DEV or GOOGLE_REDIRECT_URI_PROD in your .env file.");
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );

  oauth2Client.setCredentials({
    access_token: process.env.BUSINESS_ACCESS_TOKEN,
    refresh_token: process.env.BUSINESS_REFRESH_TOKEN,
  });

  try {
    const { credentials } = await oauth2Client.refreshAccessToken();
    // Update in-memory tokens (note: these won’t persist after restart)
    process.env.BUSINESS_ACCESS_TOKEN = credentials.access_token;
    if (credentials.refresh_token) {
      // Google usually doesn’t return a new refresh_token unless it changes
      process.env.BUSINESS_REFRESH_TOKEN = credentials.refresh_token;
      console.log(
        "🔹 New refresh token received. Update your .env file with:",
        credentials.refresh_token
      );
    }
    console.log("🔹 Business email access token refreshed successfully");
  } catch (error) {
    console.error("Error refreshing business email access token:", error);
    if (error.response?.data?.error === "invalid_grant") {
      throw new Error(
        "Refresh token is invalid or revoked. Please re-authenticate and update BUSINESS_REFRESH_TOKEN in your .env file."
      );
    }
    throw error; // Propagate other errors (e.g., network issues)
  }

  return google.gmail({ version: "v1", auth: oauth2Client });
};

module.exports = { getGmailClient };