#!/usr/bin/env python3
"""Quick check of dist/index.html"""

import json
from pathlib import Path

html = Path("dist/index.html").read_text(encoding="utf-8-sig")

print("✓ HTML file loaded")
print(f"  Size: {len(html):,} characters")

# Check for critical elements
checks = {
    "window.__cvData": "Data injection",
    '"cv":': "CV structure",
    '"ui":': "UI translations",
    "function toggleTheme": "Theme toggle function",
    "function applyUi": "UI application function",
    'id="btn-theme"': "Theme button",
    'id="btn-print"': "Print button",
}

all_ok = True
for check, desc in checks.items():
    if check in html:
        print(f"✓ {desc}")
    else:
        print(f"✗ {desc} MISSING")
        all_ok = False

# Try to extract and validate JSON
try:
    start = html.find("window.__cvData = ") + len("window.__cvData = ")
    end = html.find(";\n", start)
    json_str = html[start:end]
    data = json.loads(json_str)
    print("✓ JSON is valid")
    locale_map = data.get("cv") if isinstance(data, dict) else None
    if not isinstance(locale_map, dict) or not locale_map:
        print("✗ No locales found under 'cv'")
        all_ok = False
    else:
        locales = list(locale_map.keys())
        print(f"  Locales: {locales}")
        for loc, payload in locale_map.items():
            if isinstance(payload, dict) and "ui" in payload:
                print(f"  ✓ {loc} has UI translations")
            else:
                print(f"  ✗ {loc} is missing UI translations")
                all_ok = False
except Exception as e:
    print(f"✗ JSON parsing failed: {e}")
    all_ok = False

if all_ok:
    print("\n✅ Build looks good!")
else:
    print("\n❌ Build has issues")