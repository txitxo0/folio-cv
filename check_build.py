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
    '"en":': "English locale",
    '"es":': "Spanish locale",
    '"ui":': "UI translations",
    "function toggleTheme": "Theme toggle function",
    "function applyUi": "UI application function",
    'class="btn-theme"': "Theme button",
    'class="btn-print"': "Print button",
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
    print(f"  Locales: {list(data['cv'].keys())}")
    for loc in data["cv"].keys():
        if "ui" in data["cv"][loc]:
            print(f"  ✓ {loc} has UI translations")
except Exception as e:
    print(f"✗ JSON parsing failed: {e}")
    all_ok = False

if all_ok:
    print("\n✅ Build looks good!")
else:
    print("\n❌ Build has issues")
