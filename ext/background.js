// Background service worker
// Currently a placeholder for future extension-level logic or persistent state management.
chrome.runtime.onInstalled.addListener(() => {
    console.log("PhishGuard Extension Installed");
});

// Listener for any external messages or long-running tasks if needed
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "PING") {
        sendResponse({ status: "alive" });
    }
    // Handle other background tasks here
});
