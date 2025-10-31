/**
 * Teun.ai Background Service Worker
 * Handles API communication and extension logic
 */

console.log('🚀 Teun.ai Background: Service worker loaded');

// Configuration
const CONFIG = {
  API_BASE_URL_DEV: 'http://localhost:3000',
  API_BASE_URL_PROD: 'https://teun.ai',
  isDevelopment: true // Set to false for production
};

// Get current API URL
function getApiUrl() {
  return CONFIG.isDevelopment ? CONFIG.API_BASE_URL_DEV : CONFIG.API_BASE_URL_PROD;
}

// State
let currentScan = null;
let scanTab = null;
let authToken = null;
let userId = null;

/**
 * Initialize extension
 */
chrome.runtime.onInstalled.addListener((details) => {
  console.log('✅ Teun.ai Extension installed:', details.reason);
  
  // Load auth from storage
  chrome.storage.local.get(['teun_token', 'teun_user'], (result) => {
    if (result.teun_token && result.teun_user) {
      authToken = result.teun_token;
      userId = result.teun_user.id;
      console.log('Auth loaded:', userId ? '✅ Authenticated' : '❌ Not authenticated');
    }
  });
  
  // Open welcome page on first install
  if (details.reason === 'install') {
    chrome.tabs.create({ url: getApiUrl() + '/dashboard?extension=installed' });
  }
});

/**
 * Save auth credentials
 */
function saveAuth(token, user) {
  authToken = token;
  userId = user.id;
  
  chrome.storage.local.set({
    teun_token: token,
    teun_user: user
  }, () => {
    console.log('✅ Auth saved for user:', user.email);
  });
}

/**
 * Clear auth
 */
function clearAuth() {
  authToken = null;
  userId = null;
  
  chrome.storage.local.remove(['teun_token', 'teun_user'], () => {
    console.log('✅ Auth cleared');
  });
}

/**
 * Send batch results to API (NEW - replaces single result sending)
 */
