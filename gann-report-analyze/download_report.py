"""
Cycles Trading Course - Report Image Downloader
Logs in, opens the latest report, downloads all images organized by asset folder.
"""

import base64
import os
import re
import sys
import json
from pathlib import Path
from urllib.parse import unquote

from dotenv import load_dotenv
from playwright.sync_api import sync_playwright

load_dotenv(Path(__file__).parent / ".env")

URL = "https://cyclestrading-course.com/"
EMAIL = os.environ["EMAIL"]
PASSWORD = os.environ["PASSWORD"]

REPORTS_DIR = Path(__file__).parent / "reports"

# Hebrew month names to English for folder structure
HEBREW_MONTHS = {
    "ינואר": "01", "פברואר": "02", "מרץ": "03",
    "אפריל": "04", "מאי": "05", "יוני": "06",
    "יולי": "07", "אוגוסט": "08", "ספטמבר": "09",
    "אוקטובר": "10", "נובמבר": "11", "דצמבר": "12",
}

# Asset detection keywords found in title images
ASSET_KEYWORDS = {
    "S&P": "sp500",
    "S&P500": "sp500",
    "ביטקוין": "bitcoin",
    "Bitcoin": "bitcoin",
    "EUR/USD": "eurusd",
    "יורו": "eurusd",
    "זהב": "gold",
    "Gold": "gold",
    "נפט": "oil",
    "Oil": "oil",
}


def detect_asset_sections(page):
    """Scan the page to find asset title images and map image indices to assets."""
    items = page.evaluate("""() => {
        const contentDiv = document.querySelector('.entry-content.single-content');
        if (!contentDiv) return [];

        const items = [];
        let imgIdx = 0;

        for (const el of contentDiv.children) {
            if (el.tagName === 'FIGURE') {
                const img = el.querySelector('img');
                if (img) {
                    const src = img.src || img.dataset.src || img.dataset.lazySrc || '';
                    if (src && !src.includes('svg')) {
                        const fullSrc = src.replace(/-\\d+x\\d+\\./, '.');
                        items.push({ type: 'img', idx: imgIdx, src: fullSrc });
                        imgIdx++;
                    }
                }
            } else if (el.tagName === 'H2') {
                items.push({ type: 'h2', text: el.textContent.trim(), afterImg: imgIdx - 1 });
            }
        }
        return items;
    }""")

    # Fallback: if no items found with FIGURE children, try broader search
    if not items:
        items = page.evaluate("""() => {
            // Try multiple content selectors
            const selectors = [
                '.entry-content.single-content',
                '.entry-content',
                '.elementor-widget-theme-post-content .elementor-widget-container',
                'article .entry-content',
                'article',
                'main'
            ];
            let contentDiv = null;
            for (const sel of selectors) {
                contentDiv = document.querySelector(sel);
                if (contentDiv) break;
            }
            if (!contentDiv) contentDiv = document.body;

            const items = [];
            let imgIdx = 0;
            const seen = new Set();

            // Find all images anywhere in the content
            const allImgs = contentDiv.querySelectorAll('img');
            for (const img of allImgs) {
                let src = img.src || img.dataset.src || img.dataset.lazySrc ||
                          img.dataset.origFile || img.getAttribute('data-orig-file') || '';
                if (!src || src.includes('data:') || src.includes('svg+xml')) continue;
                if (src.includes('logo') || src.includes('avatar') || src.includes('gravatar')) continue;
                if (src.includes('emoji') || src.includes('icon') || src.includes('smilies')) continue;

                // Get full resolution
                const origFile = img.dataset.origFile || img.getAttribute('data-orig-file');
                if (origFile) src = origFile;
                else src = src.replace(/-\\d+x\\d+\\./, '.');

                if (seen.has(src)) continue;
                seen.add(src);

                items.push({ type: 'img', idx: imgIdx, src: src });
                imgIdx++;
            }

            // Also find headings
            const allH2 = contentDiv.querySelectorAll('h2');
            for (const h of allH2) {
                items.push({ type: 'h2', text: h.textContent.trim(), afterImg: imgIdx - 1 });
            }

            return items;
        }""")

    return items


