"""Download February 2025 report - handles group access."""
import os
import json
import base64
from pathlib import Path
from urllib.parse import unquote

from dotenv import load_dotenv
from playwright.sync_api import sync_playwright

load_dotenv(Path(__file__).parent / ".env")
EMAIL = os.environ["EMAIL"]
PASSWORD = os.environ["PASSWORD"]

REPORT_URL = "https://cyclestrading-course.com/דוח-חודשי-פברואר-2025/"
GROUP_URL = "https://cyclestrading-course.com/groups/%d7%a4%d7%91%d7%a8%d7%95%d7%90%d7%a8-25/"
REPORTS_DIR = Path(__file__).parent / "reports"
REPORT_DIR = REPORTS_DIR / "דוח-חודשי-פברואר-2025"

ASSET_KEYWORDS = {
    "S&P": "sp500", "S&P500": "sp500",
    "ביטקוין": "bitcoin", "Bitcoin": "bitcoin",
    "EUR/USD": "eurusd", "יורו": "eurusd",
    "זהב": "gold", "Gold": "gold",
    "נפט": "oil", "Oil": "oil",
}


def login(page):
    page.goto("https://cyclestrading-course.com/", wait_until="domcontentloaded")
    page.get_by_role("link", name="התחבר").click()
    page.get_by_role("textbox", name="שם משתמש או כתובת אימייל").fill(EMAIL)
    page.get_by_role("textbox", name="סיסמה").fill(PASSWORD)
    page.get_by_role("button", name="התחבר").click()
    page.get_by_text("שלום").first.wait_for(state="visible", timeout=15000)
    print("Login successful!")
    page.wait_for_timeout(2000)


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    login(page)

    # Try accessing the group page first
    print(f"Navigating to group page: {GROUP_URL}")
    page.goto(GROUP_URL, wait_until="domcontentloaded")
    page.wait_for_timeout(3000)

    # Check what's on the group page
    group_content = page.evaluate("""() => {
        const body = document.body;
        // Find links to the report within the group
        const links = body.querySelectorAll('a');
        let reportLinks = [];
        links.forEach(a => {
            const href = a.href || '';
            const text = a.textContent.trim();
            if (href.includes('פברואר') || href.includes('%D7%A4%D7%91%D7%A8%D7%95%D7%90%D7%A8') ||
                text.includes('פברואר') || text.includes('דוח'))
                reportLinks.push({href: href, text: text.substring(0, 100)});
        });
        return {
            title: document.title,
            reportLinks: reportLinks,
            bodyPreview: body.innerHTML.substring(0, 2000)
        };
    }""")
    print(f"Group page title: {group_content['title']}")
    print(f"Report links found: {len(group_content['reportLinks'])}")
    for link in group_content['reportLinks']:
        print(f"  {link['text']} -> {link['href'][:100]}")

    # Now try navigating to the report again
    print(f"\nNavigating to report: {REPORT_URL}")
    page.goto(REPORT_URL, wait_until="domcontentloaded")
    page.wait_for_timeout(5000)

    # Scroll the page to trigger lazy loading
    total_height = page.evaluate("document.body.scrollHeight")
    pos = 0
    while pos < total_height:
        pos += 800
        page.evaluate(f"window.scrollTo(0, {pos})")
        page.wait_for_timeout(200)
    page.evaluate("window.scrollTo(0, 0)")
    page.wait_for_timeout(500)

    # Check for images
    img_info = page.evaluate("""() => {
        const imgs = document.querySelectorAll('img');
        let results = [];
        const seen = new Set();
        imgs.forEach(img => {
            let src = img.src || img.dataset.src || img.dataset.lazySrc ||
                      img.dataset.origFile || img.getAttribute('data-orig-file') || '';
            if (!src || src.includes('data:') || src.includes('svg+xml')) return;
            if (src.includes('logo') || src.includes('avatar') || src.includes('gravatar')) return;
            if (src.includes('emoji') || src.includes('icon') || src.includes('smilies')) return;

            const origFile = img.dataset.origFile || img.getAttribute('data-orig-file');
            if (origFile) src = origFile;
            else src = src.replace(/-\\d+x\\d+\\./, '.');

            if (seen.has(src)) return;
            seen.add(src);
            results.push(src);
        });
        return results;
    }""")

    print(f"\nTotal content images found: {len(img_info)}")

    # Check if still protected
    is_protected = page.evaluate("""() => {
        const alert = document.querySelector('.ld-alert-warning');
        if (alert) return alert.textContent.trim();
        return null;
    }""")

    if is_protected:
        print(f"Still protected: {is_protected}")
        # Try to use WordPress REST API to get content
        print("\nTrying WordPress REST API...")

        # Try REST API
        api_result = page.evaluate("""async () => {
            try {
                const resp = await fetch('/wp-json/wp/v2/sfwd-lessons?slug=דוח-חודשי-פברואר-2025', {
                    credentials: 'include'
                });
                if (resp.ok) {
                    const data = await resp.json();
                    return {type: 'lesson', data: JSON.stringify(data).substring(0, 2000)};
                }
            } catch(e) {}

            try {
                const resp = await fetch('/wp-json/wp/v2/posts?slug=דוח-חודשי-פברואר-2025', {
                    credentials: 'include'
                });
                if (resp.ok) {
                    const data = await resp.json();
                    return {type: 'post', data: JSON.stringify(data).substring(0, 2000)};
                }
            } catch(e) {}

            try {
                const resp = await fetch('/wp-json/wp/v2/pages?slug=דוח-חודשי-פברואר-2025', {
                    credentials: 'include'
                });
                if (resp.ok) {
                    const data = await resp.json();
                    return {type: 'page', data: JSON.stringify(data).substring(0, 2000)};
                }
            } catch(e) {}

            // Try different slug formats
            const slugs = [
                'דוח-חודשי-פברואר-2025',
                '%d7%93%d7%95%d7%97-%d7%97%d7%95%d7%93%d7%a9%d7%99-%d7%a4%d7%91%d7%a8%d7%95%d7%90%d7%a8-2025'
            ];

            for (const slug of slugs) {
                for (const type of ['sfwd-lessons', 'sfwd-topic', 'posts', 'pages']) {
                    try {
                        const resp = await fetch(`/wp-json/wp/v2/${type}?slug=${slug}`, {
                            credentials: 'include'
                        });
                        if (resp.ok) {
                            const data = await resp.json();
                            if (data.length > 0) {
                                return {type: type, data: JSON.stringify(data).substring(0, 5000)};
                            }
                        }
                    } catch(e) {}
                }
            }

            return {type: 'none', data: 'No API results'};
        }""")
        print(f"API result type: {api_result['type']}")
        print(f"API data: {api_result['data'][:1000]}")
    else:
        print("Page is accessible!")

    # For each image, show its source
    for i, src in enumerate(img_info):
        print(f"  [{i}] {unquote(src)[:150]}")

    page.screenshot(path=str(REPORTS_DIR / "feb2025_debug2.png"), full_page=True)
    browser.close()
