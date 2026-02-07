"""
Cycles Trading Course - Login & Report Navigation Script
Logs into cyclestrading-course.com, navigates to reports, and opens the latest report.
"""

import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from playwright.sync_api import sync_playwright

load_dotenv(Path(__file__).parent / ".env")

URL = "https://cyclestrading-course.com/"
EMAIL = os.environ["EMAIL"]
PASSWORD = os.environ["PASSWORD"]


def run(headless=True):
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=headless)
        page = browser.new_page()

        # Navigate to site
        print(f"Navigating to {URL} ...")
        page.goto(URL, wait_until="domcontentloaded")

        # Click login button
        page.get_by_role("link", name="התחבר").click()
        print("Login modal opened")

        # Fill credentials and submit
        page.get_by_role("textbox", name="שם משתמש או כתובת אימייל").fill(EMAIL)
        page.get_by_role("textbox", name="סיסמה").fill(PASSWORD)
        page.get_by_role("button", name="התחבר").click()

        # Wait for login to complete
        page.get_by_text("שלום").first.wait_for(state="visible", timeout=15000)
        print("Login successful!")

        # The reports carousel has links with URLs containing Hebrew-encoded report slugs
        # Find the first report link in the "Post Carousel" section
        carousel = page.locator('[role="region"], .swiper, [class*="carousel"]').first
        if carousel.count() == 0:
            # Fallback: find links that look like report URLs (contain Hebrew slug patterns)
            report_link = page.locator('a[href*="2026"]').first
        else:
            report_link = carousel.locator("a").first

        report_url = report_link.get_attribute("href")
        print(f"Latest report URL: {report_url}")

        # Click to open the latest report
        report_link.click()
        page.wait_for_load_state("domcontentloaded")
        print(f"Opened report: {page.title()}")

        # Take a screenshot
        screenshot_path = Path(__file__).parent / "latest_report.png"
        page.screenshot(path=str(screenshot_path), full_page=True)
        print(f"Screenshot saved: {screenshot_path}")

        browser.close()


if __name__ == "__main__":
    headless = "--headed" not in sys.argv
    run(headless=headless)