def map_images_to_assets(items):
    """
    Given ordered items, assign each image to an asset folder.
    Uses visual structure: asset title slides appear as wide blue-header images
    at regular intervals. We detect these by checking if the image filename
    contains the report name pattern (Hebrew section dividers).
    """
    images = [i for i in items if i["type"] == "img"]
    total = len(images)

    # Known structure: each asset section starts with a title image,
    # followed by key-dates chart, stats, analysis, seasonal, chart, disclaimer
    # Sections are roughly 6-10 images each, with cover/rules at the start.

    # Find the "review" section (כיצד עבד הדוח בחודש הקודם)
    review_start = total
    for item in items:
        if item["type"] == "h2" and "כיצד עבד" in item.get("text", ""):
            review_start = item["afterImg"]
            break

    # Assets have ~10 images each for S&P (largest), ~6 for others
    # The report always follows: cover, rules, S&P, Bitcoin, EUR/USD, Gold, Oil, review
    # We detect boundaries by looking at named images (Hebrew filenames = section dividers)
    named_imgs = []
    for img in images:
        fname = unquote(img["src"].split("/")[-1])
        # Section dividers have Hebrew report name pattern
        if "דוח" in fname or "חודש" in fname:
            named_imgs.append(img["idx"])

    # Assign sections based on the structure we know
    assignments = {}

    # Cover: first image (summary table)
    # Then 5 asset sections (S&P includes intro/rules slides), then review

    # Detect where S&P analysis content starts (skip older static images)
    sp_content_start = 2  # default
    for img in images[2:]:
        if "/2025/" in img["src"]:
            sp_content_start = img["idx"] + 1
        else:
            break

    # S&P section starts right after cover (includes intro + rules slides)
    sp500_start = 1

    # Calculate approximate boundaries for 5 assets between sp_content_start and review_start
    # Use sp_content_start for divider filtering (skip S&P intro/rules images)
    dividers = [i for i in named_imgs if sp_content_start <= i < review_start]

    # Report structure is always: S&P (largest), Bitcoin, EUR/USD, Gold, Oil
    # Each non-S&P asset section is ~6 images (title, dates, stats, seasonal, chart, disclaimer).
    # S&P is the largest section, taking the rest.
    # Named divider images (Hebrew filenames) mark some boundaries but not all.

    # Strategy: work backwards from review_start.
    # The last 4 assets each have ~6 images. S&P gets whatever remains.
    content_count = review_start - sp_content_start
    # Estimate ~6 images per non-S&P asset (can vary 5-7)
    non_sp_each = 6
    # If dividers exist, use them to anchor boundaries
    if dividers:
        # First divider marks a section boundary (often EUR/USD or Bitcoin)
        # Work outward from dividers
        # Each asset section is ~6 images, so Bitcoin starts ~6 before first divider
        first_div = dividers[0]
        bitcoin_start = first_div - non_sp_each
        if bitcoin_start < sp_content_start + 10:
            # S&P must have at least 10 images, push bitcoin later
            bitcoin_start = max(sp_content_start + 10, first_div - non_sp_each)

        sp500_end = bitcoin_start
        remaining_start = bitcoin_start
    else:
        # No dividers: estimate S&P as ~40% of content
        sp500_end = sp_content_start + int(content_count * 0.4)
        remaining_start = sp500_end

    # Split remaining content (bitcoin through oil) into 4 equal sections
    remaining_count = review_start - remaining_start
    per_section = remaining_count // 4
    extra = remaining_count % 4

    sections = [("sp500", sp500_start, sp500_end)]
    pos = remaining_start
    for i, name in enumerate(["bitcoin", "eurusd", "gold", "oil"]):
        size = per_section + (1 if i < extra else 0)
        sections.append((name, pos, pos + size))
        pos += size

    # Build final mapping
    for img in images:
        idx = img["idx"]
        if idx == 0:
            assignments[idx] = "cover"
        elif idx >= review_start:
            assignments[idx] = "review"
        else:
            for name, start, end in sections:
                if start <= idx < end:
                    assignments[idx] = name
                    break
            else:
                assignments[idx] = "other"

    return assignments, images


