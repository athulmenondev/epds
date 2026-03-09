/**
 * domScraper.js — Utility for extracting email content from the active tab's DOM.
 * 
 * This module is designed to be injected via chrome.scripting.executeScript
 * into the active Gmail/Outlook tab. It does NOT run inside the React popup/sidebar;
 * instead it runs in the page's execution context.
 *
 * Supports:
 *  - Gmail open email (.a3s.aiL)
 *  - Gmail compose draft (div[role="textbox"][contenteditable])
 *  - Outlook open email (.BodyFragment, .ReadMsgBody, [aria-label="Message body"])
 *  - Outlook compose draft ([aria-label="Message body"][contenteditable])
 */

// ─── Gmail DOM Selectors ────────────────────────────────────────────────────────

const GMAIL_SELECTORS = {
  // Open email body (read mode)
  emailBody: [
    '.a3s.aiL',          // Primary Gmail message body
    '.a3s',              // Fallback without .aiL modifier
    '.ii.gt',            // Gmail message inner container
  ],
  // Sender element
  sender: [
    '.gD',               // Sender chip with email attribute
    '[data-hovercard-id]', // Alternate sender element
  ],
  // Subject line
  subject: [
    '.hP',               // Subject heading
    'h2.hP',             // Alternate subject
  ],
  // Compose window
  composeBody: 'div[role="textbox"][contenteditable="true"]',
  composeRecipient: [
    'input[name="to"]',
    'div[name="to"]',
    '.vR',               // Recipient chip container
  ],
  composeSubject: 'input[name="subjectbox"]',
};

// ─── Outlook DOM Selectors ──────────────────────────────────────────────────────

const OUTLOOK_SELECTORS = {
  emailBody: [
    '.BodyFragment',
    '.ReadMsgBody',
    '[aria-label="Message body"]:not([contenteditable])',
    '.allowTextSelection',
    '#ReadingPaneContainerId .item-body',
  ],
  sender: [
    '[aria-label="From"]',
    '.lpc_hdr_sndr',
    '._pe_b',
  ],
  subject: [
    '[aria-label="Subject"]',
    '.SubjectLine',
  ],
  composeBody: [
    '[aria-label="Message body"][contenteditable="true"]',
    'div[role="textbox"][contenteditable="true"]',
  ],
  composeRecipient: [
    'input[aria-label="To"]',
    '.ms-BasePicker-input',
  ],
  composeSubject: 'input[aria-label="Add a subject"]',
};

// ─── Detection ──────────────────────────────────────────────────────────────────

/**
 * Detects which mail client is active based on the page URL or DOM.
 * @returns {'gmail' | 'outlook' | 'unknown'}
 */
function detectMailClient() {
  const url = window.location.href;
  if (url.includes('mail.google.com')) return 'gmail';
  if (url.includes('outlook.live.com') || url.includes('outlook.office.com') || url.includes('outlook.office365.com')) return 'outlook';
  return 'unknown';
}

/**
 * Tries multiple selectors and returns the first matching element.
 * @param {string | string[]} selectors 
 * @returns {Element | null}
 */
function queryFirst(selectors) {
  const selectorList = Array.isArray(selectors) ? selectors : [selectors];
  for (const sel of selectorList) {
    const el = document.querySelector(sel);
    if (el) return el;
  }
  return null;
}

// ─── Scraping Functions ─────────────────────────────────────────────────────────

/**
 * Scrapes the currently visible/open email from the DOM.
 * @returns {{ sender: string, subject: string, content: string, client: string }}
 */
function scrapeOpenEmail() {
  const client = detectMailClient();
  const selectors = client === 'outlook' ? OUTLOOK_SELECTORS : GMAIL_SELECTORS;

  // Extract sender
  let sender = 'unknown';
  const senderEl = queryFirst(selectors.sender);
  if (senderEl) {
    sender = senderEl.getAttribute('email') 
          || senderEl.getAttribute('data-hovercard-id')
          || senderEl.textContent.trim();
  }

  // Extract subject
  let subject = '';
  const subjectEl = queryFirst(selectors.subject);
  if (subjectEl) {
    subject = subjectEl.textContent.trim();
  }

  // Extract body content
  let content = '';
  const bodyEl = queryFirst(selectors.emailBody);
  if (bodyEl) {
    content = bodyEl.innerText.trim();
  }

  return { sender, subject, content, client };
}

/**
 * Scrapes the currently open compose/draft window.
 * @returns {{ recipient: string, subject: string, content: string, client: string }}
 */
function scrapeComposeDraft() {
  const client = detectMailClient();
  const selectors = client === 'outlook' ? OUTLOOK_SELECTORS : GMAIL_SELECTORS;

  // Extract recipient
  let recipient = 'unknown';
  const recipientEl = queryFirst(selectors.composeRecipient);
  if (recipientEl) {
    recipient = recipientEl.value || recipientEl.innerText.trim();
  }

  // Extract subject
  let subject = '';
  const subjectSel = selectors.composeSubject;
  if (subjectSel) {
    const subjectEl = document.querySelector(subjectSel);
    if (subjectEl) subject = subjectEl.value || subjectEl.textContent.trim();
  }

  // Extract compose body
  let content = '';
  const bodyEl = queryFirst(selectors.composeBody);
  if (bodyEl) {
    content = bodyEl.innerText.trim();
  }

  return { recipient, subject, content, client };
}

// ─── DLP Pattern Matching (Client-Side Pre-check) ───────────────────────────────

/**
 * Runs a quick client-side regex scan on draft content before sending to the backend.
 * This acts as an instant pre-filter; the backend performs the authoritative DLP check.
 */
const DLP_QUICK_PATTERNS = {
  'Credit Card':       /\b(?:\d[ -]*?){13,16}\b/,
  'SSN':               /\b\d{3}-\d{2}-\d{4}\b/,
  'API Key':           /(?:api[_-]?key|apikey)\s*[:=]\s*['"]?[\w-]{20,}/i,
  'Private Key':       /-----BEGIN .* PRIVATE KEY-----/,
  'Email Pattern':     /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
  'Phone (US)':        /\b\(?[0-9]{3}\)?[.\s-]?[0-9]{3}[.\s-]?[0-9]{4}\b/,
  'AWS Access Key':    /\bAKIA[0-9A-Z]{16}\b/,
  'JWT Token':         /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
};

/**
 * Quick client-side DLP scan.
 * @param {string} text
 * @returns {{ hasViolations: boolean, matches: string[] }}
 */
function quickDLPScan(text) {
  const matches = [];
  for (const [name, regex] of Object.entries(DLP_QUICK_PATTERNS)) {
    if (regex.test(text)) {
      matches.push(name);
    }
  }
  return {
    hasViolations: matches.length > 0,
    matches,
  };
}

// ─── Exports ────────────────────────────────────────────────────────────────────
// When injected via chrome.scripting.executeScript, we return the result directly.
// When used as a module inside content.js, we export the functions.

// For use inside content.js (imported as module)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    detectMailClient,
    scrapeOpenEmail,
    scrapeComposeDraft,
    quickDLPScan,
    GMAIL_SELECTORS,
    OUTLOOK_SELECTORS,
    DLP_QUICK_PATTERNS,
  };
}
