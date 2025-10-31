/**
 * Teun.ai Chrome Extension - Popup Script
 * Main UI for starting ChatGPT scans
 */

// Configuration
const CONFIG = {
  DASHBOARD_URL_DEV: 'http://localhost:3000',
  DASHBOARD_URL_PROD: 'https://teun.ai',
  isDevelopment: true // ← SET TO FALSE FOR PRODUCTION
};

function getDashboardUrl() {
  return CONFIG.isDevelopment ? CONFIG.DASHBOARD_URL_DEV : CONFIG.DASHBOARD_URL_PROD;
}

// State
let currentUser = null;
let scanInProgress = false;
let currentResults = [];

// DOM Elements
const loginSection = document.getElementById('login-section');
const scanSection = document.getElementById('scan-section');
const resultsSection = document.getElementById('results-section');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const startScanBtn = document.getElementById('start-scan-btn');
const companyNameInput = document.getElementById('company-name');
const promptsTextarea = document.getElementById('prompts');
const progressSection = document.getElementById('progress-section');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const currentQueryText = document.getElementById('current-query');
const resultsGrid = document.getElementById('results-grid');
const foundCount = document.getElementById('found-count');
const totalCount = document.getElementById('total-count');
const visibilityScore = document.getElementById('visibility-score');
const viewDashboardBtn = document.getElementById('view-dashboard-btn');
const newScanBtn = document.getElementById('new-scan-btn');

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Popup loaded');
  checkAuth();
  setupEventListeners();
  checkIfOnChatGPT();
});

/**
 * Check if user is authenticated
 */
async function checkAuth() {
  try {
    // Check if we have stored user data
    const result = await chrome.storage.local.get(['teun_user', 'teun_token']);
    
    if (result.teun_user && result.teun_token) {
      currentUser = result.teun_user;
      
      // Display user email
      const userEmailEl = document.getElementById('user-email');
      if (userEmailEl) {
        userEmailEl.textContent = currentUser.email;
      }
      
      showScanSection();
      
      // Load latest scan data automatically
      await loadLatestScanFromDashboard();
    } else {
      showLoginSection();
    }
  } catch (error) {
    console.error('Auth check error:', error);
    showLoginSection();
  }
}

/**
 * Load latest scan from dashboard API
 * Fails silently - user can always enter data manually
 */
async function loadLatestScanFromDashboard() {
  try {
    console.log('📥 Attempting to load latest scan...');
    
    // Get auth token
    const { teun_token } = await chrome.storage.local.get(['teun_token']);

    if (!teun_token) {
      console.log('ℹ️ No auth token - skipping auto-load');
      return;
    }
    
    const url = `${getDashboardUrl()}/api/integrations/latest`;
    console.log('🌐 Fetching from:', url);
    
    // Fetch latest integration from dashboard
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${teun_token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📡 Response:', response.status, response.statusText);
    
    // Handle different response codes gracefully
    if (response.status === 404 || response.status === 401) {
      console.log('ℹ️ No previous scan found - this is OK for new users');
      return;
    }
    
    if (!response.ok) {
      console.log('⚠️ Could not load scan:', response.status, '- user can enter manually');
      return;
    }
    
    const data = await response.json();
    
    if (data.success && data.integration) {
      const scan = data.integration;
      console.log('✅ Scan loaded! Company:', scan.company_name, 'Prompts:', scan.commercial_prompts?.length || 0);
      
      // Pre-fill company name
      if (scan.company_name) {
        companyNameInput.value = scan.company_name;
      }
      
      // Pre-fill commercial prompts
      if (scan.commercial_prompts && scan.commercial_prompts.length > 0) {
        promptsTextarea.value = scan.commercial_prompts.join('\n');
        promptsTextarea.style.height = 'auto';
        promptsTextarea.style.height = promptsTextarea.scrollHeight + 'px';
        
        showNotification(`✅ Laatste scan geladen: ${scan.commercial_prompts.length} prompts!`, 'success');
      } else {
        console.log('ℹ️ Scan found but no prompts - user can add manually');
      }
    } else {
      console.log('ℹ️ No previous scan - user can enter first scan');
    }
    
  } catch (error) {
    // Network error or other fetch failure - this is OK
    console.log('ℹ️ Could not auto-load scan (this is normal):', error.message);
    // Don't show error to user - they can use extension normally
  }
}

/**
 * Check if we're on ChatGPT
 */
async function checkIfOnChatGPT() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.url.includes('chatgpt.com') && !tab.url.includes('chat.openai.com')) {
      showError('⚠️ Open ChatGPT.com om te scannen');
      startScanBtn.disabled = true;
    }
  } catch (error) {
    console.error('Tab check error:', error);
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  loginBtn.addEventListener('click', handleLogin);
  logoutBtn.addEventListener('click', handleLogout);
  startScanBtn.addEventListener('click', handleStartScan);
  viewDashboardBtn.addEventListener('click', openDashboard);
  newScanBtn.addEventListener('click', resetToScanSection);
  
  // Auto-resize textarea
  promptsTextarea.addEventListener('input', () => {
    promptsTextarea.style.height = 'auto';
    promptsTextarea.style.height = promptsTextarea.scrollHeight + 'px';
  });
}

