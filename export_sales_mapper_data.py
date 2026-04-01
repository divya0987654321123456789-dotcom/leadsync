from __future__ import annotations

import csv
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import pgeocode

BASE_DIR = Path(__file__).resolve().parent
SOURCE_CANDIDATES = [
    BASE_DIR / "Lead-Sync-Dashboard" / "Lead-Sync-Dashboard" / "Projects_Product_Category.csv",
    BASE_DIR / "Lead-Sync-Dashboard" / "Lead-Sync-Dashboard" / "IKIO_Final_With_Zip_And_Product_Category.csv",
]
OUTPUT_PATH = BASE_DIR / "data" / "sales-mapper-data.json"
NOMINATIM = pgeocode.Nominatim("us")

STATE_NAME_TO_CODE = {
    "ALABAMA": "AL",
    "ALASKA": "AK",
    "ARIZONA": "AZ",
    "ARKANSAS": "AR",
    "CALIFORNIA": "CA",
    "COLORADO": "CO",
    "CONNECTICUT": "CT",
    "DELAWARE": "DE",
    "DISTRICT OF COLUMBIA": "DC",
    "FLORIDA": "FL",
    "GEORGIA": "GA",
    "HAWAII": "HI",
    "IDAHO": "ID",
    "ILLINOIS": "IL",
    "INDIANA": "IN",
    "IOWA": "IA",
    "KANSAS": "KS",
    "KENTUCKY": "KY",
    "LOUISIANA": "LA",
    "MAINE": "ME",
    "MARYLAND": "MD",
    "MASSACHUSETTS": "MA",
    "MICHIGAN": "MI",
    "MINNESOTA": "MN",
    "MISSISSIPPI": "MS",
    "MISSOURI": "MO",
    "MONTANA": "MT",
    "NEBRASKA": "NE",
    "NEVADA": "NV",
    "NEW HAMPSHIRE": "NH",
    "NEW JERSEY": "NJ",
    "NEW MEXICO": "NM",
    "NEW YORK": "NY",
    "NORTH CAROLINA": "NC",
    "NORTH DAKOTA": "ND",
    "OHIO": "OH",
    "OKLAHOMA": "OK",
    "OREGON": "OR",
    "PENNSYLVANIA": "PA",
    "RHODE ISLAND": "RI",
    "SOUTH CAROLINA": "SC",
    "SOUTH DAKOTA": "SD",
    "TENNESSEE": "TN",
    "TEXAS": "TX",
    "UTAH": "UT",
    "VERMONT": "VT",
    "VIRGINIA": "VA",
    "WASHINGTON": "WA",
    "WEST VIRGINIA": "WV",
    "WISCONSIN": "WI",
    "WYOMING": "WY",
}
STATE_CODE_TO_NAME = {code: name.title() for name, code in STATE_NAME_TO_CODE.items()}

TEXT_REPLACEMENTS = {
    "\u2013": " - ",
    "\u2014": " - ",
    "\u2019": "'",
    "\u201c": '"',
    "\u201d": '"',
    "\u00a0": " ",
}


def normalize_text(value: object) -> str:
    raw = "" if value is None else str(value).strip()
    for source, target in TEXT_REPLACEMENTS.items():
        raw = raw.replace(source, target)
    return re.sub(r"\s+", " ", raw).strip()


def normalize_state(value: object) -> str | None:
    raw = normalize_text(value).upper()
    if not raw:
        return None
    if raw in STATE_CODE_TO_NAME:
        return raw
    return STATE_NAME_TO_CODE.get(raw)


def normalize_zip(value: object) -> str | None:
    digits = "".join(ch for ch in normalize_text(value) if ch.isdigit())
    if not digits:
        return None
    return digits[:5].zfill(5)


def parse_coordinate(value: object) -> float | None:
    raw = normalize_text(value)
    if not raw:
        return None
    try:
        return round(float(raw), 4)
    except ValueError:
        return None


def parse_number(value: object) -> float | None:
    raw = normalize_text(value)
    if not raw or raw == "-":
        return None
    cleaned = raw.replace(",", "")
    match = re.search(r"-?\d+(?:\.\d+)?", cleaned)
    if not match:
        return None
    return float(match.group(0))


def load_rows(path: Path) -> list[dict[str, str]]:
    # Source CSV uses Windows-1252 characters (e.g., smart quotes).
    with path.open("r", encoding="cp1252", newline="") as handle:
        return list(csv.DictReader(handle))


def resolve_source_path() -> Path:
    for candidate in SOURCE_CANDIDATES:
        if candidate.exists():
            return candidate
    return SOURCE_CANDIDATES[0]


def parse_images(value: object) -> list[str] | None:
    raw = normalize_text(value)
    if not raw:
        return None
    lowered = raw.lower()
    if lowered in {"picture", "image", "images"}:
        return None

    separators = ["|", ";"]
    for sep in separators:
        if sep in raw:
            parts = [normalize_text(part) for part in raw.split(sep)]
            images = [part for part in parts if part]
            return images or None

    if "," in raw:
        parts = [normalize_text(part) for part in raw.split(",")]
        images = [part for part in parts if part]
        return images or None

    return [raw]


