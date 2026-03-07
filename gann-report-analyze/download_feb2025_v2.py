"""Download February 2025 report - try REST API with authentication and raw content."""
import os
import json
import base64
import re
from pathlib import Path
from urllib.parse import unquote
from collections import Counter

from dotenv import load_dotenv
from playwright.sync_api import sync_playwright

load_dotenv(Path(__file__).parent / ".env")
EMAIL = os.environ["EMAIL"]
PASSWORD = os.environ["PASSWORD"]

REPORTS_DIR = Path(__file__).parent / "reports"
REPORT_DIR = REPORTS_DIR / "דוח-חודשי-פברואר-2025"


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

    # Post ID is 40593 from the API response
    # Try accessing raw content through various methods
    print("Trying different API approaches to get full post content...")

    # Method 1: Try ?_embed to get full content
    result = page.evaluate("""async () => {
        // Try REST API with password/context
        const endpoints = [
            '/wp-json/wp/v2/posts/40593?context=edit',
            '/wp-json/wp/v2/posts/40593?_embed',
            '/wp-json/wp/v2/posts/40593',
        ];

        for (const endpoint of endpoints) {
            try {
                const resp = await fetch(endpoint, {credentials: 'include'});
                if (resp.ok) {
                    const data = await resp.json();
                    const content = data.content?.rendered || data.content?.raw || '';
                    // Extract image URLs from content
                    const imgRegex = /<img[^>]+src=["']([^"']+)["']/g;
                    const origRegex = /data-orig-file=["']([^"']+)["']/g;
                    let matches = [];
                    let m;
                    while ((m = imgRegex.exec(content)) !== null) {
                        matches.push(m[1]);
                    }
                    while ((m = origRegex.exec(content)) !== null) {
                        matches.push(m[1]);
                    }

                    if (matches.length > 5) {
                        return {
                            endpoint: endpoint,
                            imageCount: matches.length,
                            images: matches,
                            contentLength: content.length,
                            contentPreview: content.substring(0, 500)
                        };
                    }
                }
            } catch(e) {
                // continue to next endpoint
            }
        }

        // Method 2: Try WP nonce-based authenticated request
        try {
            const nonceResp = await fetch('/wp-admin/admin-ajax.php?action=rest-nonce', {credentials: 'include'});
            if (nonceResp.ok) {
                const nonce = await nonceResp.text();
                const resp = await fetch('/wp-json/wp/v2/posts/40593', {
                    credentials: 'include',
                    headers: {'X-WP-Nonce': nonce}
                });
                if (resp.ok) {
                    const data = await resp.json();
                    const content = data.content?.rendered || data.content?.raw || '';
                    const imgRegex = /<img[^>]+src=["']([^"']+)["']/g;
                    let matches = [];
                    let m;
                    while ((m = imgRegex.exec(content)) !== null) {
                        matches.push(m[1]);
                    }
                    if (matches.length > 5) {
                        return {
                            endpoint: 'nonce-authenticated',
                            imageCount: matches.length,
                            images: matches,
                            contentLength: content.length,
                            contentPreview: content.substring(0, 500)
                        };
                    }
                    return {
                        endpoint: 'nonce-authenticated',
                        imageCount: matches.length,
                        contentLength: content.length,
                        contentPreview: content.substring(0, 1000),
                        raw: data.content?.raw?.substring(0, 1000) || 'no raw'
                    };
                }
            }
        } catch(e) {}

        return {endpoint: 'none', imageCount: 0, error: 'All methods failed'};
    }""")

    print(f"API result: endpoint={result.get('endpoint')}, images={result.get('imageCount')}")
    if result.get('contentPreview'):
        print(f"Content preview: {result['contentPreview'][:500]}")
    if result.get('raw'):
        print(f"Raw content: {result['raw'][:500]}")

    images = result.get('images', [])
    if images:
        print(f"\nFound {len(images)} image URLs!")
        # Clean up URLs - get full resolution
        cleaned = []
        seen = set()
        for src in images:
            # Skip non-content images
            if any(x in src.lower() for x in ['svg', 'logo', 'avatar', 'gravatar', 'emoji', 'icon', 'smilies']):
                continue
            # Get full resolution
            clean = re.sub(r'-\d+x\d+\.', '.', src)
            if clean not in seen:
                seen.add(clean)
                cleaned.append(clean)

        print(f"After cleanup: {len(cleaned)} unique content images")
        for i, src in enumerate(cleaned):
            print(f"  [{i}] {unquote(src)[:150]}")

        if len(cleaned) > 5:
            # Download them!
            print(f"\nDownloading {len(cleaned)} images...")

            # Map images to assets using the same logic as download_report.py
            total = len(cleaned)

            # Detect asset boundaries from filenames
            asset_boundaries = []
            for i, src in enumerate(cleaned):
                fname = unquote(src.split("/")[-1]).lower()
                for keyword, asset in [("s&p", "sp500"), ("ביטקוין", "bitcoin"), ("bitcoin", "bitcoin"),
                                        ("eur", "eurusd"), ("יורו", "eurusd"),
                                        ("זהב", "gold"), ("gold", "gold"),
                                        ("נפט", "oil"), ("oil", "oil")]:
                    if keyword in fname:
                        asset_boundaries.append((i, asset))
                        break

            print(f"Asset boundaries detected from filenames: {asset_boundaries}")

            # Simple assignment: first image is cover, then split into 5 assets roughly equally
            # Skip first 2 (cover + rules typically)
            per_asset = (total - 2) // 5
            assignments = {}
            assignments[0] = "cover"
            if total > 1:
                assignments[1] = "sp500"  # rules image goes with sp500

            asset_order = ["sp500", "bitcoin", "eurusd", "gold", "oil"]

            # If we detected boundaries, use them
            if len(asset_boundaries) >= 3:
                # Use detected boundaries
                current_asset = "sp500"
                boundary_idx = 0
                for i in range(2, total):
                    # Check if this image starts a new asset section
                    for bi, (bidx, basset) in enumerate(asset_boundaries):
                        if bidx == i:
                            current_asset = basset
                            break
                    assignments[i] = current_asset
            else:
                # Equal distribution
                sp500_end = 2 + max(per_asset + 5, int((total - 2) * 0.35))
                if sp500_end > total:
                    sp500_end = total
                for i in range(2, sp500_end):
                    assignments[i] = "sp500"
                remaining = total - sp500_end
                per_other = remaining // 4
                pos = sp500_end
                for asset in ["bitcoin", "eurusd", "gold", "oil"]:
                    end = pos + per_other
                    if asset == "oil":
                        end = total  # oil gets the rest
                    for i in range(pos, min(end, total)):
                        assignments[i] = asset
                    pos = end

            # Summary
            counts = Counter(assignments.values())
            print(f"\nImage distribution:")
            for asset in ["cover", "sp500", "bitcoin", "eurusd", "gold", "oil"]:
                if asset in counts:
                    print(f"  {asset}: {counts[asset]} images")

            # Download each image
            for idx, src in enumerate(cleaned):
                asset = assignments.get(idx, "other")
                folder = REPORT_DIR / asset
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

            # Save metadata
            meta = {
                "title": "דוח חודשי פברואר 2025",
                "url": "https://cyclestrading-course.com/דוח-חודשי-פברואר-2025/",
                "images": len(cleaned),
                "sections": dict(counts)
            }
            (REPORT_DIR / "metadata.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False))
            print(f"\nDone! Report saved to: {REPORT_DIR}")
        else:
            print("\nNot enough images found - content may truly be inaccessible")
    else:
        print("\nNo images found in API response")

    browser.close()
