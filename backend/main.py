from contextlib import asynccontextmanager, closing
from functools import lru_cache
import json
import os
from pathlib import Path
from typing import Annotated, Literal

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from psycopg import connect
from pydantic import BaseModel

SNAPSHOT = Path(__file__).resolve().parents[1] / "frontend/public/data/mg-2022.geojson"
DATABASE_URL = os.getenv("DATABASE_URL")
SOURCES = {
    "census": "https://sidra.ibge.gov.br/tabela/4714",
    "gdp": "https://sidra.ibge.gov.br/tabela/5938",
    "geometry": "https://www.ibge.gov.br/geociencias/organizacao-do-territorio/malhas-territoriais/15774-malhas.html",
    "regions": "https://servicodados.ibge.gov.br/api/v1/localidades/estados/31/municipios",
}
CACHE = {"Cache-Control": "public, max-age=3600"}
REGION = Annotated[int | None, Query(ge=3101, le=3113)]
YEAR = 2022


class Municipality(BaseModel):
    code: str
    name: str
    regionId: int
    region: str
    center: tuple[float, float]
    bounds: tuple[float, float, float, float]
    population: int | None
    area: float | None
    density: float | None
    gdp: int | None


class Metadata(BaseModel):
    year: Literal[2022] = YEAR
    state: Literal["MG"] = "MG"
    municipality_count: int
    sources: dict[str, str]


@lru_cache(maxsize=1)
def local_municipalities() -> dict[str, Municipality]:
    collection = json.loads(SNAPSHOT.read_text(encoding="utf-8"))
    return {
        feature["id"]: Municipality.model_validate(feature["properties"])
        for feature in collection["features"]
    }


def connection():
    return connect(DATABASE_URL, connect_timeout=5)


@asynccontextmanager
async def lifespan(_: FastAPI):
    if DATABASE_URL is None:
        local_municipalities()
    yield


app = FastAPI(
    title="GeoPulse API",
    version="0.1.0",
    description="Indicadores de 2022 e malha municipal de Minas Gerais.",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(","),
    allow_methods=["GET"],
)


@app.get("/health")
def health():
    if DATABASE_URL is not None:
        with closing(connection()) as conn:
            count = conn.execute("SELECT count(*) FROM municipality WHERE year = %s", (YEAR,)).fetchone()[0]
        if count != 853:
            raise HTTPException(503, "Base municipal não inicializada.")
    return {"status": "ok", "storage": "postgis" if DATABASE_URL is not None else "snapshot"}


@app.get("/v1/metadata", response_model=Metadata)
def metadata():
    return Metadata(municipality_count=len(municipalities()), sources=SOURCES)


@app.get("/v1/municipalities", response_model=list[Municipality])
def municipalities(region: REGION = None):
    if DATABASE_URL is None:
        return [item for item in local_municipalities().values() if region is None or item.regionId == region]
    with closing(connection()) as conn:
        rows = conn.execute(
            """SELECT properties FROM municipality
               WHERE year = %s AND (%s::integer IS NULL OR region_id = %s)
               ORDER BY code""",
            (YEAR, region, region),
        ).fetchall()
    return [Municipality.model_validate(row[0]) for row in rows]


@app.get("/v1/municipalities/{code}", response_model=Municipality)
def municipality(code: str):
    if DATABASE_URL is None:
        item = local_municipalities().get(code)
    else:
        with closing(connection()) as conn:
            row = conn.execute(
                "SELECT properties FROM municipality WHERE year = %s AND code = %s", (YEAR, code)
            ).fetchone()
        item = Municipality.model_validate(row[0]) if row else None
    if item is None:
        raise HTTPException(404, "Código municipal não encontrado.")
    return item


@app.get(
    "/v1/municipalities.geojson",
    response_class=Response,
    responses={200: {"content": {"application/geo+json": {}}}},
)
def geometry():
    if DATABASE_URL is None:
        return FileResponse(SNAPSHOT, media_type="application/geo+json", headers=CACHE)
    with closing(connection()) as conn:
        rows = conn.execute(
            """SELECT code, properties, ST_AsGeoJSON(ST_ForcePolygonCCW(geom), 6)
               FROM municipality WHERE year = %s ORDER BY code""", (YEAR,)
        ).fetchall()
    payload = {"type": "FeatureCollection", "features": [
        {"type": "Feature", "id": code, "properties": properties, "geometry": json.loads(geometry)}
        for code, properties, geometry in rows
    ]}
    return Response(json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
                    media_type="application/geo+json", headers=CACHE)


@app.get("/v1/locate", response_model=list[Municipality])
def locate(
    lon: Annotated[float, Query(ge=-180, le=180)],
    lat: Annotated[float, Query(ge=-90, le=90)],
):
    if DATABASE_URL is None:
        raise HTTPException(503, "A consulta de coordenadas requer PostGIS.")
    with closing(connection()) as conn:
        rows = conn.execute(
            """SELECT properties FROM municipality
               WHERE year = %s AND ST_Covers(geom, ST_SetSRID(ST_MakePoint(%s, %s), 4326))
               ORDER BY code""",
            (YEAR, lon, lat),
        ).fetchall()
    return [Municipality.model_validate(row[0]) for row in rows]