/**
 * Handle login
 */
function handleLogin() {
  // Open login in new tab
  chrome.tabs.create({ url: getDashboardUrl() + '/login?extension=true' });
  
  // Show instructions
  showNotification('Log in op Teun.ai en kom daarna terug naar deze popup', 'info');
  
  // Poll for auth
  const pollInterval = setInterval(async () => {
    const result = await chrome.storage.local.get(['teun_user', 'teun_token']);
    if (result.teun_user && result.teun_token) {
      clearInterval(pollInterval);
      currentUser = result.teun_user;
      
      // Display user email
      const userEmailEl = document.getElementById('user-email');
      if (userEmailEl) {
        userEmailEl.textContent = currentUser.email;
      }
      
      showScanSection();
      showNotification('✅ Ingelogd als ' + currentUser.email, 'success');
      
      // Load latest scan after login
      await loadLatestScanFromDashboard();
    }
  }, 2000);
  
  // Stop polling after 5 minutes
  setTimeout(() => clearInterval(pollInterval), 300000);
}

/**
 * Handle logout
 */
async function handleLogout() {
  await chrome.storage.local.remove(['teun_user', 'teun_token']);
  currentUser = null;
  showLoginSection();
  showNotification('Uitgelogd', 'info');
}

/**
 * Handle start scan
 */
async function handleStartScan() {
  const companyName = companyNameInput.value.trim();
  const promptsText = promptsTextarea.value.trim();
  
  // Validate
  if (!companyName) {
    showError('Vul een bedrijfsnaam in');
    return;
  }
  
  if (!promptsText) {
    showError('Vul minimaal 1 prompt in');
    return;
  }
  
  // Parse prompts (split by newlines, filter empty)
  const prompts = promptsText
    .split('\n')
    .map(p => p.trim())
    .filter(p => p.length > 0);
  
  if (prompts.length === 0) {
    showError('Geen geldige prompts gevonden');
    return;
  }
  
  if (prompts.length > 10) {
    showError('Maximum 10 prompts per scan');
    return;
  }
  
  // Start scan
  await startScan(companyName, prompts);
}

/**
 * Start scan
 */
async function startScan(companyName, prompts) {
  try {
    scanInProgress = true;
    currentResults = [];
    
    // Show progress section
    showProgressSection();
    startScanBtn.disabled = true;
    
    console.log('🚀 Starting scan via background:', { companyName, prompts: prompts.length });
    
    // Send to BACKGROUND.JS (not content script directly!)
    const response = await chrome.runtime.sendMessage({
      action: 'start_scan',
      queries: prompts,
      companyName: companyName,
      integrationId: null
    });
    
    if (!response || !response.success) {
      throw new Error(response?.error || 'Failed to start scan');
    }
    
    console.log('✅ Scan started:', response);
    updateProgress(0, prompts.length, 'Scan gestart...');
    
  } catch (error) {
    console.error('❌ Scan error:', error);
    showError('Scan mislukt: ' + error.message);
    scanInProgress = false;
    startScanBtn.disabled = false;
    hideProgressSection();
  }
}

/**
 * Listen for scan progress from content script
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Popup received:', message);
  
  if (message.action === 'scan_progress') {
    handleScanProgress(message);
  }
  
  sendResponse({ received: true });
});

/**
 * Handle scan progress updates
 */
