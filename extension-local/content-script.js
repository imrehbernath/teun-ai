/**
 * Teun.ai Content Script
 * Runs on ChatGPT pages to perform automated scans
 */

console.log('🚀 Teun.ai Content Script: Loaded');

// Configuration
const CONFIG = {
  TEXTAREA_SELECTORS: [
    '#prompt-textarea',
    'textarea[placeholder*="Message"]',
    'textarea[data-id="root"]',
    '[contenteditable="true"]'
  ],
  STOP_BUTTON_SELECTOR: 'button[aria-label*="Stop"]',
  ASSISTANT_MESSAGE_SELECTOR: '[data-message-author-role="assistant"]',
  TYPING_DELAY_MIN: 30,
  TYPING_DELAY_MAX: 80,
  MAX_WAIT_TIME: 120000, // 2 minutes
  POLL_INTERVAL: 500
};

// State
let isScanning = false;
let currentScan = null;

// Signal presence to dashboard
document.documentElement.setAttribute('data-teun-extension', 'true');
console.log('✅ Extension presence signaled to page');

/**
 * Type text character by character (human-like)
 */
function typeHumanLike(element, text) {
  return new Promise((resolve) => {
    let index = 0;
    
    function typeChar() {
      if (index < text.length) {
        const char = text[index];
        
        // Handle different element types
        if (element.tagName.toLowerCase() === 'textarea') {
          element.value += char;
        } else {
          // For contenteditable divs
          element.textContent += char;
        }
        
        // Trigger input event
        const event = new Event('input', { bubbles: true });
        element.dispatchEvent(event);
        
        index++;
        
        const delay = Math.random() * 
          (CONFIG.TYPING_DELAY_MAX - CONFIG.TYPING_DELAY_MIN) + 
          CONFIG.TYPING_DELAY_MIN;
        
        setTimeout(typeChar, delay);
      } else {
        resolve();
      }
    }
    
    typeChar();
  });
}

/**
 * Find input textarea
 */
function findTextarea() {
  for (const selector of CONFIG.TEXTAREA_SELECTORS) {
    try {
      const element = document.querySelector(selector);
      if (element) {
        console.log('✅ Found textarea:', selector);
        return element;
      }
    } catch (e) {
      continue;
    }
  }
  console.warn('⚠️ Textarea not found');
  return null;
}

/**
 * Clear textarea
 */
function clearTextarea(textarea) {
  if (textarea.tagName.toLowerCase() === 'textarea') {
    textarea.value = '';
  } else {
    textarea.textContent = '';
  }
  
  // Trigger events
  const inputEvent = new Event('input', { bubbles: true });
  const changeEvent = new Event('change', { bubbles: true });
  textarea.dispatchEvent(inputEvent);
  textarea.dispatchEvent(changeEvent);
}

/**
 * Submit query
 */
function submitQuery(textarea) {
  // Try Enter key
  const enterEvent = new KeyboardEvent('keydown', {
    key: 'Enter',
    code: 'Enter',
    keyCode: 13,
    which: 13,
    bubbles: true
  });
  
  textarea.dispatchEvent(enterEvent);
  
  // Fallback: click submit button
  setTimeout(() => {
    const submitButton = document.querySelector('button[data-testid="send-button"]');
    if (submitButton && !submitButton.disabled) {
      submitButton.click();
      console.log('✅ Submit button clicked');
    }
  }, 100);
}

/**
 * Check if ChatGPT is still generating
 */
function isGenerating() {
  const stopButtons = document.querySelectorAll(CONFIG.STOP_BUTTON_SELECTOR);
  return stopButtons.length > 0;
}

/**
 * Get latest assistant message
 */
function getLatestResponse() {
  const messages = document.querySelectorAll(CONFIG.ASSISTANT_MESSAGE_SELECTOR);
  if (messages.length === 0) return null;
  
  const lastMessage = messages[messages.length - 1];
  return lastMessage.textContent || lastMessage.innerText;
}

