#!/usr/bin/env python3
"""Static integrity checks for the active Tama Andrea Studio frontend."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
PAGES = (
    "index.html", "layanan.html", "karya.html", "tentang.html",
    "bantuan.html", "pesan.html", "keluhan.html", "privasi.html", "admin.html",
)
STATIC_SUFFIXES = {
    ".html", ".css", ".js", ".svg", ".png", ".jpg", ".jpeg", ".webp",
    ".gif", ".ico", ".json", ".xml", ".txt", ".webmanifest", ".woff",
    ".woff2", ".ttf", ".pdf",
}
SPRITE = ROOT / "assets/icons/lucide-sprite.svg"
if not SPRITE.is_file():
    raise SystemExit("Missing local Lucide SVG sprite.")
SYMBOLS = set(re.findall(r'<symbol\s+id=["\']([^"\']+)', SPRITE.read_text(encoding="utf-8")))

class PageAudit(HTMLParser):
    def __init__(self, page):
        super().__init__(convert_charrefs=True)
        self.page = page
        self.issues = []
        self.ids = set()
        self.icon_refs = []
        self.local_refs = []
        self.html_lang = ""
        self.viewport_count = 0
        self.title_count = 0
        self.main_count = 0

    def issue(self, message):
        line, _ = self.getpos()
        self.issues.append(f"{self.page}:{line}: {message}")

    def handle_starttag(self, tag, attrs):
        names = [name.lower() for name, _ in attrs]
        values = {}
        for name, value in attrs:
            key = name.lower()
            if key in values:
                self.issue(f"duplicate '{key}' attribute on <{tag}>")
            values[key] = value or ""

        if tag == "html":
            self.html_lang = values.get("lang", "").strip()
        elif tag == "meta" and values.get("name", "").lower() == "viewport":
            self.viewport_count += 1
        elif tag == "title":
            self.title_count += 1
        elif tag == "main":
            self.main_count += 1
        elif tag == "img" and "alt" not in values:
            self.issue("<img> is missing its alt attribute")
        elif tag == "style":
            self.issue("inline <style> block is not allowed; use a stylesheet")

        if "style" in values:
            self.issue("inline style attribute is not allowed; use a CSS class")
        for name in names:
            if name.startswith("on"):
                self.issue(f"inline event handler '{name}' is not allowed")

        if "id" in values:
            element_id = values["id"]
            if element_id in self.ids:
                self.issue(f"duplicate id '{element_id}'")
            self.ids.add(element_id)

        if "data-icon" in values:
            self.icon_refs.append((values["data-icon"], self.getpos()[0]))

        if values.get("target", "").lower() == "_blank":
            rel = set(values.get("rel", "").lower().split())
            if not {"noopener", "noreferrer"}.issubset(rel):
                self.issue("target='_blank' must include rel='noopener noreferrer'")

        for name in ("href", "src"):
            value = values.get(name, "").strip()
            if not value:
                continue
            parsed = urlsplit(value)
            if parsed.path.startswith("/") and not parsed.scheme and not parsed.netloc:
                self.local_refs.append((unquote(parsed.path), self.getpos()[0]))

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)

    def validate(self):
        if not self.html_lang:
            self.issues.append(f"{self.page}: missing html lang attribute")
        elif self.html_lang.lower() not in ("id", "id-id"):
            self.issues.append(f"{self.page}: expected Indonesian lang, found '{self.html_lang}'")
        if self.viewport_count != 1:
            self.issues.append(f"{self.page}: expected one viewport meta tag, found {self.viewport_count}")
        if self.title_count != 1:
            self.issues.append(f"{self.page}: expected one title element, found {self.title_count}")
        if self.main_count != 1:
            self.issues.append(f"{self.page}: expected one main landmark, found {self.main_count}")

        for icon, line in self.icon_refs:
            if icon not in SYMBOLS:
                self.issues.append(f"{self.page}:{line}: data-icon '{icon}' is missing from the local SVG sprite")

        for path, line in self.local_refs:
            if path == "/":
                target = ROOT / "index.html"
            elif path.rstrip("/") == "/admin":
                target = ROOT / "admin.html"
            else:
                suffix = Path(path).suffix.lower()
                if suffix not in STATIC_SUFFIXES or path.startswith("/api/"):
                    continue
                target = ROOT / path.lstrip("/")
            if not target.is_file():
                self.issues.append(f"{self.page}:{line}: missing local file reference '{path}'")
        return self.issues

def main():
    failures = []
    site_js_path = ROOT / "js/site.js"
    if not site_js_path.is_file():
        failures.append("js/site.js: active frontend controller is missing")
    else:
        site_js = site_js_path.read_text(encoding="utf-8")
        if re.search(r"\$\(['\"]\[data-wa\]['\"]\)\.forEach", site_js):
            failures.append("js/site.js: WhatsApp collection uses the single-element selector helper")
        if not re.search(r"\$\$\(['\"]\[data-wa\]['\"]\)\.forEach", site_js):
            failures.append("js/site.js: WhatsApp controls must use the collection selector helper")
    for relative in PAGES:
        path = ROOT / relative
        if not path.is_file():
            failures.append(f"{relative}: active page is missing")
            continue
        source = path.read_text(encoding="utf-8")
        if not source.lstrip().lower().startswith("<!doctype html>"):
            failures.append(f"{relative}: missing HTML5 doctype")
        parser = PageAudit(relative)
        parser.feed(source)
        parser.close()
        failures.extend(parser.validate())

    if failures:
        print("Frontend integrity checks failed:")
        print("\n".join(f"- {item}" for item in failures))
        return 1

    print(
        f"Frontend integrity checks passed for {len(PAGES)} active pages; "
        f"{len(SYMBOLS)} local SVG symbols are available."
    )
    return 0

if __name__ == "__main__":
    sys.exit(main())
