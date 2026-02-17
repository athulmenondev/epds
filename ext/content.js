// content.js - Main logic for Gmail integration

const CONFIG = {
    API_BASE_URL: "https://athulmenondev-epds.hf.space",
    SIDEBAR_ID: "phishguard-root-container"
};

// --- Initialization ---

async function init() {
    console.log("PhishGuard: Initializing...");
    
    // 1. Inject Sidebar
    if (!document.getElementById(CONFIG.SIDEBAR_ID)) {
        const container = document.createElement('div');
        container.id = CONFIG.SIDEBAR_ID;
        document.body.appendChild(container);
        console.log("PhishGuard: Sidebar container injected.");
    }

    // 2. Load React Bundle
    try {
        const manifestUrl = chrome.runtime.getURL('build/asset-manifest.json');
        const response = await fetch(manifestUrl);
        const data = await response.json();
        
        // Handle different create-react-app manifest structures
        const files = data.files || data;
        const mainJs = files['main.js'];
        const mainCss = files['main.css'];

        if (mainCss) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = chrome.runtime.getURL(`build/${mainCss}`); // Adjust path relative to extension root
            document.head.appendChild(link);
        }

        if (mainJs) {
            const script = document.createElement('script');
            script.src = chrome.runtime.getURL(`build/${mainJs}`);
            script.type = 'module'; // Use module if needed, or text/javascript
            document.body.appendChild(script); // Append to body to ensure container exists
        }
        console.log("PhishGuard: React bundle loaded.");

    } catch (e) {
        console.error("PhishGuard: Failed to load React assets.", e);
    }

    // 3. Setup Listeners
    setupMutationObserver();
    setupMessageBridge();
}

// --- DOM Scrapers & Observers ---

function setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            // Check for added nodes to detect Compose window
            for (const node of mutation.addedNodes) {
                if (node.nodeType === 1) { // Element
                    // Check if it's a compose window (approximate selector, needs testing on live Gmail)
                    // Gmail compose windows often have role="dialog" or class "M9"
                    if (node.getAttribute('role') === 'dialog' || node.querySelector('div[role="textbox"]')) {
                       attachComposeListeners(node);
                    }
                }
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

function attachComposeListeners(composeWindow) {
    console.log("PhishGuard: Compose window detected.", composeWindow);
    
    const bodyField = composeWindow.querySelector('div[role="textbox"][contenteditable="true"]');
    const recipientField = composeWindow.querySelector('input[name="to"]') || composeWindow.querySelector('div[name="to"]'); // Gmail structure varies

    let debounceTimer;

    if (bodyField) {
        bodyField.addEventListener('input', () => {
             clearTimeout(debounceTimer);
             debounceTimer = setTimeout(() => {
                 // Real-time DLP check
                 const content = bodyField.innerText;
                 // Extract recipient (might be complex in Gmail due to chips)
                 let recipient = "unknown";
                 if (recipientField) {
                     recipient = recipientField.value || recipientField.innerText; // Handle chips
                 } else {
                     // Try finding standard Gmail recipient container
                     const toContainer = composeWindow.querySelector('.vR'); // Class for recipient chip container
                     if (toContainer) recipient = toContainer.innerText;
                 }

                 // Send to React (DLP Side) - Triggers analysis in App.jsx
                 window.postMessage({
                     type: 'COMPOSE_DATA',
                     payload: { recipient, content }
                 }, "*");
             }, 1000); // 1 second debounce
        });
    }
}

// --- Message Bridge & API Handling ---

function setupMessageBridge() {
    window.addEventListener('message', async (event) => {
        // We only care about messages from our window (React app)
        if (event.source !== window) return;

        const { type, payload } = event.data;

        if (type === 'REACT_REQUEST_ANALYSIS') {
            handleAnalysisRequest(payload);
        }
        
        if (type === 'SCRAPE_OPEN_EMAIL') {
            handleScrapeOpenEmail();
        }

        if (type === 'SCRAPE_COMPOSE_DRAFT') {
            handleScrapeComposeDraft();
        }
    });
}

function handleScrapeOpenEmail() {
    console.log("PhishGuard: Scraping current email...");
    const senderElement = document.querySelector('.gD');
    const bodyElement = document.querySelector('.a3s.aiL');

    const sender = senderElement ? senderElement.getAttribute('email') : "unknown";
    const content = bodyElement ? bodyElement.innerText : "";

    window.postMessage({
        type: 'GMAIL_DATA',
        payload: { sender, content }
    }, "*");
}

function handleScrapeComposeDraft() {
    console.log("PhishGuard: Scraping compose draft...");
    // Attempt to find the active compose window
    const composeWindow = document.querySelector('div[role="dialog"]');
    let recipient = "unknown";
    let content = "";

    if (composeWindow) {
         const bodyField = composeWindow.querySelector('div[role="textbox"][contenteditable="true"]');
         const recipientField = composeWindow.querySelector('input[name="to"]') || composeWindow.querySelector('.vR');
         
         if (bodyField) content = bodyField.innerText;
         if (recipientField) recipient = recipientField.value || recipientField.innerText;
    }

    window.postMessage({
        type: 'COMPOSE_DATA', // Matches App.jsx listener
        payload: { recipient, content }
    }, "*");
}

async function handleAnalysisRequest(payload) {
    const { mode, text, id } = payload; // mode: 'phishing' (inbound) or 'dlp' (outbound)
    
    let endpoint = mode === 'phishing' ? '/predict' : '/dlp-check';
    let bodyData = { content: text };
    
    if (mode === 'phishing') {
        bodyData.sender_id = id;
    } else {
        bodyData.recipient_id = id;
    }

    try {
        console.log(`PhishGuard: Fetching ${endpoint}...`);
        const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData)
        });
        
        const result = await response.json();
        
        // Transform the result to match App.jsx expectation if needed, 
        // or ensure App.jsx handles the format.
        // App.jsx expects { prediction: "...", confidence: ... } directly for inbound
        // For outbound it does some formatting. 
        // Let's pass the raw result back and let App.jsx format it, 
        // or format it here. The prompt says "handles fetch requests", 
        // logic to pass sender_id is here.
        
        window.postMessage({
            type: 'ANALYSIS_COMPLETE',
            payload: { result, mode }
        }, "*");
        
    } catch (error) {
        console.error("PhishGuard: API Error", error);
        window.postMessage({
            type: 'ANALYSIS_ERROR',
            payload: { error: error.message }
        }, "*");
    }
}

// Start
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
