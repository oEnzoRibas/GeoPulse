"""Build simplified Natural Earth layers for the worldwide viewer."""
import argparse
import json
from pathlib import Path
from tempfile import TemporaryDirectory
from urllib.request import urlretrieve

import geopandas as gpd
from PIL import Image, ImageDraw
from shapely import orient_polygons, set_precision
from shapely.geometry import mapping

OUTPUT = Path(__file__).resolve().parents[1] / "frontend/public/data"
SOURCES = {
    "world-countries": ("50m", "ne_50m_admin_0_countries"),
    "world-subdivisions": ("10m", "ne_10m_admin_1_states_provinces"),
}


def clean(value):
    return value.strip() if isinstance(value, str) and value.strip() != "-99" else ""


def render_preview(features):
    """Draw the actual country outlines used by the viewer."""
    width, height = 1200, 650
    image = Image.new("RGBA", (width * 2, height * 2))
    draw = ImageDraw.Draw(image)

    def project(ring):
        return [(round((lon + 180) / 360 * (width - 40) * 2 + 40),
                 round((88 - lat) / 150 * (height - 40) * 2 + 40)) for lon, lat in ring]

    for feature in features:
        geometry = feature["geometry"]
        polygons = [geometry["coordinates"]] if geometry["type"] == "Polygon" else geometry["coordinates"]
        fill = "#5cc6a7" if feature["id"] == "BRA" else "#285456"
        for exterior, *holes in polygons:
            draw.polygon(project(exterior), fill=fill, outline="#152d35", width=2)
            for hole in holes:
                draw.polygon(project(hole), fill=(0, 0, 0, 0))
    image.resize((width, height), Image.Resampling.LANCZOS).save(OUTPUT / "world-preview.webp", lossless=True)


def build(cache):
    cache.mkdir(parents=True, exist_ok=True)
    for layer, (scale, source) in SOURCES.items():
        countries = scale == "50m"
        archive = cache / f"{source}.zip"
        if not archive.exists():
            urlretrieve(f"https://naturalearth.s3.amazonaws.com/{scale}_cultural/{source}.zip", archive)
        records = []
        for row in gpd.read_file(archive).to_dict("records"):
            country = row["ADM0_A3" if countries else "adm0_a3"]
            code = country if countries else row["adm1_code"]
            name = clean(row["NAME_PT" if countries else "name_pt"]) or clean(row["NAME" if countries else "name"]) or clean(row["NAME_EN" if countries else "name_en"]) or code
            fields = ("ISO_A2", "ISO_A3", "ISO_N3", "NAME", "NAME_EN", "ADMIN") if countries else (
                "iso_3166_2", "name", "name_en", "name_local"
            )
            aliases = sorted({clean(row[field]) for field in fields} - {"", name, code})
            geometry = row["geometry"].simplify(.045 if countries else .018)
            if not geometry.is_valid:
                geometry = geometry.buffer(0)
            geometry = set_precision(geometry, .0001)
            if geometry.is_empty or not geometry.is_valid:
                raise ValueError(f"Invalid simplified geometry for {code}")
            geometry = orient_polygons(geometry)
            focus = geometry
            if geometry.geom_type == "MultiPolygon" and geometry.bounds[2] - geometry.bounds[0] > 180:
                focus = max(geometry.geoms, key=lambda part: part.area)
            records.append({
                "type": "Feature", "id": code,
                "properties": {
                    "code": code, "name": name, "country": country, "aliases": aliases,
                    "region": clean(row["CONTINENT" if countries else "admin"]) or country,
                    "bounds": tuple(round(value, 4) for value in focus.bounds),
                },
                "geometry": mapping(geometry),
            })
        codes = {record["id"] for record in records}
        if len(codes) != len(records):
            raise ValueError(f"Duplicate codes in {layer}")
        output = {"type": "FeatureCollection", "features": records}
        (OUTPUT / f"{layer}.geojson").write_text(
            json.dumps(output, ensure_ascii=False, separators=(",", ":"), allow_nan=False), encoding="utf-8"
        )
        if countries:
            render_preview(records)
        print(f"{layer}: {len(records)} features")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cache", type=Path)
    args = parser.parse_args()
    if args.cache:
        build(args.cache)
    else:
        with TemporaryDirectory() as temp:
            build(Path(temp))
