// background.js — PhishGuard Service Worker
// Handles: installation, content-script relay, and chrome.scripting.executeScript bridging.

chrome.runtime.onInstalled.addListener(() => {
    console.log("PhishGuard Extension Installed (v1.1)");
});

// ─── Message Relay ──────────────────────────────────────────────────────────────
// The React sidebar (injected via content script) cannot use chrome.tabs/scripting
// directly. We relay requests through the background service worker.

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "PING") {
        sendResponse({ status: "alive" });
        return true;
    }

    // ─── Scrape Open Email via chrome.scripting ─────────────────────────────
    if (request.type === "SCRAPE_EMAIL") {
        scrapeFromActiveTab('scrapeOpenEmail')
            .then(result => sendResponse({ success: true, data: result }))
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true; // Keep channel open for async response
    }

    // ─── Scrape Compose Draft via chrome.scripting ──────────────────────────
    if (request.type === "SCRAPE_DRAFT") {
        scrapeFromActiveTab('scrapeComposeDraft')
            .then(result => sendResponse({ success: true, data: result }))
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    }

    // ─── Forward API request to backend (avoids CORS from content script) ───
    if (request.type === "API_REQUEST") {
        const { url, method, body } = request.payload;
        fetch(url, {
            method: method || 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        })
        .then(res => res.json())
        .then(json => sendResponse({ success: true, data: json }))
        .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    }
});

// ─── Injection Helper ───────────────────────────────────────────────────────────
// Uses chrome.scripting.executeScript to run a scraper function in the active tab.

async function scrapeFromActiveTab(fnName) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab) {
        throw new Error('No active tab found');
    }

    // Determine which function to inject based on the scrape type
    const func = fnName === 'scrapeComposeDraft' ? injectedScrapeDraft : injectedScrapeEmail;

    const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: func,
    });

    if (results && results[0] && results[0].result) {
        return results[0].result;
    }

    throw new Error('Scraping returned no results. Is an email open?');
}

// ─── Injected Functions ─────────────────────────────────────────────────────────
// These run inside the tab's page context. They must be self-contained (no closures).

function injectedScrapeEmail() {
    const url = window.location.href;
    const isOutlook = url.includes('outlook.live.com') || url.includes('outlook.office');

    // --- Helper ---
    function queryFirst(selectors) {
        const list = Array.isArray(selectors) ? selectors : [selectors];
        for (const sel of list) {
            const el = document.querySelector(sel);
            if (el) return el;
        }
        return null;
    }

    let sender = 'unknown';
    let subject = '';
    let content = '';

    if (isOutlook) {
        const senderEl = queryFirst([
            '[aria-label="From"]', '.lpc_hdr_sndr', '._pe_b'
        ]);
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

    return { sender, subject, content, client: isOutlook ? 'outlook' : 'gmail' };
}

function injectedScrapeDraft() {
    const url = window.location.href;
    const isOutlook = url.includes('outlook.live.com') || url.includes('outlook.office');

    function queryFirst(selectors) {
        const list = Array.isArray(selectors) ? selectors : [selectors];
        for (const sel of list) {
            const el = document.querySelector(sel);
            if (el) return el;
        }
        return null;
    }

    let recipient = 'unknown';
    let subject = '';
    let content = '';

    if (isOutlook) {
        const recipEl = queryFirst([
            'input[aria-label="To"]', '.ms-BasePicker-input'
        ]);
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

    return { recipient, subject, content, client: isOutlook ? 'outlook' : 'gmail' };
}