def download_images(page, images, assignments, report_dir):
    """Download all images via browser fetch (bypasses hotlink protection)."""
    for img in images:
        idx = img["idx"]
        src = img["src"]
        asset = assignments.get(idx, "other")

        folder = report_dir / asset
        folder.mkdir(parents=True, exist_ok=True)

        ext = Path(unquote(src.split("?")[0])).suffix.replace(".webp", ".png")
        if not ext:
            ext = ".png"
        filename = f"{idx:02d}{ext}"

        filepath = folder / filename
        if filepath.exists():
            print(f"  Skip {asset}/{filename} (exists)")
            continue

        try:
            # Fetch image through the browser's authenticated session
            b64 = page.evaluate("""async (url) => {
                const resp = await fetch(url, { credentials: 'include' });
                if (!resp.ok) return null;
                const blob = await resp.blob();
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result.split(',')[1]);
                    reader.readAsDataURL(blob);
                });
            }""", src)

            if b64:
                data = base64.b64decode(b64)
                filepath.write_bytes(data)
                print(f"  {asset}/{filename} ({len(data) // 1024}KB)")
            else:
                print(f"  FAILED {asset}/{filename}: fetch returned null")
        except Exception as e:
            print(f"  FAILED {asset}/{filename}: {e}")

    return report_dir


def login(page):
    """Log in to the site and return the authenticated page."""
    print(f"Navigating to {URL} ...")
    page.goto(URL, wait_until="domcontentloaded")
    page.get_by_role("link", name="התחבר").click()
    page.get_by_role("textbox", name="שם משתמש או כתובת אימייל").fill(EMAIL)
    page.get_by_role("textbox", name="סיסמה").fill(PASSWORD)
    page.get_by_role("button", name="התחבר").click()
    page.get_by_text("שלום").first.wait_for(state="visible", timeout=15000)
    print("Login successful!")


def list_reports(page, year=None):
    """List all report URLs on the main page. Optionally filter by year."""
    reports = page.evaluate("""(year) => {
        const links = document.querySelectorAll('a[href*="דוח"]');
        const results = [];
        for (const a of links) {
            const href = a.href;
            const text = a.textContent.trim();
            if (year && !href.includes(year)) continue;
            if (text && href) results.push({url: href, title: text});
        }
        return results;
    }""", year or "")

    if not reports:
        # Fallback: try broader matching
        reports = page.evaluate("""(year) => {
            const links = [...document.querySelectorAll('a')];
            const results = [];
            for (const a of links) {
                const href = a.href || '';
                const text = a.textContent.trim();
                if (!href.includes('cyclestrading-course.com')) continue;
                if (year && !href.includes(year) && !text.includes(year)) continue;
                if (text.includes('דוח') || text.includes('חודש')) {
                    results.push({url: href, title: text});
                }
            }
            return results;
        }""", year or "")

    return reports


def title_to_path(title):
    """Convert Hebrew report title to year/MM folder path."""
    # Extract year
    year_match = re.search(r'(20\d{2})', title)
    year = year_match.group(1) if year_match else "unknown"

    # Extract month from Hebrew
    month_num = None
    for heb, num in HEBREW_MONTHS.items():
        if heb in title:
            month_num = num
            break

    if not month_num:
        # Fallback: use slug
        slug = title.replace(" ", "-")
        return Path(year) / slug

    # Handle special reports
    if "מיוחד" in title or "תחזית" in title:
        if "תחזית" in title and "שנתית" in title:
            return Path(year) / "annual-forecast"
        return Path(year) / f"{month_num}-special"

    return Path(year) / month_num


