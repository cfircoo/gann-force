"""Debug script for February 2025 report download."""
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
REPORTS_DIR = Path(__file__).parent / "reports"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    # Login
    page.goto("https://cyclestrading-course.com/", wait_until="domcontentloaded")
    page.get_by_role("link", name="התחבר").click()
    page.get_by_role("textbox", name="שם משתמש או כתובת אימייל").fill(EMAIL)
    page.get_by_role("textbox", name="סיסמה").fill(PASSWORD)
    page.get_by_role("button", name="התחבר").click()
    page.get_by_text("שלום").first.wait_for(state="visible", timeout=15000)
    print("Login successful!")
    page.wait_for_timeout(2000)

    # Navigate to Feb 2025 report
    page.goto(REPORT_URL, wait_until="domcontentloaded")
    page.wait_for_timeout(5000)

    # Get the full page content for debugging
    html_snippet = page.evaluate("""() => {
        const content = document.querySelector('.entry-content') ||
                        document.querySelector('article') ||
                        document.querySelector('main') ||
                        document.body;
        return content ? content.innerHTML.substring(0, 5000) : 'NO CONTENT FOUND';
    }""")
    print("Page content preview:")
    print(html_snippet[:3000])

    # Check for any images regardless of protection
    img_info = page.evaluate("""() => {
        const imgs = document.querySelectorAll('img');
        let results = [];
        imgs.forEach(img => {
            const src = img.src || img.dataset.src || img.dataset.lazySrc || '';
            if (src && !src.includes('svg') && !src.includes('logo') && !src.includes('avatar')
                && !src.includes('gravatar') && !src.includes('emoji') && !src.includes('icon'))
                results.push(src);
        });
        return results;
    }""")
    print(f"\nImages found: {len(img_info)}")
    for i, src in enumerate(img_info[:10]):
        print(f"  [{i}] {src[:150]}")

    # Check all links on the page
    links = page.evaluate("""() => {
        const links = document.querySelectorAll('a');
        let results = [];
        links.forEach(a => {
            const href = a.href || '';
            const text = a.textContent.trim();
            if (href && text && text.length < 100)
                results.push({href: href, text: text});
        });
        return results;
    }""")
    print(f"\nLinks found: {len(links)}")
    for link in links[:20]:
        print(f"  {link['text'][:50]} -> {link['href'][:100]}")

    # Take a screenshot for debugging
    page.screenshot(path=str(REPORTS_DIR / "feb2025_debug.png"), full_page=True)
    print(f"\nScreenshot saved to {REPORTS_DIR / 'feb2025_debug.png'}")

    browser.close()