/**
 * Wait for response to complete
 */
async function waitForResponse(maxWaitMs = CONFIG.MAX_WAIT_TIME) {
  const startTime = Date.now();
  
  return new Promise((resolve, reject) => {
    const checkInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      
      // Timeout
      if (elapsed > maxWaitMs) {
        clearInterval(checkInterval);
        reject(new Error('Response timeout'));
        return;
      }
      
      // Check if response is complete
      if (!isGenerating() && elapsed > 3000) {
        clearInterval(checkInterval);
        
        // Wait a bit more to ensure complete
        setTimeout(() => {
          const response = getLatestResponse();
          if (response) {
            resolve(response);
          } else {
            reject(new Error('No response found'));
          }
        }, 2000);
      }
      
      // Send progress update
      if (elapsed % 5000 === 0) {
        sendProgress('waiting', {
          elapsed: Math.round(elapsed / 1000),
          max: Math.round(maxWaitMs / 1000)
        });
      }
    }, CONFIG.POLL_INTERVAL);
  });
}

/**
 * Check if company is mentioned in text
 */
function checkCompanyMention(text, companyName) {
  const normalized = text.toLowerCase();
  const company = companyName.toLowerCase();
  return normalized.includes(company);
}

/**
 * Extract snippet around company mention
 */
function extractSnippet(text, companyName, contextLength = 100) {
  const normalized = text.toLowerCase();
  const company = companyName.toLowerCase();
  const index = normalized.indexOf(company);
  
  if (index === -1) return null;
  
  const start = Math.max(0, index - contextLength);
  const end = Math.min(text.length, index + companyName.length + contextLength);
  
  return text.substring(start, end).trim();
}

/**
 * Estimate position in response (1-10)
 */
function estimatePosition(text, companyName) {
  const index = text.toLowerCase().indexOf(companyName.toLowerCase());
  if (index === -1) return null;
  
  const percentage = (index / text.length) * 100;
  
  if (percentage < 10) return 1;
  if (percentage < 20) return 2;
  if (percentage < 30) return 3;
  if (percentage < 40) return 4;
  if (percentage < 50) return 5;
  if (percentage < 60) return 6;
  if (percentage < 70) return 7;
  if (percentage < 80) return 8;
  if (percentage < 90) return 9;
  return 10;
}

/**
 * Send progress update to background
 */
function sendProgress(type, data) {
  chrome.runtime.sendMessage({
    action: 'scan_progress',
    type: type,
    data: data
  }).catch(err => {
    console.warn('Failed to send progress:', err);
  });
}

/**
 * Scan a single query
 */
async function scanQuery(query, companyName) {
  console.log(`🔍 Scanning query: "${query}"`);
  
  try {
    // Send start event
    sendProgress('query_start', { query, status: 'typing' });
    
    // Find textarea
    const textarea = findTextarea();
    if (!textarea) {
      throw new Error('Could not find ChatGPT input field');
    }
    
    // Clear and focus
    clearTextarea(textarea);
    textarea.focus();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Type query
    sendProgress('query_typing', { query, progress: 0 });
    await typeHumanLike(textarea, query);
    sendProgress('query_typing', { query, progress: 100 });
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Submit
    submitQuery(textarea);
    sendProgress('query_submitted', { query, status: 'waiting_for_response' });
    
    // Wait for response
    const response = await waitForResponse();
    
    sendProgress('response_received', {
      query,
      response_length: response.length,
      preview: response.substring(0, 200) + '...'
    });
    
    // Analyze response
    const found = checkCompanyMention(response, companyName);
    const snippet = found ? extractSnippet(response, companyName) : null;
    const position = found ? estimatePosition(response, companyName) : null;
    
    const result = {
      query,
      found,
      position,
      snippet,
      response_length: response.length,
      response_preview: response.substring(0, 500),
      full_response: response, // Include full response for backend
      success: true,
      timestamp: new Date().toISOString()
    };
    
    sendProgress('query_complete', result);
    
    return result;
    
  } catch (error) {
    console.error('❌ Query error:', error);
    
    const result = {
      query,
      found: false,
      error: error.message,
      success: false,
      timestamp: new Date().toISOString()
    };
    
    sendProgress('query_error', result);
    
    return result;
  }
}

