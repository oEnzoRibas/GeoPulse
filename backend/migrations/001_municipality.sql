CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE municipality (
    year smallint NOT NULL CHECK (year >= 2022),
    code text NOT NULL CHECK (code ~ '^31[0-9]{5}$'),
    region_id integer NOT NULL,
    properties jsonb NOT NULL,
    geom geometry(MultiPolygon, 4326) NOT NULL CHECK (ST_IsValid(geom)),
    PRIMARY KEY (year, code)
);

CREATE INDEX municipality_geom_idx ON municipality USING gist (geom);
CREATE INDEX municipality_region_idx ON municipality (year, region_id);