def build_zip_lookup(zips: list[str]) -> dict[str, dict[str, float]]:
    if not zips:
        return {}
    zip_lookup = NOMINATIM.query_postal_code(zips)
    out: dict[str, dict[str, float]] = {}
    for record in zip_lookup.to_dict("records"):
        postal_code = normalize_zip(record.get("postal_code"))
        latitude = record.get("latitude")
        longitude = record.get("longitude")
        if not postal_code or latitude is None or longitude is None:
            continue
        if latitude != latitude or longitude != longitude:
            continue
        out[postal_code] = {
            "latitude": round(float(latitude), 4),
            "longitude": round(float(longitude), 4),
        }
    return out


def choose_default_state(projects: list[dict[str, object]]) -> str:
    counts: dict[str, int] = {}
    for project in projects:
        state_code = project.get("stateCode")
        latitude = project.get("latitude")
        longitude = project.get("longitude")
        if not state_code or latitude is None or longitude is None:
            continue
        counts[state_code] = counts.get(state_code, 0) + 1

    if not counts:
        return "IN"

    return sorted(counts.items(), key=lambda item: (-item[1], STATE_CODE_TO_NAME.get(item[0], item[0])))[0][0]


def build_payload(source_path: Path) -> dict[str, object]:
    rows = load_rows(source_path)
    zips = sorted({zip_code for row in rows if (zip_code := normalize_zip(row.get("ZIP Code")))})
    zip_lookup = build_zip_lookup(zips)

    projects: list[dict[str, object]] = []
    for index, row in enumerate(rows, start=1):
        state_code = normalize_state(row.get("State"))
        zip_code = normalize_zip(row.get("ZIP Code"))
        explicit_latitude = parse_coordinate(row.get("Latitude"))
        explicit_longitude = parse_coordinate(row.get("Longitude"))
        coordinates = zip_lookup.get(zip_code or "")
        latitude = explicit_latitude if explicit_latitude is not None else (coordinates["latitude"] if coordinates else None)
        longitude = explicit_longitude if explicit_longitude is not None else (coordinates["longitude"] if coordinates else None)

        projects.append(
            {
                "id": f"project-{index}",
                "name": normalize_text(row.get("Project Name")),
                "city": normalize_text(row.get("City")) or None,
                "state": STATE_CODE_TO_NAME.get(state_code, normalize_text(row.get("State")) or None),
                "stateCode": state_code,
                "zip": zip_code,
                "projectType": normalize_text(row.get("Project Type")) or None,
                "productsUsed": normalize_text(row.get("Products Used")) or None,
                "productCategory": normalize_text(row.get("Product Category")) or None,
                "annualEnergySavingsKwh": parse_number(row.get("Annual Energy Savings (kWh/Yr)")),
                "annualCostSavingsUsd": parse_number(row.get("Annual Cost Savings ($)")),
                "fixturesCommissioned": parse_number(row.get("Fixtures Commissioned")),
                "improvedLightingPercent": parse_number(row.get("Improved Lighting Levels")),
                "maintenanceSavingsUsd": parse_number(row.get("Maintenance Savings ($)")),
                "images": parse_images(row.get("Images")),
                "description": normalize_text(row.get("Description")) or None,
                "challenge": normalize_text(row.get("Challenge")) or None,
                "resolution": normalize_text(row.get("Resolution")) or None,
                "latitude": latitude,
                "longitude": longitude,
            }
        )

    mapped_projects = [project for project in projects if project["latitude"] is not None and project["longitude"] is not None]
    covered_states = sorted({project["stateCode"] for project in mapped_projects if project["stateCode"]})
    categories = sorted({project["productCategory"] for project in projects if project["productCategory"]})
    project_types = sorted({project["projectType"] for project in projects if project["projectType"]})

    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sourcePath": str(source_path),
        "defaultState": choose_default_state(projects),
        "summary": {
            "projectCount": len(projects),
            "mappedProjectCount": len(mapped_projects),
            "coveredStateCount": len(covered_states),
            "productCategoryCount": len(categories),
            "annualEnergySavingsKwh": round(
                sum(project["annualEnergySavingsKwh"] or 0 for project in projects),
                2,
            ),
            "annualCostSavingsUsd": round(
                sum(project["annualCostSavingsUsd"] or 0 for project in projects),
                2,
            ),
            "maintenanceSavingsUsd": round(
                sum(project["maintenanceSavingsUsd"] or 0 for project in projects),
                2,
            ),
        },
        "filterOptions": {
            "statesWithProjects": covered_states,
            "productCategories": categories,
            "projectTypes": project_types,
        },
        "projects": projects,
    }


def main() -> None:
    source_path = resolve_source_path()
    payload = build_payload(source_path)
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_PATH.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)
        handle.write("\n")
    print(f"Wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
