"""Build the public 2022 Minas Gerais snapshot from official IBGE sources."""
import argparse
import json
from pathlib import Path
from tempfile import TemporaryDirectory
from urllib.request import Request, urlopen

import geopandas as gpd
import numpy as np
import pandas as pd
import shapely
from PIL import Image, ImageDraw
from shapely.geometry import mapping

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "frontend" / "public" / "data"
SOURCES = {
    "mg.zip": "https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_municipais/municipio_2022/UFs/MG/MG_Municipios_2022.zip",
    "sidra.json": "https://apisidra.ibge.gov.br/values/t/4714/n6/in%20n3%2031/v/all/p/2022",
    "gdp.json": "https://apisidra.ibge.gov.br/values/t/5938/n6/in%20n3%2031/v/37/p/2022",
    "loc.json": "https://servicodados.ibge.gov.br/api/v1/localidades/estados/31/municipios",
}
VARIABLES = {"93": "population", "6318": "area", "614": "density", "37": "gdp"}
PALETTE = ["#164a47", "#1a6d61", "#229882", "#43c7a4", "#93eace"]


def read_sources(cache: Path):
    cache.mkdir(parents=True, exist_ok=True)
    for name, url in SOURCES.items():
        target = cache / name
        if not target.exists():
            request = Request(url, headers={"User-Agent": "GeoPulse/0.1"})
            with urlopen(request, timeout=120) as response:
                content = response.read()
            target.write_bytes(content)
    return cache / "mg.zip", *(
        json.loads((cache / name).read_text(encoding="utf-8-sig"))
        for name in ("sidra.json", "gdp.json", "loc.json")
    )


def draw_preview(gdf, values):
    """Render the official municipal geometry, colored by statewide density quintile."""
    width, height = 1100, 850
    canvas = Image.new("RGBA", (width * 2, height * 2))
    draw = ImageDraw.Draw(canvas)
    left, bottom, right, top = gdf.total_bounds
    scale = min((width - 54) / (right - left), (height - 54) / (top - bottom))
    x_padding = (width - (right - left) * scale) / 2
    y_padding = (height - (top - bottom) * scale) / 2
    cutoffs = np.quantile(values["density"].dropna(), [.2, .4, .6, .8])

    def project(ring):
        return [((x_padding + (x - left) * scale) * 2, (y_padding + (top - y) * scale) * 2)
                for x, y in ring.coords]

    for code, geometry in zip(gdf["CD_MUN"], gdf.geometry, strict=True):
        density = values.at[code, "density"]
        color = "#52656a" if pd.isna(density) else PALETTE[np.searchsorted(cutoffs, density, side="left")]
        polygons = geometry.geoms if geometry.geom_type == "MultiPolygon" else [geometry]
        for polygon in polygons:
            draw.polygon(project(polygon.exterior), fill=color, outline="#102b2b", width=2)
            for hole in polygon.interiors:
                draw.polygon(project(hole), fill=(0, 0, 0, 0))
    canvas.resize((width, height), Image.Resampling.LANCZOS).save(PUBLIC / "minas-densidade.webp", lossless=True)


def build(cache: Path):
    archive, sidra, gdp, locations = read_sources(cache)
    values = pd.DataFrame(
        [(row["D1C"], VARIABLES[row["D2C"]], row["V"]) for row in [*sidra[1:], *gdp[1:]]],
        columns=["code", "metric", "value"],
    )
    values["value"] = pd.to_numeric(values["value"].replace(["-", "...", "..", "X"], None), errors="raise")
    values = values.pivot(index="code", columns="metric", values="value")
    regions = {
        str(item["id"]): item["regiao-imediata"]["regiao-intermediaria"]
        for item in locations
    }
    gdf = gpd.read_file(archive).sort_values("CD_MUN").reset_index(drop=True)
    codes = set(gdf["CD_MUN"])
    if len(gdf) != 853 or len(codes) != 853 or codes != set(values.index) or codes != set(regions):
        raise ValueError("As fontes devem conter os mesmos 853 códigos municipais de Minas Gerais.")

    # Work in meters for simplification and calculate representative points inside the display geometry.
    projected = gdf.to_crs(5880)
    geometry = projected.geometry
    if not shapely.coverage_is_valid(geometry.array):
        raise ValueError("A malha de origem não forma uma cobertura válida.")
    simplified = gpd.GeoSeries(shapely.coverage_simplify(geometry.array, 220), crs=projected.crs)
    if not simplified.is_valid.all() or simplified.is_empty.any() or not shapely.coverage_is_valid(simplified.array):
        raise ValueError("A simplificação alterou a validade da cobertura.")
    centers = simplified.representative_point().to_crs(4326)
    gdf = gdf.set_geometry(simplified.to_crs(4326))
    features = []
    for code, name, geometry, center in zip(gdf["CD_MUN"], gdf["NM_MUN"], gdf.geometry, centers, strict=True):
        metrics = values.loc[code]
        region = regions[code]
        west, south, east, north = geometry.bounds
        features.append({
            "type": "Feature",
            "id": code,
            "properties": {
                "code": code, "name": name, "regionId": region["id"], "region": region["nome"],
                "center": [round(center.x, 6), round(center.y, 6)],
                "bounds": [round(v, 6) for v in (west, south, east, north)],
                **{key: None if pd.isna(metrics[key]) else int(metrics[key]) if key in {"population", "gdp"}
                   else float(metrics[key]) for key in VARIABLES.values()},
            },
            "geometry": mapping(shapely.orient_polygons(shapely.set_precision(geometry, 0.000001, mode="pointwise"))),
        })

    PUBLIC.mkdir(parents=True, exist_ok=True)
    payload = {"type": "FeatureCollection", "features": features}
    (PUBLIC / "mg-2022.geojson").write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":"), allow_nan=False) + "\n",
        encoding="utf-8",
    )
    draw_preview(gdf, values)
    print(f"{len(features)} municípios, {len({r['id'] for r in regions.values()})} regiões intermediárias.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cache", type=Path, help="Diretório para reutilizar os arquivos brutos do IBGE.")
    args = parser.parse_args()
    if args.cache:
        build(args.cache.resolve())
    else:
        with TemporaryDirectory() as tmp:
            build(Path(tmp))
