#!/usr/bin/env python3
"""
build.py - Compile index.html with inlined CSS, JS, and JSON data
Creates a standalone HTML file that works anywhere (GitHub Pages, email, etc)

Usage:
    python build.py

Output:
    dist/index.html (ready for deployment)
"""

import base64
import json
from pathlib import Path


def validate_data_schema(schema_path: Path, data_obj: dict):
    """Validate cv-data against cv-schema and fail fast on violations."""
    try:
        from jsonschema import Draft202012Validator
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            "Missing dependency 'jsonschema'. Install it with: pip install jsonschema"
        ) from exc

    schema = json.loads(schema_path.read_text(encoding="utf-8-sig"))
    validator = Draft202012Validator(schema)
    errors = sorted(validator.iter_errors(data_obj), key=lambda e: list(e.path))

    if errors:
        lines = [f"Schema validation failed: {len(errors)} error(s)"]
        for err in errors[:10]:
            path = ".".join(str(p) for p in err.absolute_path) or "<root>"
            lines.append(f"- {path}: {err.message}")
        if len(errors) > 10:
            lines.append(f"- ... and {len(errors) - 10} more")
        raise RuntimeError("\n".join(lines))


def main():
    root_dir = Path(__file__).parent
    dist_dir = root_dir / "dist"
    src_html = root_dir / "index.html"
    src_css = root_dir / "assets" / "css" / "cv.css"
    src_js = root_dir / "assets" / "js" / "cv.js"
    src_data = root_dir / "assets" / "data" / "cv-data.json"
    src_schema = root_dir / "assets" / "data" / "cv-schema.json"
    src_favicon = root_dir / "assets" / "images" / "favicon.svg"

    # Ensure dist folder exists
    dist_dir.mkdir(exist_ok=True)

    try:
        # Read all files (remove BOM if present)
        print("📖 Reading source files...")
        html = src_html.read_text(encoding="utf-8-sig")
        css = src_css.read_text(encoding="utf-8-sig")
        js = src_js.read_text(encoding="utf-8-sig")
        data = src_data.read_text(encoding="utf-8-sig")

        # Inject CSS (remove link tag, add style tag)
        css_link = '<link rel="stylesheet" href="assets/css/cv.css">'
        style_tag = f"<style>\n{css}\n</style>"
        compiled = html.replace(css_link, style_tag)

        # Inline favicon so dist/index.html remains self-contained.
        favicon_link = (
            '<link rel="icon" type="image/svg+xml" href="assets/images/favicon.svg">'
        )
        if src_favicon.exists():
            favicon_svg = src_favicon.read_text(encoding="utf-8-sig")
            favicon_b64 = base64.b64encode(favicon_svg.encode("utf-8")).decode("ascii")
            favicon_tag = (
                '<link rel="icon" type="image/svg+xml" '
                f'href="data:image/svg+xml;base64,{favicon_b64}">'
            )
            compiled = compiled.replace(favicon_link, favicon_tag)

        # Validate JSON before inlining
        try:
            data_obj = json.loads(data)
        except json.JSONDecodeError as e:
            print(f"❌ JSON syntax error in {src_data}: {e}")
            exit(1)

        # Validate JSON against schema before inlining.
        if not src_schema.exists():
            print(f"❌ Schema file not found: {src_schema}")
            exit(1)
        try:
            validate_data_schema(src_schema, data_obj)
            print("✅ JSON schema validation passed")
        except Exception as e:
            print(f"❌ {e}")
            exit(1)

        # Inline local profile photo(s) so dist/index.html remains self-contained.
        # Supports both legacy schema and multilingual schema (`cv.{locale}`).
        payloads = []
        locale_map = data_obj.get("cv") if isinstance(data_obj, dict) else None
        if isinstance(locale_map, dict) and locale_map:
            payloads = [p for p in locale_map.values() if isinstance(p, dict)]
        elif isinstance(data_obj, dict):
            payloads = [data_obj]

        photo_cache = {}
        photo_updated = False
        for payload in payloads:
            personal = payload.get("personal", {})
            photo_path = personal.get("photo")
            if not photo_path or str(photo_path).startswith(
                ("http://", "https://", "data:")
            ):
                continue

            if photo_path in photo_cache:
                personal["photo"] = photo_cache[photo_path]
                photo_updated = True
                continue

            resolved_photo = root_dir / photo_path
            if not resolved_photo.exists():
                continue

            suffix = resolved_photo.suffix.lower()
            mime = {
                ".jpg": "image/jpeg",
                ".jpeg": "image/jpeg",
                ".png": "image/png",
                ".gif": "image/gif",
                ".webp": "image/webp",
            }.get(suffix)
            if not mime:
                continue

            encoded = base64.b64encode(resolved_photo.read_bytes()).decode("ascii")
            data_uri = f"data:{mime};base64,{encoded}"
            personal["photo"] = data_uri
            photo_cache[photo_path] = data_uri
            photo_updated = True

        if photo_updated:
            data = json.dumps(data_obj, ensure_ascii=False, indent=2)

        # Create JS with data globally available, then run app
        # Data is now inlined, so fetch will fail and catch will use window.__cvData
        js_with_data = f"window.__cvData = {data};\n{js}"

        # Inject JS (remove script src tag, add inline script)
        js_src = '<script src="assets/js/cv.js"></script>'
        script_tag = f"<script>\n{js_with_data}\n</script>"
        compiled = compiled.replace(js_src, script_tag)

        # Write output
        output_path = dist_dir / "index.html"
        output_path.write_text(compiled, encoding="utf-8")

        size_kb = len(compiled.encode("utf-8")) / 1024
        print(f"✅ Build complete: {output_path}")
        print(f"📦 Size: {size_kb:.2f} KB")
        print("🚀 Ready to deploy to GitHub Pages")

    except Exception as err:
        print(f"❌ Build failed: {err}")
        exit(1)


if __name__ == "__main__":
    main()
