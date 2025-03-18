require("dotenv").config();
const axios = require("axios");

let lastRefreshTime = 0; // Track last refresh time

const refreshInstagramToken = async () => {
    const now = Date.now();
    
    // ✅ Only refresh every 55 days (not every request)
    if (now - lastRefreshTime < 55 * 24 * 60 * 60 * 1000) {
        return process.env.INSTAGRAM_ACCESS_TOKEN;
    }

    try {
        const response = await axios.get(`https://graph.facebook.com/v22.0/oauth/access_token`, {
            params: {
                grant_type: "fb_exchange_token",
                client_id: process.env.INSTAGRAM_APP_ID,
                client_secret: process.env.INSTAGRAM_APP_SECRET,
                fb_exchange_token: process.env.INSTAGRAM_ACCESS_TOKEN,
            },
        });

        const newToken = response.data.access_token;

        process.env.INSTAGRAM_ACCESS_TOKEN = newToken; // Update token in runtime
        lastRefreshTime = Date.now(); // Update last refresh time
        return newToken;
    } catch (error) {
        console.error("🚨 Error refreshing Instagram access token:", error.response?.data || error.message);
        return null;
    }
};

// ✅ Use recursive `setTimeout` to avoid integer overflow
const scheduleTokenRefresh = () => {
    setTimeout(async () => {
        await refreshInstagramToken();
        scheduleTokenRefresh(); // Schedule next refresh
    }, 24 * 60 * 60 * 1000 * 20); // Refresh every **20 days** (less than 24.8 days limit)
};

scheduleTokenRefresh();

module.exports = { refreshInstagramToken };