async function sendBatchResultsToAPI(scanData) {
  if (!authToken || !userId) {
    console.warn('⚠️ Not authenticated, cannot send results');
    return { success: false, error: 'Not authenticated' };
  }
  
  const { companyName, results, integrationId } = scanData;
  
  try {
    console.log('📤 Sending batch results to API:', {
      company: companyName,
      results: results.length,
      found: results.filter(r => r.found).length
    });
    
    const response = await fetch(`${getApiUrl()}/api/chatgpt-scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        user_id: userId,
        company_name: companyName,
        integration_id: integrationId || null,
        results: results,
        total_queries: results.length,
        successful_queries: results.filter(r => r.success).length,
        found_count: results.filter(r => r.found).length,
        scan_date: new Date().toISOString(),
        source: 'chrome-extension',
        extension_version: chrome.runtime.getManifest().version
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('✅ Batch results sent to API:', data);
    
    return { success: true, data };
    
  } catch (error) {
    console.error('❌ Failed to send batch results:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Start scan (updated to work with content script)
 */
async function startScan(queries, companyName, integrationId = null) {
  console.log(`🔍 Starting scan: ${queries.length} queries for "${companyName}"`);
  
  if (currentScan) {
    console.warn('⚠️ Scan already in progress');
    return { success: false, error: 'Scan already in progress' };
  }
  
  if (!authToken || !userId) {
    return { success: false, error: 'Not authenticated' };
  }
  
  try {
    // Check if there's already a ChatGPT tab open
    const tabs = await chrome.tabs.query({ url: ['https://chatgpt.com/*', 'https://chat.openai.com/*'] });
    
    let tab;
    if (tabs.length > 0) {
      // Use existing ChatGPT tab
      tab = tabs[0];
      await chrome.tabs.update(tab.id, { active: true });
      console.log('✅ Using existing ChatGPT tab:', tab.id);
    } else {
     // Open new ChatGPT WINDOW (not tab!)
        const newWindow = await chrome.windows.create({
          url: 'https://chatgpt.com',
          type: 'popup',
          width: 600,
          height: 800,
          state: 'normal'
        });
        tab = newWindow.tabs[0];
      await new Promise((resolve) => {
        chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
          if (tabId === tab.id && info.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            resolve();
          }
        });
      });
      
      // Extra wait for page to be ready
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    scanTab = tab;
    
    // Initialize scan state
    currentScan = {
      queries,
      companyName,
      integrationId,
      results: [],
      startTime: Date.now(),
      tabId: tab.id
    };
    
    // Send start message to content script
    chrome.tabs.sendMessage(tab.id, {
      action: 'start_scan',
      queries,
      companyName,
      userId,
      integrationId
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('❌ Failed to start scan in content script:', chrome.runtime.lastError);
        currentScan = null;
        return;
      }
      
      console.log('✅ Scan started in content script:', response);
    });
    
    return { success: true, tabId: tab.id };
    
  } catch (error) {
    console.error('❌ Error starting scan:', error);
    currentScan = null;
    return { success: false, error: error.message };
  }
}

/**
 * Handle scan progress from content script
 */
function handleScanProgress(message) {
  const { type, data } = message;
  
  console.log(`📊 Progress: ${type}`, data);
  
  // Store result in current scan
  if (type === 'query_complete' && currentScan) {
    currentScan.results.push(data);
  }
  
  // Handle scan completion
  if (type === 'scan_complete') {
    console.log('✅ Scan complete!', data);
    
    // Send batch results to API
    if (currentScan) {
      sendBatchResultsToAPI({
        companyName: currentScan.companyName,
        results: currentScan.results,
        integrationId: currentScan.integrationId
      }).then(apiResult => {
        if (apiResult.success) {
          // Show success notification
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'assets/icon-128.png',
            title: 'Teun.ai Scan Compleet! ✅',
            message: `${data.found_count} van ${data.total_queries} gevonden. Bekijk je dashboard!`,
            buttons: [
              { title: 'Bekijk Dashboard' }
            ]
          });
        } else {
          // Show error notification
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'assets/icon-128.png',
            title: 'Scan compleet (niet opgeslagen)',
            message: 'Resultaten konden niet worden opgeslagen in dashboard. Check je internet connectie.'
          });
        }
      });
    }
    
    // Clean up
    currentScan = null;
  }
  
  if (type === 'scan_error') {
    console.error('❌ Scan error:', data);
    
    // Show error notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'assets/icon-128.png',
      title: 'Scan Error',
      message: data.error || 'Er is iets misgegaan tijdens de scan'
    });
    
    currentScan = null;
  }
  
  // Forward progress to popup if it's open
  chrome.runtime.sendMessage(message).catch(() => {
    // Popup might not be open, that's OK
  });
}

/**
 * Handle notification button clicks
 */
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (buttonIndex === 0) {
    // "Bekijk Dashboard" button
    chrome.tabs.create({ url: getApiUrl() + '/dashboard' });
  }
});

/**
 * Message listener (from content script and popup)
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Background received:', message.action, sender);
  
  // Progress updates from content script
  if (message.action === 'scan_progress') {
    handleScanProgress(message);
    sendResponse({ received: true });
    return true;
  }
  
  // Start scan from popup
  if (message.action === 'start_scan') {
    const { queries, companyName, integrationId, auth } = message;
    
    // Save auth if provided
    if (auth) {
      saveAuth(auth.token, auth.user);
    }
    
    startScan(queries, companyName, integrationId).then(sendResponse);
    return true; // Keep channel open for async
  }
  
  // Get status
  if (message.action === 'get_status') {
    sendResponse({
      isScanning: !!currentScan,
      isAuthenticated: !!authToken && !!userId,
      currentScan: currentScan ? {
        queries: currentScan.queries,
        companyName: currentScan.companyName,
        resultsCount: currentScan.results.length,
        totalQueries: currentScan.queries.length,
        elapsed: Math.round((Date.now() - currentScan.startTime) / 1000)
      } : null
    });
    return true;
  }
  
  // Store auth (from dashboard)
  if (message.action === 'store_auth') {
    const { token, user } = message;
    saveAuth(token, user);
    sendResponse({ success: true });
    return true;
  }
  
  // Check auth
  if (message.action === 'check_auth') {
    chrome.storage.local.get(['teun_token', 'teun_user'], (result) => {
      sendResponse({
        authenticated: !!(result.teun_token && result.teun_user),
        user: result.teun_user || null
      });
    });
    return true; // Keep channel open
  }
  
  // Logout
  if (message.action === 'logout') {
    clearAuth();
    sendResponse({ success: true });
    return true;
  }
  
  // Ping (health check)
  if (message.action === 'ping') {
    sendResponse({ 
      success: true, 
      message: 'Background script is active',
      extensionId: chrome.runtime.id,
      version: chrome.runtime.getManifest().version
    });
    return true;
  }
});

/**
 * Handle messages from dashboard (external)
 * ✅ FIXED VERSION - properly handles async responses
 */
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  console.log('📨 External message from:', sender.url);
  console.log('📨 Message action:', message.action);
  
  // Only allow from teun.ai or localhost
  const isAllowed = sender.url.includes('teun.ai') || sender.url.includes('localhost:3000');
  
  if (!isAllowed) {
    console.warn('⚠️ Unauthorized external message from:', sender.url);
    sendResponse({ success: false, error: 'Unauthorized' });
    return false;  // ✅ FIXED: explicit return value
  }
  
  // Store auth from dashboard
  if (message.action === 'store_auth') {
    console.log('💾 Storing auth from dashboard...');
    const { token, user } = message;
    saveAuth(token, user);
    console.log('✅ Auth stored, sending response');
    sendResponse({ success: true });
    return true;  // ✅ CRITICAL: Keep message channel open!
  }
  
  // Start scan from dashboard
  if (message.action === 'start_scan') {
    const { queries, companyName, integrationId, auth } = message;
    
    if (auth) {
      saveAuth(auth.token, auth.user);
    }
    
    startScan(queries, companyName, integrationId).then(sendResponse);
    return true;
  }
  
  // Check if extension is installed (dashboard detection)
  if (message.action === 'ping') {
    sendResponse({ 
      success: true, 
      extensionId: chrome.runtime.id,
      version: chrome.runtime.getManifest().version,
      isAuthenticated: !!authToken && !!userId
    });
    return true;
  }
  
  // Get status
  if (message.action === 'get_status') {
    sendResponse({
      success: true,
      isScanning: !!currentScan,
      isAuthenticated: !!authToken && !!userId,
      currentScan: currentScan ? {
        companyName: currentScan.companyName,
        totalQueries: currentScan.queries.length,
        completedQueries: currentScan.results.length,
        elapsedSeconds: Math.round((Date.now() - currentScan.startTime) / 1000)
      } : null
    });
    return true;
  }
  
  // Unknown action
  console.warn('⚠️ Unknown action:', message.action);
  sendResponse({ success: false, error: 'Unknown action' });
  return false;
});

/**
 * Listen for tab updates to detect ChatGPT pages
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    if (tab.url.includes('chatgpt.com') || tab.url.includes('chat.openai.com')) {
      console.log('✅ ChatGPT page detected:', tab.url);
      
      // Set badge to indicate extension is ready
      chrome.action.setBadgeText({ text: '✓', tabId: tabId });
      chrome.action.setBadgeBackgroundColor({ color: '#28a745', tabId: tabId });
    }
  }
});

/**
 * Handle browser action (extension icon click) - now just opens popup
 */
// Popup will open automatically, no action needed

/**
 * Keep service worker alive
 */
let keepAliveInterval;

function keepAlive() {
  keepAliveInterval = setInterval(() => {
    chrome.runtime.getPlatformInfo(() => {
      // Just to keep the service worker alive
    });
  }, 20000); // Every 20 seconds
}

keepAlive();

/**
 * Clean up on unload
 */
self.addEventListener('unload', () => {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
  }
});

console.log('✅ Teun.ai Background: Ready!');
console.log('📍 API URL:', getApiUrl());
console.log('🔐 Auth status:', authToken ? 'Authenticated' : 'Not authenticated');