def download_report(page, report_url):
    """Download a single report given its URL. Returns report_dir path."""
    page.goto(report_url, wait_until="domcontentloaded")
    page.wait_for_timeout(3000)

    title = page.title().replace(" – סייקלס טריידינג", "").strip()
    print(f"Report: {title}")

    report_dir = REPORTS_DIR / title_to_path(title)
    report_dir.mkdir(parents=True, exist_ok=True)

    # Check for group/password protection (LearnDash)
    pw_check = page.evaluate("""() => {
        const f = document.querySelector('form.post-password-form, input[name="post_password"]');
        if (f) return 'PASSWORD_FORM';
        const p = document.querySelector('.post-password-required');
        if (p) return 'PASSWORD_REQUIRED';
        const ld = document.querySelector('.ld-alert-warning');
        if (ld && ld.textContent.includes('מוגן')) return 'LEARNDASH_GROUP_PROTECTED';
        return null;
    }""")
    if pw_check:
        print(f"*** Page protection detected: {pw_check} ***")
        print("This report requires group membership access that the current account does not have.")

    # Scroll full page to trigger lazy loading
    print("Loading all images...")
    total_height = page.evaluate("document.body.scrollHeight")
    pos = 0
    while pos < total_height:
        pos += 800
        page.evaluate(f"window.scrollTo(0, {pos})")
        page.wait_for_timeout(200)
    page.evaluate("window.scrollTo(0, 0)")
    page.wait_for_timeout(500)

    # Map images to assets
    print("Analyzing report structure...")
    items = detect_asset_sections(page)
    assignments, images = map_images_to_assets(items)

    # Summary
    from collections import Counter
    counts = Counter(assignments.values())
    print(f"\nFound {len(images)} images:")
    for asset in ["cover", "sp500", "bitcoin", "eurusd", "gold", "oil", "review", "other"]:
        if asset in counts:
            print(f"  {asset}: {counts[asset]} images")

    # Download via browser fetch
    print(f"\nDownloading to {report_dir}/")
    download_images(page, images, assignments, report_dir)

    # Save metadata
    meta = {"title": title, "url": report_url, "images": len(images), "sections": dict(counts)}
    (report_dir / "metadata.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False))

    print(f"\nDone! Report saved to: {report_dir}")
    return report_dir


def run(headless=True, url=None, list_year=None, year=None, nth=0):
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=headless)
        page = browser.new_page()

        login(page)
        page.wait_for_timeout(2000)  # Wait for page content to load after login

        if list_year:
            links = page.locator(f'a[href*="{list_year}"]')
            count = links.count()
            reports = []
            for i in range(count):
                link = links.nth(i)
                reports.append({
                    "index": i,
                    "title": link.text_content().strip(),
                    "url": link.get_attribute("href")
                })
            print(json.dumps(reports, indent=2, ensure_ascii=False))
            browser.close()
            return

        if url:
            download_report(page, url)
        else:
            # Find report links for the given year (default: 2026)
            target_year = year or "2026"
            links = page.locator(f'a[href*="{target_year}"]')
            count = links.count()
            if count == 0:
                print(f"No reports found for year {target_year}")
                browser.close()
                return
            if nth >= count:
                print(f"Only {count} reports found for {target_year}, requested index {nth}")
                browser.close()
                return
            report_link = links.nth(nth)
            report_url = report_link.get_attribute("href")
            report_title = report_link.text_content().strip()
            print(f"Selected report [{nth}/{count}]: {report_title}")
            download_report(page, report_url)

        browser.close()


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Download Cycles Trading reports")
    parser.add_argument("--headed", action="store_true", help="Run browser in headed mode")
    parser.add_argument("--url", help="Download a specific report by URL")
    parser.add_argument("--list", dest="list_year", help="List report URLs for a year (e.g. 2025)")
    parser.add_argument("--year", help="Year to download reports from (e.g. 2025)")
    parser.add_argument("--nth", type=int, default=0, help="Which report to pick (0=first/newest)")
    args = parser.parse_args()

    run(headless=not args.headed, url=args.url, list_year=args.list_year,
        year=args.year, nth=args.nth)
