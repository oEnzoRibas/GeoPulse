"""Apply SQL migrations and atomically load the versioned municipal snapshot."""
import json
import os
from pathlib import Path

from psycopg import connect
from psycopg.types.json import Jsonb

from backend.main import Municipality, SNAPSHOT, YEAR

MIGRATIONS = Path(__file__).resolve().parent / "migrations"

with connect(os.environ["DATABASE_URL"], connect_timeout=10) as conn:
    conn.execute("SELECT pg_advisory_xact_lock(3172022)")
    conn.execute("CREATE TABLE IF NOT EXISTS schema_migration (version text PRIMARY KEY)")
    applied = {row[0] for row in conn.execute("SELECT version FROM schema_migration")}
    for migration in sorted(MIGRATIONS.glob("*.sql")):
        if migration.name not in applied:
            conn.execute(migration.read_text(encoding="utf-8"))
            conn.execute("INSERT INTO schema_migration VALUES (%s)", (migration.name,))

    features = json.loads(SNAPSHOT.read_text(encoding="utf-8"))["features"]
    municipalities = [Municipality.model_validate(feature["properties"]) for feature in features]
    if len(municipalities) != 853 or len({city.code for city in municipalities}) != 853:
        raise ValueError("O snapshot deve conter 853 códigos municipais distintos.")
    conn.execute("DELETE FROM municipality WHERE year = %s", (YEAR,))
    with conn.cursor() as cursor:
        cursor.executemany(
            """INSERT INTO municipality (year, code, region_id, properties, geom)
               VALUES (%s, %s, %s, %s, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326)))""",
            [(YEAR, city.code, city.regionId, Jsonb(city.model_dump()), json.dumps(feature["geometry"]))
             for city, feature in zip(municipalities, features, strict=True)],
        )
print(f"{len(municipalities)} municípios carregados para {YEAR}.")
