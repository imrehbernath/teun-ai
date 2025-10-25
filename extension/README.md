# 🤖 Teun.ai Chrome Extension - Complete Guide

## ✨ What Is This?

Een Chrome extensie die **live** scant hoe jouw bedrijf gevonden wordt in ChatGPT!

**Features:**
- ✅ Automatic query scanning
- ✅ Real-time progress updates
- ✅ Company mention detection
- ✅ Position tracking (1-10)
- ✅ Dashboard integration
- ✅ Beautiful UI

---

## 📦 Installation

### **Step 1: Setup Extension Files**

```
teun-ai/
└── extension/
    ├── manifest.json
    ├── background.js
    ├── content-script.js
    ├── popup/
    │   ├── popup.html
    │   ├── popup.css
    │   └── popup.js
    └── assets/
        ├── icon-16.png
        ├── icon-48.png
        └── icon-128.png
```

Create all files from the provided code.

---

### **Step 2: Create Icons**

You need 3 icon sizes. Create simple placeholder icons:

**Quick Method - Use Emoji as Icon:**

1. Go to: https://emojitopng.com/
2. Download 🤖 emoji as:
   - 16x16px → `icon-16.png`
   - 48x48px → `icon-48.png`
   - 128x128px → `icon-128.png`
3. Place in `extension/assets/`

**Or use any purple/blue robot icon!**

---

### **Step 3: Load Extension in Chrome**

1. **Open Chrome Extensions:**
   ```
   chrome://extensions/
   ```

2. **Enable Developer Mode:**
   - Toggle switch in top-right

3. **Load Unpacked:**
   - Click "Load unpacked"
   - Select your `extension/` folder

4. **Extension Loaded!** ✅
   - You'll see Teun.ai icon in toolbar

---

### **Step 4: Setup API Endpoint**

Create file: `app/api/chatgpt/extension-scan/route.js`

Copy code from `extension-api-route.js`

---

### **Step 5: Update Dashboard**

Add "Install Extension" button to your dashboard:

```jsx
// app/dashboard/page.jsx

<div className="extension-install-card">
  <h3>🤖 Chrome Extension</h3>
  <p>Scan ChatGPT direct vanuit je browser!</p>
  
  <button onClick={checkExtension}>
    Install Extension
  </button>
</div>

<script>
async function checkExtension() {
  const extensionId = 'YOUR_EXTENSION_ID'; // Get from chrome://extensions/
  
  try {
    const response = await chrome.runtime.sendMessage(
      extensionId,
      { action: 'ping' }
    );
    
    if (response.success) {
      alert('Extension installed! ✅');
    }
  } catch (error) {
    alert('Extension not installed. Install from Chrome Web Store.');
  }
}
</script>
```

---

## 🚀 Usage

### **For Users:**

1. **Install Extension** (one-time)
2. **Login to ChatGPT** in Chrome
3. **Go to Dashboard** on teun.ai
4. **Click "Start ChatGPT Scan"**
5. **Watch magic happen!** ✨

### **What Happens:**

```
User clicks "Start Scan"
    ↓
Dashboard sends message to extension
    ↓
Extension opens ChatGPT tab
    ↓
Types queries one by one
    ↓
Extracts responses
    ↓
Sends results to API
    ↓
Dashboard updates live!
```

---

## 🔧 Development

### **Test Extension:**

```bash
# 1. Load extension in Chrome (see above)

# 2. Open extension popup
# Click extension icon in toolbar

# 3. Check console
# Right-click extension icon → "Inspect popup"

# 4. Test on ChatGPT
# Go to chatgpt.com
# Open DevTools → Console
# Should see: "🤖 Teun.ai Scanner: Content script loaded"
```

### **Debug Messages:**

All components log to console:
- 🤖 Content script
- 🚀 Background worker
- 🎨 Popup

---

## 📡 API Integration

### **Extension → Dashboard Communication:**

**Method 1: Chrome Runtime API (Recommended)**

```javascript
// Dashboard code
const EXTENSION_ID = 'abcdefghijklmnop'; // Your extension ID

// Send message to extension
chrome.runtime.sendMessage(
  EXTENSION_ID,
  {
    action: 'start_scan',
    queries: ['query 1', 'query 2'],
    companyName: 'OnlineLabs',
    auth: {
      token: userAuthToken,
      userId: userId
    }
  },
  (response) => {
    console.log('Scan started:', response);
  }
);
```

**Method 2: postMessage (Alternative)**

```javascript
// Dashboard code
window.postMessage({
  type: 'TEUN_START_SCAN',
  queries: [...],
  companyName: '...',
  auth: {...}
}, '*');
```

---

## 🔐 Authentication

Extension needs user's auth token to send results to API:

```javascript
// Dashboard sends auth when starting scan
{
  action: 'start_scan',
  auth: {
    token: supabase.auth.session().access_token,
    userId: user.id
  }
}

// Extension stores auth
chrome.storage.local.set({ authToken, userId });

// Extension uses auth for API calls
fetch('/api/chatgpt/extension-scan', {
  headers: {
    'Authorization': `Bearer ${authToken}`
  }
});
```

---

## 🎯 Dashboard Button Component

```jsx
// components/ChatGPTExtensionButton.jsx

'use client'

import { useState, useEffect } from 'react'

export default function ChatGPTExtensionButton({ queries, companyName }) {
  const [extensionInstalled, setExtensionInstalled] = useState(false)
  const [scanning, setScanning] = useState(false)
  
  const EXTENSION_ID = 'YOUR_EXTENSION_ID'
  
  useEffect(() => {
    checkExtension()
  }, [])
  
  async function checkExtension() {
    try {
      const response = await chrome.runtime.sendMessage(
        EXTENSION_ID,
        { action: 'ping' }
      )
      setExtensionInstalled(response.success)
    } catch (error) {
      setExtensionInstalled(false)
    }
  }
  
  async function startScan() {
    if (!extensionInstalled) {
      alert('Install extension first!')
      return
    }
    
    setScanning(true)
    
    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await chrome.runtime.sendMessage(
        EXTENSION_ID,
        {
          action: 'start_scan',
          queries: queries,
          companyName: companyName,
          auth: {
            token: session.access_token,
            userId: session.user.id
          }
        }
      )
      
      if (response.success) {
        alert('Scan started! ✅')
      }
      
    } catch (error) {
      console.error('Failed to start scan:', error)
      alert('Failed to start scan')
    } finally {
      setScanning(false)
    }
  }
  
  if (!extensionInstalled) {
    return (
      <div className="install-extension-prompt">
        <h3>🤖 Chrome Extension Required</h3>
        <button onClick={() => window.open('chrome://extensions/')}>
          Install Extension
        </button>
      </div>
    )
  }
  
  return (
    <button 
      onClick={startScan}
      disabled={scanning}
      className="start-scan-button"
    >
      {scanning ? '⏳ Starting...' : '🚀 Start ChatGPT Scan'}
    </button>
  )
}
```

---

## 📊 Database Schema

Already created from Python setup:

```sql
CREATE TABLE chatgpt_live_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  query TEXT NOT NULL,
  found BOOLEAN DEFAULT FALSE,
  position INTEGER,
  snippet TEXT,
  response_length INTEGER,
  scanned_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🚀 Publishing to Chrome Web Store

When ready for production:

1. **Create developer account:** https://chrome.google.com/webstore/devconsole/
2. **Pay $5 one-time fee**
3. **Zip extension folder**
4. **Upload to Web Store**
5. **Fill in store listing**
6. **Submit for review** (1-3 days)
7. **Published!** ✅

---

## 🐛 Troubleshooting

### **Extension not loading?**
- Check `manifest.json` syntax
- Check all files are in correct locations
- Reload extension in chrome://extensions/

### **Content script not working?**
- Go to chatgpt.com
- Open DevTools → Console
- Should see: "🤖 Teun.ai Scanner: Content script loaded"
- If not, check content_scripts in manifest

### **API errors?**
- Check API endpoint exists
- Check CORS settings
- Check auth token is valid

### **Queries not typing?**
- ChatGPT changed their textarea selector
- Update `CONFIG.TEXTAREA_SELECTORS` in content-script.js

---

## 📝 Configuration

### **Change API URL:**

In `background.js`:

```javascript
// Development
const API_BASE_URL = 'http://localhost:3000'

// Production
const API_BASE_URL = 'https://teun.ai'
```

### **Change Delays:**

In `content-script.js`:

```javascript
const CONFIG = {
  TYPING_DELAY_MIN: 50,    // Typing speed
  TYPING_DELAY_MAX: 150,
  MAX_WAIT_TIME: 90000,    // 90s timeout
  POLL_INTERVAL: 1000      // Check every 1s
}
```

---

## ✅ Testing Checklist

- [ ] Extension loads without errors
- [ ] Popup opens and shows UI
- [ ] Content script loads on ChatGPT
- [ ] Can type queries
- [ ] Gets responses
- [ ] Detects company mentions
- [ ] Sends results to API
- [ ] Dashboard receives data
- [ ] Auth works correctly

---

## 🎉 You're Done!

Extension is ready to use! 🚀

**Questions?** Check the code comments or console logs!

---

## 📚 Resources

- Chrome Extension Docs: https://developer.chrome.com/docs/extensions/
- Manifest V3 Guide: https://developer.chrome.com/docs/extensions/mv3/
- Content Scripts: https://developer.chrome.com/docs/extensions/mv3/content_scripts/
- Message Passing: https://developer.chrome.com/docs/extensions/mv3/messaging/

---

**Made with ❤️ for Teun.ai**