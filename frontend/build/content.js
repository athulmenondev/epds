(async () => {
  if (document.getElementById('phishguard-root-container')) return;

  const container = document.createElement('div');
  container.id = 'phishguard-root-container';
  document.body.appendChild(container);

  // Resize the host page to prevent the extension UI from overlapping
  const hostStyle = document.createElement('style');
  hostStyle.innerHTML = `
      html, body {
          width: 70vw !important;
          overflow-x: hidden !important;
      }
  `;
  document.head.appendChild(hostStyle);

  try {
    const manifestUrl = chrome.runtime.getURL('asset-manifest.json');
    const response = await fetch(manifestUrl);
    const data = await response.json();
    const assets = data.files || data;

    // Load JS and CSS
    const jsPath = assets['main.js'].replace(/^\.\//, '');
    const cssPath = assets['main.css'].replace(/^\.\//, '');

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL(cssPath);
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = chrome.runtime.getURL(jsPath);
    document.head.appendChild(script);
  } catch (e) { console.error("Load failed", e); }

  // --- SENDING SIDE LOGIC ---
  window.addEventListener('message', (event) => {
    // 1. Inbound: Scrape open email
    if (event.data.type === 'SCRAPE_OPEN_EMAIL') {
        const sender = document.querySelector('.gD')?.getAttribute('email') || "unknown";
        const content = document.querySelector('.a3s.aiL')?.innerText || "";
        window.postMessage({ type: 'GMAIL_DATA', payload: { sender, content } }, "*");
    }

    // 2. Outbound: Scrape Compose Draft
    if (event.data.type === 'SCRAPE_COMPOSE_DRAFT') {
        const recipient = document.querySelector('[name="to"]')?.value || "unknown";
        const draftContent = document.querySelector('[role="textbox"][aria-label*="Message Body"]')?.innerText || "";
        window.postMessage({ type: 'COMPOSE_DATA', payload: { recipient, content: draftContent } }, "*");
    }
});
})();