function handleScanProgress(message) {
  const { type, data } = message;
  console.log('📊 Progress update:', type, data);
  switch (type) {
    case 'scan_start':
      updateProgress(0, data.total, 'Scan gestart...');
      break;
      
    case 'query_progress':
      updateProgress(data.current, data.total, `Query ${data.current}/${data.total}`);
      currentQueryText.textContent = data.query;
      break;
      
    case 'query_typing':
      currentQueryText.textContent = `Typing: ${data.query}`;
      break;
      
    case 'query_submitted':
      currentQueryText.textContent = `Wachten op antwoord...`;
      break;
      
    case 'response_received':
      currentQueryText.textContent = `Antwoord ontvangen (${data.response_length} chars)`;
      break;
      
    case 'query_complete':
      currentResults.push(data);
      break;
      
    case 'waiting':
      currentQueryText.textContent = `Wachten ${data.seconds}s...`;
      break;
      
    case 'scan_complete':
      handleScanComplete(data);
      break;
      
    case 'scan_error':
      showError('Scan error: ' + data.error);
      scanInProgress = false;
      startScanBtn.disabled = false;
      hideProgressSection();
      break;
  }
}

/**
 * Handle scan completion
 */
function handleScanComplete(data) {
  console.log('✅ Scan complete:', data);
  
  scanInProgress = false;
  startScanBtn.disabled = false;
  
  // Show results
  displayResults(data);
  
  // Show notification
  const foundPercentage = Math.round((data.found_count / data.total_queries) * 100);
  showNotification(
    `✅ Scan compleet! ${data.found_count}/${data.total_queries} gevonden (${foundPercentage}%)`,
    'success'
  );
}

/**
 * Display scan results
 */
function displayResults(data) {
  // Update stats
  foundCount.textContent = data.found_count;
  totalCount.textContent = data.total_queries;
  
  const score = Math.round((data.found_count / data.total_queries) * 100);
  visibilityScore.textContent = score + '%';
  visibilityScore.className = score >= 70 ? 'score good' : score >= 40 ? 'score medium' : 'score low';
  
  // Display individual results
  resultsGrid.innerHTML = '';
  
  data.results.forEach((result, index) => {
    const card = document.createElement('div');
    card.className = 'result-card';
    
    const status = result.found ? '✅' : '❌';
    const statusClass = result.found ? 'found' : 'not-found';
    
    card.innerHTML = `
      <div class="result-header">
        <span class="result-number">#${index + 1}</span>
        <span class="result-status ${statusClass}">${status}</span>
      </div>
      <div class="result-query">${escapeHtml(result.query)}</div>
      ${result.found ? `
        <div class="result-details">
          <div class="result-position">Positie: ${result.position || 'N/A'}</div>
          ${result.snippet ? `
            <div class="result-snippet">${escapeHtml(result.snippet)}</div>
          ` : ''}
        </div>
      ` : ''}
    `;
    
    resultsGrid.appendChild(card);
  });
  
  // Show results section
  showResultsSection();
}

/**
 * Update progress bar
 */
function updateProgress(current, total, text) {
  const percentage = total > 0 ? (current / total) * 100 : 0;
  progressBar.style.width = percentage + '%';
  progressText.textContent = text || `${current}/${total}`;
}

/**
 * Show/hide sections
 */
function showLoginSection() {
  loginSection.style.display = 'block';
  scanSection.style.display = 'none';
  resultsSection.style.display = 'none';
}

function showScanSection() {
  loginSection.style.display = 'none';
  scanSection.style.display = 'block';
  resultsSection.style.display = 'none';
  progressSection.style.display = 'none';
}

function showProgressSection() {
  progressSection.style.display = 'block';
  companyNameInput.disabled = true;
  promptsTextarea.disabled = true;
}

function hideProgressSection() {
  progressSection.style.display = 'none';
  companyNameInput.disabled = false;
  promptsTextarea.disabled = false;
}

function showResultsSection() {
  loginSection.style.display = 'none';
  scanSection.style.display = 'none';
  resultsSection.style.display = 'block';
}

function resetToScanSection() {
  currentResults = [];
  companyNameInput.value = '';
  promptsTextarea.value = '';
  showScanSection();
  
  // Reload latest scan
  loadLatestScanFromDashboard();
}

/**
 * Open dashboard
 */
function openDashboard() {
  chrome.tabs.create({ url: getDashboardUrl() + '/dashboard' });
}

/**
 * Show notification
 */
function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // Auto-remove after 3 seconds
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

/**
 * Show error
 */
function showError(message) {
  showNotification(message, 'error');
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Load sample prompts
 */

console.log('✅ Popup script initialized');