"""Generate per-UF GeoJSON files for the 2022 IBGE district boundaries."""
import argparse
from collections import defaultdict
import json
from pathlib import Path
from tempfile import TemporaryDirectory
from urllib.request import urlretrieve

import geopandas as gpd
from shapely import orient_polygons, set_precision
from shapely.geometry import mapping

URL = (
    "https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/"
    "malhas_de_setores_censitarios__divisoes_intramunicipais/censo_2022/distritos/shp/BR/"
    "BR_distritos_CD2022.zip"
)
OUTPUT = Path(__file__).resolve().parents[1] / "frontend/public/data"


def build(archive):
    features = defaultdict(list)
    source = gpd.read_file(archive, columns=["CD_UF", "CD_MUN", "NM_MUN", "CD_DIST", "NM_DIST"])
    districts = source.dropna(subset=["CD_DIST", "CD_MUN", "NM_DIST"])
    for row in districts.itertuples(index=False):
        code = row.CD_DIST
        if code[:7] != row.CD_MUN:
            raise ValueError(f"District code {code} does not match municipality {row.CD_MUN}")
        geometry = row.geometry.simplify(.009)
        if not geometry.is_valid:
            geometry = geometry.buffer(0)
        reduced = set_precision(geometry, .0001)
        if not reduced.is_empty:
            geometry = reduced
        if geometry.is_empty or geometry.geom_type not in {"Polygon", "MultiPolygon"}:
            raise ValueError(f"District {code} does not contain a polygon")
        features[row.CD_UF].append({
            "type": "Feature", "id": code,
            "properties": {
                "code": code, "name": row.NM_DIST, "region": row.NM_MUN,
                "bounds": [round(value, 6) for value in geometry.bounds],
            },
            "geometry": mapping(orient_polygons(geometry)),
        })
    if len(features) != 27 or sum(map(len, features.values())) != districts["CD_DIST"].nunique():
        raise ValueError("Expected unique district codes across all 27 UFs")
    for state, items in sorted(features.items()):
        (OUTPUT / f"districts-br-{state}.geojson").write_text(
            json.dumps({"type": "FeatureCollection", "features": items}, ensure_ascii=False,
                       separators=(",", ":"), allow_nan=False), encoding="utf-8"
        )
    print(f"{sum(map(len, features.values()))} districts across {len(features)} UFs")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--archive", type=Path, help="Reuse the locally downloaded IBGE ZIP.")
    opts = parser.parse_args()
    if opts.archive:
        build(opts.archive)
    else:
        with TemporaryDirectory() as temp:
            archive = Path(temp) / "ibge-districts.zip"
            urlretrieve(URL, archive)
            build(archive)
