// content.js — Main logic for Gmail/Outlook integration
// Injects the React sidebar and bridges communication between the page and extension.

const CONFIG = {
    API_BASE_URL: "https://athulmenondev-epds.hf.space",
    LOCAL_API_URL: "http://localhost:5000",
    SIDEBAR_ID: "phishguard-root-container"
};

// ─── Initialization ─────────────────────────────────────────────────────────────

async function init() {
    console.log("PhishGuard: Initializing...");

    // 1. Inject Sidebar Container
    if (!document.getElementById(CONFIG.SIDEBAR_ID)) {
        const container = document.createElement('div');
        container.id = CONFIG.SIDEBAR_ID;
        document.body.appendChild(container);
        console.log("PhishGuard: Sidebar container injected.");

        // Resize the host page to prevent the extension UI from overlapping
        const hostStyle = document.createElement('style');
        hostStyle.innerHTML = `
            html, body {
                width: 70vw !important;
                overflow-x: hidden !important;
            }
        `;
        document.head.appendChild(hostStyle);
    }

    // 2. Load React Bundle
    try {
        const manifestUrl = chrome.runtime.getURL('build/asset-manifest.json');
        const response = await fetch(manifestUrl);
        const data = await response.json();

        const files = data.files || data;
        const mainJs = files['main.js'];
        const mainCss = files['main.css'];

        if (mainCss) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = chrome.runtime.getURL(`build/${mainCss}`);
            document.head.appendChild(link);
        }

        if (mainJs) {
            const script = document.createElement('script');
            script.src = chrome.runtime.getURL(`build/${mainJs}`);
            script.type = 'module';
            document.body.appendChild(script);
        }
        console.log("PhishGuard: React bundle loaded.");

    } catch (e) {
        console.error("PhishGuard: Failed to load React assets.", e);
    }

    // 3. Setup Listeners
    setupMutationObserver();
    setupMessageBridge();
}

// ─── Detect Mail Client ─────────────────────────────────────────────────────────

function detectMailClient() {
    const url = window.location.href;
    if (url.includes('mail.google.com')) return 'gmail';
    if (url.includes('outlook.live.com') || url.includes('outlook.office')) return 'outlook';
    return 'unknown';
}

// ─── DOM Scrapers ───────────────────────────────────────────────────────────────

function queryFirst(selectors) {
    const list = Array.isArray(selectors) ? selectors : [selectors];
    for (const sel of list) {
        const el = document.querySelector(sel);
        if (el) return el;
    }
    return null;
}

function handleScrapeOpenEmail() {
    console.log("PhishGuard: Scraping current email...");
    const client = detectMailClient();

    let sender = 'unknown';
    let content = '';
    let subject = '';

    if (client === 'outlook') {
        const senderEl = queryFirst(['[aria-label="From"]', '.lpc_hdr_sndr', '._pe_b']);
        if (senderEl) sender = senderEl.textContent.trim();

        const subjectEl = queryFirst(['[aria-label="Subject"]', '.SubjectLine']);
        if (subjectEl) subject = subjectEl.textContent.trim();

        const bodyEl = queryFirst([
            '.BodyFragment', '.ReadMsgBody',
            '[aria-label="Message body"]:not([contenteditable])',
            '.allowTextSelection',
            '#ReadingPaneContainerId .item-body'
        ]);
        if (bodyEl) content = bodyEl.innerText.trim();
    } else {
        // Gmail
        const senderEl = queryFirst(['.gD', '[data-hovercard-id]']);
        if (senderEl) {
            sender = senderEl.getAttribute('email')
                  || senderEl.getAttribute('data-hovercard-id')
                  || senderEl.textContent.trim();
        }

        const subjectEl = queryFirst(['.hP', 'h2.hP']);
        if (subjectEl) subject = subjectEl.textContent.trim();

        const bodyEl = queryFirst(['.a3s.aiL', '.a3s', '.ii.gt']);
        if (bodyEl) content = bodyEl.innerText.trim();
    }

    window.postMessage({
        type: 'GMAIL_DATA',
        payload: { sender, subject, content }
    }, "*");
}

