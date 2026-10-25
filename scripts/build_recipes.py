#!/usr/bin/env python3
"""Build docs/data/recipes.json from recipes/*.md.

Each recipe is one Markdown file with YAML frontmatter:
  title_ja, title_en, category, temp_c, minutes, season, region,
  source_url, source_author
The body (materials / steps / tips / background) is converted to HTML.
"""
import json
import re
import sys
from pathlib import Path

import markdown
import yaml

ROOT = Path(__file__).resolve().parent.parent
RECIPES_DIR = ROOT / "recipes"
OUT = ROOT / "docs" / "data" / "recipes.json"

CATEGORIES = {
    "koji": {"ja": "麹・発酵", "en": "Koji & Fermentation"},
    "low-temp": {"ja": "低温調理", "en": "Low-Temperature Cooking"},
    "coffee": {"ja": "コーヒー", "en": "Coffee"},
    "nuts": {"ja": "ナッツ・ロースト", "en": "Nuts & Roasting"},
    "airfryer": {"ja": "エアフライヤー", "en": "Air Fryer"},
    "daily": {"ja": "日々の暮らし", "en": "Daily Life"},
}


def parse_recipe(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    m = re.match(r"^---\n(.*?)\n---\n?(.*)$", text, re.S)
    if not m:
        raise ValueError(f"{path.name}: frontmatter not found")
    meta = yaml.safe_load(m.group(1)) or {}
    body_md = m.group(2).strip()

    stem = path.stem  # YYYY-MM-DD-<slug>
    dm = re.match(r"^(\d{4}-\d{2}-\d{2})-(.+)$", stem)
    date, slug = (dm.group(1), dm.group(2)) if dm else ("", stem)

    recipe = {
        "id": slug,
        "slug": slug,
        "date": date,
        "title_ja": meta.get("title_ja", slug),
        "title_en": meta.get("title_en", meta.get("title_ja", slug)),
        "category": meta.get("category", "daily"),
        "temp_c": meta.get("temp_c"),
        "minutes": meta.get("minutes"),
        "season": meta.get("season"),
        "region": meta.get("region"),
        "source_url": meta.get("source_url"),
        "source_author": meta.get("source_author"),
        "body_html": markdown.markdown(body_md, extensions=["extra"]),
    }
    return recipe


def main() -> int:
    files = sorted(RECIPES_DIR.glob("*.md"))
    files = [f for f in files if f.name.lower() != "readme.md"]
    recipes = [parse_recipe(f) for f in files]
    recipes.sort(key=lambda r: (r["date"], r["slug"]), reverse=True)

    data = {
        "site": "IKIGAI",
        "subtitle_en": "Japanese recipes for a deliberate life",
        "subtitle_ja": "日本の丁寧な暮らしのレシピ集",
        "categories": CATEGORIES,
        "count": len(recipes),
        "recipes": recipes,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)} with {len(recipes)} recipe(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