/**
 * Run full scan
 */
async function runScan(queries, companyName, userId, integrationId) {
  if (isScanning) {
    console.warn('⚠️ Scan already in progress');
    return;
  }
  
  isScanning = true;
  currentScan = {
    queries,
    companyName,
    userId,
    integrationId,
    results: [],
    startTime: Date.now()
  };
  
  console.log(`🚀 Starting scan: ${queries.length} queries for "${companyName}"`);
  
  sendProgress('scan_start', {
    company: companyName,
    queries,
    total: queries.length
  });
  
  try {
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      
      sendProgress('query_progress', {
        current: i + 1,
        total: queries.length,
        query
      });
      
      const result = await scanQuery(query, companyName);
      currentScan.results.push(result);
      
      // Wait between queries (except last)
      if (i < queries.length - 1) {
        const delay = 3 + Math.random() * 2; // 3-5 seconds between queries
        sendProgress('waiting', {
          seconds: Math.round(delay),
          reason: 'rate_limit_prevention'
        });
        
        await new Promise(resolve => setTimeout(resolve, delay * 1000));
      }
    }
    
    // Complete
    const successCount = currentScan.results.filter(r => r.success).length;
    const foundCount = currentScan.results.filter(r => r.found).length;
    
    sendProgress('scan_complete', {
      total_queries: queries.length,
      successful: successCount,
      found_count: foundCount,
      results: currentScan.results
    });
    
    console.log('✅ Scan complete!');
    
  } catch (error) {
    console.error('❌ Scan error:', error);
    sendProgress('scan_error', { error: error.message });
  } finally {
    isScanning = false;
    currentScan = null;
  }
}

/**
 * Message listener from popup/background
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Content script received:', message);
  
  if (message.action === 'start_scan') {
    const { queries, companyName, userId, integrationId } = message;
    
    // Check if we're on ChatGPT
    if (!window.location.href.includes('chatgpt.com') && 
        !window.location.href.includes('chat.openai.com')) {
      sendResponse({ 
        success: false, 
        error: 'Not on ChatGPT page. Please open chatgpt.com first.' 
      });
      return true;
    }
    
   // Validate required fields (userId is optional from background.js)
    if (!companyName || !queries || queries.length === 0) {
      sendResponse({ 
        success: false, 
        error: 'Missing required fields: companyName or queries' 
      });
      return true;
    }
    
    // Start scan (async)
    runScan(queries, companyName, userId, integrationId);
    
    sendResponse({ 
      success: true, 
      message: 'Scan started',
      total_queries: queries.length
    });
    
    return true; // Keep channel open for async
  }
  
  if (message.action === 'get_status') {
    sendResponse({
      isScanning,
      currentScan: currentScan ? {
        queries: currentScan.queries,
        companyName: currentScan.companyName,
        resultsCount: currentScan.results.length,
        userId: currentScan.userId
      } : null
    });
    return true;
  }
  
  if (message.action === 'ping') {
    sendResponse({ 
      success: true, 
      message: 'Content script is active',
      url: window.location.href,
      extension_version: '1.0.0'
    });
    return true;
  }
});

// Re-signal presence on DOM changes (for SPA navigation)
const observer = new MutationObserver(() => {
  if (!document.documentElement.hasAttribute('data-teun-extension')) {
    document.documentElement.setAttribute('data-teun-extension', 'true');
    console.log('📡 Re-signaled presence to dashboard');
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: false
});

console.log('✅ Teun.ai Content Script: Ready!');
console.log('📍 Current URL:', window.location.href);