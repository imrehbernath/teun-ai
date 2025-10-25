"""
Teun.ai ChatGPT Scanner - Simplified Version
Uses regular Selenium (more reliable, works with Chrome 141)
"""

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
import sys
import time
import random
import json

def log_progress(type, data):
    """Output JSON progress update"""
    progress = {
        "type": type,
        "data": data,
        "timestamp": time.time()
    }
    print(f"PROGRESS:{json.dumps(progress)}", flush=True)

def type_like_human(element, text):
    """Type text with human-like delays"""
    for char in text:
        element.send_keys(char)
        time.sleep(random.uniform(0.05, 0.15))

def check_company_mention(text, company_name):
    """Check if company is mentioned"""
    return company_name.lower() in text.lower()

def extract_snippet(text, company_name, context_length=100):
    """Extract snippet around company mention"""
    normalized_text = text.lower()
    normalized_company = company_name.lower()
    index = normalized_text.find(normalized_company)
    
    if index == -1:
        return None
    
    start = max(0, index - context_length)
    end = min(len(text), index + len(company_name) + context_length)
    
    return text[start:end].strip()

def estimate_position(text, company_name):
    """Estimate position in results (1-10)"""
    index = text.lower().find(company_name.lower())
    if index == -1:
        return None
    
    percentage = (index / len(text)) * 100
    
    if percentage < 10: return 1
    if percentage < 20: return 2
    if percentage < 30: return 3
    if percentage < 40: return 4
    if percentage < 50: return 5
    if percentage < 60: return 6
    if percentage < 70: return 7
    if percentage < 80: return 8
    if percentage < 90: return 9
    return 10

def scan_chatgpt_query(driver, prompt, company_name):
    """Scan a single query"""
    
    log_progress("query_start", {
        "query": prompt,
        "status": "typing"
    })
    
    try:
        time.sleep(2)
        
        # Find textarea
        textarea = None
        selectors = [
            "textarea#prompt-textarea",
            "textarea[data-id]",
            "textarea",
            "div[contenteditable='true']"
        ]
        
        for selector in selectors:
            try:
                textarea = driver.find_element(By.CSS_SELECTOR, selector)
                if textarea:
                    break
            except:
                continue
        
        if not textarea:
            raise Exception("Could not find input field")
        
        # Clear and type
        textarea.click()
        time.sleep(0.5)
        
        if textarea.tag_name.lower() == 'textarea':
            textarea.clear()
        else:
            textarea.send_keys(Keys.CONTROL + "a")
            textarea.send_keys(Keys.DELETE)
        
        time.sleep(0.5)
        
        log_progress("query_typing", {
            "query": prompt,
            "progress": 0
        })
        
        type_like_human(textarea, prompt)
        
        log_progress("query_typing", {
            "query": prompt,
            "progress": 100
        })
        
        time.sleep(0.5)
        textarea.send_keys(Keys.RETURN)
        
        log_progress("query_submitted", {
            "query": prompt,
            "status": "waiting_for_response"
        })
        
        # Wait for response
        max_wait = 90
        waited = 0
        
        while waited < max_wait:
            time.sleep(1)
            waited += 1
            
            # Check if still generating
            stop_buttons = driver.find_elements(By.CSS_SELECTOR, "button[aria-label*='Stop']")
            is_generating = len(stop_buttons) > 0
            
            if waited % 5 == 0:
                log_progress("query_waiting", {
                    "query": prompt,
                    "elapsed": waited,
                    "max": max_wait
                })
            
            if not is_generating and waited > 3:
                break
        
        # Extract response
        time.sleep(2)
        
        assistant_messages = driver.find_elements(By.CSS_SELECTOR, "[data-message-author-role='assistant']")
        
        if not assistant_messages:
            raise Exception("No response found")
        
        last_message = assistant_messages[-1]
        response_text = last_message.text
        
        log_progress("response_received", {
            "query": prompt,
            "response_length": len(response_text),
            "preview": response_text[:200] + "..." if len(response_text) > 200 else response_text
        })
        
        # Check for company mention
        found = check_company_mention(response_text, company_name)
        snippet = extract_snippet(response_text, company_name) if found else None
        position = estimate_position(response_text, company_name) if found else None
        
        log_progress("query_complete", {
            "query": prompt,
            "found": found,
            "position": position,
            "snippet": snippet,
            "response_length": len(response_text)
        })
        
        return {
            "query": prompt,
            "found": found,
            "position": position,
            "snippet": snippet,
            "success": True
        }
        
    except Exception as e:
        log_progress("query_error", {
            "query": prompt,
            "error": str(e)
        })
        
        return {
            "query": prompt,
            "found": False,
            "error": str(e),
            "success": False
        }

def main():
    """Main function"""
    
    if len(sys.argv) < 4:
        log_progress("error", {"message": "Usage: python scanner.py <user_data_dir> <company_name> <query1> [query2] ..."})
        sys.exit(1)
    
    user_data_dir = sys.argv[1]
    company_name = sys.argv[2]
    queries = sys.argv[3:]
    
    log_progress("scan_start", {
        "company": company_name,
        "queries": queries,
        "total": len(queries),
        "user_data_dir": user_data_dir
    })
    
    driver = None
    results = []
    
    try:
        log_progress("browser_starting", {
            "status": "initializing",
            "profile": user_data_dir
        })
        
        # Setup Chrome options
        chrome_options = Options()
        chrome_options.add_argument(f"--user-data-dir={user_data_dir}")
        chrome_options.add_argument("--profile-directory=Default")
        chrome_options.add_argument("--window-size=1280,720")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-blink-features=AutomationControlled")
        chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
        chrome_options.add_experimental_option('useAutomationExtension', False)
        
        log_progress("browser_starting", {
            "status": "launching_chrome"
        })
        
        # Create driver (auto-downloads correct ChromeDriver)
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)
        
        log_progress("browser_started", {"status": "ready"})
        
        # Navigate to ChatGPT
        log_progress("navigating", {"url": "https://chatgpt.com"})
        driver.get("https://chatgpt.com")
        
        time.sleep(5)
        
        # Check if logged in
        current_url = driver.current_url
        if "auth" in current_url or "login" in current_url:
            log_progress("error", {"message": "Not logged in to ChatGPT. Please login first."})
            driver.quit()
            sys.exit(1)
        
        log_progress("ready", {"status": "starting_queries"})
        
        # Scan each query
        for i, query in enumerate(queries):
            log_progress("query_progress", {
                "current": i + 1,
                "total": len(queries),
                "query": query
            })
            
            result = scan_chatgpt_query(driver, query, company_name)
            results.append(result)
            
            # Wait between queries (except last)
            if i < len(queries) - 1:
                delay = random.randint(30, 45)
                log_progress("waiting", {
                    "seconds": delay,
                    "reason": "rate_limit_prevention"
                })
                time.sleep(delay)
        
        # Complete
        log_progress("scan_complete", {
            "total_queries": len(queries),
            "successful": sum(1 for r in results if r.get("success")),
            "found_count": sum(1 for r in results if r.get("found")),
            "results": results
        })
        
    except Exception as e:
        log_progress("critical_error", {
            "error": str(e),
            "type": type(e).__name__
        })
        sys.exit(1)
        
    finally:
        if driver:
            try:
                driver.quit()
                log_progress("browser_closed", {"status": "cleanup_complete"})
            except:
                pass

if __name__ == "__main__":
    main()