function handleScrapeComposeDraft() {
    console.log("PhishGuard: Scraping compose draft...");
    const client = detectMailClient();

    let recipient = 'unknown';
    let content = '';
    let subject = '';

    if (client === 'outlook') {
        const recipEl = queryFirst(['input[aria-label="To"]', '.ms-BasePicker-input']);
        if (recipEl) recipient = recipEl.value || recipEl.innerText.trim();

        const subjectEl = document.querySelector('input[aria-label="Add a subject"]');
        if (subjectEl) subject = subjectEl.value || subjectEl.textContent.trim();

        const bodyEl = queryFirst([
            '[aria-label="Message body"][contenteditable="true"]',
            'div[role="textbox"][contenteditable="true"]'
        ]);
        if (bodyEl) content = bodyEl.innerText.trim();
    } else {
        // Gmail
        const composeWindow = document.querySelector('div[role="dialog"]');
        if (composeWindow) {
            const recipEl = composeWindow.querySelector('input[name="to"]')
                         || composeWindow.querySelector('.vR');
            if (recipEl) recipient = recipEl.value || recipEl.innerText.trim();

            const subjectEl = composeWindow.querySelector('input[name="subjectbox"]');
            if (subjectEl) subject = subjectEl.value || '';

            const bodyEl = composeWindow.querySelector('div[role="textbox"][contenteditable="true"]');
            if (bodyEl) content = bodyEl.innerText.trim();
        }
    }

    window.postMessage({
        type: 'COMPOSE_DATA',
        payload: { recipient, subject, content }
    }, "*");
}

// ─── Mutation Observer (Compose Window Detection) ────────────────────────────────

function setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType === 1) {
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
    const recipientField = composeWindow.querySelector('input[name="to"]')
                        || composeWindow.querySelector('div[name="to"]');

    let debounceTimer;

    if (bodyField) {
        bodyField.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                const content = bodyField.innerText;
                let recipient = "unknown";
                if (recipientField) {
                    recipient = recipientField.value || recipientField.innerText;
                } else {
                    const toContainer = composeWindow.querySelector('.vR');
                    if (toContainer) recipient = toContainer.innerText;
                }

                window.postMessage({
                    type: 'COMPOSE_DATA',
                    payload: { recipient, content }
                }, "*");
            }, 1000);
        });
    }
}

// ─── Message Bridge ─────────────────────────────────────────────────────────────

function setupMessageBridge() {
    window.addEventListener('message', async (event) => {
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

// ─── API Communication ──────────────────────────────────────────────────────────

async function handleAnalysisRequest(payload) {
    const { mode, text, id } = payload;

    let endpoint = mode === 'phishing' ? '/predict' : '/analyze-outgoing';
    let bodyData = { content: text };

    if (mode === 'phishing') {
        bodyData.sender_id = id;
    } else {
        bodyData.recipient = id;
    }

    // Try local Flask first, then remote
    const urls = [CONFIG.LOCAL_API_URL, CONFIG.API_BASE_URL];

    for (const baseUrl of urls) {
        try {
            console.log(`PhishGuard: Fetching ${baseUrl}${endpoint}...`);
            const response = await fetch(`${baseUrl}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyData)
            });

            const result = await response.json();

            window.postMessage({
                type: 'ANALYSIS_COMPLETE',
                payload: { result, mode }
            }, "*");

            return; // Success — exit loop
        } catch (error) {
            console.warn(`PhishGuard: ${baseUrl} failed:`, error.message);
        }
    }

    // Both URLs failed
    window.postMessage({
        type: 'ANALYSIS_ERROR',
        payload: { error: 'All API endpoints unreachable.' }
    }, "*");
}

// ─── Start ──────────────────────────────────────────────────────────────────────

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
