(async () => {
  if (document.getElementById('phishguard-root-container')) return;

  // 1. Create the sidebar container
  const container = document.createElement('div');
  container.id = 'phishguard-root-container';
  container.style.cssText = `
    position: fixed; top: 0; right: 0; width: 400px; height: 100vh;
    z-index: 2147483647; background: white; box-shadow: -2px 0 10px rgba(0,0,0,0.2);
  `;
  document.body.appendChild(container);

  try {
    const manifestUrl = chrome.runtime.getURL('asset-manifest.json');
    const response = await fetch(manifestUrl);
    const assets = await response.json();
    
    // DEBUG: Log assets to see exactly what React named your files
    console.log("PhishGuard Assets Found:", assets);
(async () => {
  if (document.getElementById('phishguard-root-container')) return;

  const container = document.createElement('div');
  container.id = 'phishguard-root-container';
  container.style.cssText = `
    position: fixed; top: 0; right: 0; width: 400px; height: 100vh;
    z-index: 2147483647; background: white; box-shadow: -2px 0 10px rgba(0,0,0,0.2);
  `;
  document.body.appendChild(container);

  try {
    const manifestUrl = chrome.runtime.getURL('asset-manifest.json');
    const response = await fetch(manifestUrl);
    const data = await response.json();
    
    // DEBUG: This helps you see the actual structure in the console
    console.log("PhishGuard Full Manifest Data:", data);

    // FIX: React builds usually nest paths inside 'files'
    const assets = data.files || data; 
    
    const jsPath = assets['main.js'];
    const cssPath = assets['main.css'];

    if (!jsPath) {
      throw new Error("Could not find main.js in manifest files mapping.");
    }

    // Inject CSS
    if (cssPath) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = chrome.runtime.getURL(cssPath);
      document.head.appendChild(link);
    }

    // Inject JS
    const script = document.createElement('script');
    // We ensure jsPath is a string before calling getURL
    script.src = chrome.runtime.getURL(String(jsPath));
    document.head.appendChild(script);

    console.log("PhishGuard: React bundle injected from", jsPath);
  } catch (e) {
    console.error("PhishGuard: Initialization failed ->", e.message);
  }
})();
    // 2. Safely find the JS and CSS paths
    const jsPath = assets['main.js'] || assets['index.js']; 
    const cssPath = assets['main.css'] || assets['index.css'];

    if (!jsPath) {
      throw new Error("Could not find main.js in asset-manifest.json");
    }

    // 3. Inject CSS
    if (cssPath) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = chrome.runtime.getURL(cssPath);
      document.head.appendChild(link);
    }

    // 4. Inject JS Bundle
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL(jsPath);
    document.head.appendChild(script);

    console.log("PhishGuard: Attempting to mount React UI...");
  } catch (e) {
    console.error("PhishGuard Error:", e.message);
  }
})();