import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import { bbox } from "@turf/bbox";
import { booleanPointInPolygon } from "@turf/boolean-point-in-polygon";
import { pointOnFeature } from "@turf/point-on-feature";
import { fetchSnapshot, type Bounds } from "@/lib/territory";

export interface Place {
  code: string;
  name: string;
  bounds: Bounds;
  region: string;
  country?: string;
  aliases?: string[];
  value?: number | null;
}
export type Area = Feature<Polygon | MultiPolygon, Place>;
export type Geography = FeatureCollection<Polygon | MultiPolygon, Place>;
type RawLayer<T> = FeatureCollection<Polygon | MultiPolygon, T>;
interface Boundary {
  boundaryISO: string;
  boundaryLicense: string;
  boundarySource: string;
  simplifiedGeometryGeoJSON: string;
}
export interface LocalLayer {
  geography: Geography;
  attribution: { label: string; url: string };
  note?: string;
}

export const naturalEarth = { label: "Natural Earth", url: "https://www.naturalearthdata.com/about/" };
export const ibge = { label: "IBGE", url: "https://www.ibge.gov.br/geociencias/organizacao-do-territorio/malhas-territoriais/15774-malhas.html" };
const service = "https://servicodados.ibge.gov.br/api";
const stateCodes: Record<string, string> = {
  AC: "12", AL: "27", AM: "13", AP: "16", BA: "29", CE: "23", DF: "53", ES: "32", GO: "52",
  MA: "21", MG: "31", MS: "50", MT: "51", PA: "15", PB: "25", PE: "26", PI: "22", PR: "41",
  RJ: "33", RN: "24", RO: "11", RR: "14", RS: "43", SC: "42", SE: "28", SP: "35", TO: "17",
};

export function stateAbbreviation(id: string | undefined) {
  return Object.keys(stateCodes).find(key => stateCodes[key] === id);
}

async function json<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Fonte indisponível (HTTP ${response.status})`);
  return response.json() as Promise<T>;
}

export function collection(features: Area[]): Geography {
  return { type: "FeatureCollection", features };
}

export function brazilState(place: Place) {
  const iso = [place.code, ...place.aliases ?? []].find(code => /^BR-[A-Z]{2}$/.test(code));
  return iso ? stateCodes[iso.slice(3)] : undefined;
}

export async function brazilMunicipalities(parent: Place, signal: AbortSignal): Promise<LocalLayer> {
  const state = brazilState(parent);
  if (!state) throw new Error("Código da UF indisponível");
  if (state === "31") return { geography: await fetchSnapshot(signal), attribution: ibge };
  const [boundaries, names] = await Promise.all([
    json<RawLayer<{ codarea: string }>>(`${service}/v3/malhas/estados/${state}?formato=application/vnd.geo%2Bjson&qualidade=intermediaria&intrarregiao=municipio`, signal),
    json<{ id: number; nome: string }[]>(`${service}/v1/localidades/estados/${state}/municipios`, signal),
  ]);
  const nameByCode = new Map(names.map(item => [String(item.id), item.nome]));
  return { attribution: ibge, geography: collection(boundaries.features.map(feature => {
    const code = feature.properties.codarea;
    return {
      ...feature, id: code,
      properties: { code, name: nameByCode.get(code) ?? code, bounds: bbox(feature) as Bounds, region: parent.name },
    };
  })) };
}

export async function brazilDistricts(parent: Place, signal: AbortSignal): Promise<LocalLayer> {
  const state = parent.code.slice(0, 2);
  const data = await json<Geography>(`/data/districts-br-${state}.geojson`, signal);
  return {
    geography: collection(data.features.filter(feature => feature.properties.code.slice(0, 7) === parent.code)),
    attribution: ibge,
    note: "Distritos do Censo 2022",
  };
}

export function loadBoundaryCatalog(level: number, signal: AbortSignal) {
  return json<Boundary[]>(`https://www.geoboundaries.org/api/current/gbOpen/ALL/ADM${level}/`, signal);
}

export function boundaryFor(catalog: Boundary[] | undefined, country: Place | undefined) {
  if (!country || !catalog) return undefined;
  const codes = [country.code, ...country.aliases ?? []].filter(code => /^[A-Z]{3}$/.test(code));
  if (country.code === "KOS") codes.push("XKX");
  return codes.map(code => catalog.find(item => item.boundaryISO === code)).find(Boolean);
}

export async function downloadBoundary(boundary: Boundary, signal: AbortSignal): Promise<LocalLayer> {
  const source = new URL(boundary.simplifiedGeometryGeoJSON);
  // The media endpoint serves the underlying LFS object with CORS, without a GitHub page redirect.
  const github = /^\/wmgeolab\/geoBoundaries\/raw\/(.+)$/.exec(source.pathname);
  const url = source.hostname === "github.com" && github
    ? `https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/${github[1]}` : source.href;
  const data = await json<RawLayer<{ shapeID: string; shapeName: string; shapeISO?: string }>>(url, signal);
  return {
    attribution: { label: "geoBoundaries", url: "https://www.geoboundaries.org/" },
    note: [boundary.boundarySource, boundary.boundaryLicense].filter(Boolean).join(" · "),
    geography: collection(data.features.filter(feature => feature.geometry?.type === "Polygon" || feature.geometry?.type === "MultiPolygon").map(feature => {
      const { shapeID: code, shapeName, shapeISO } = feature.properties;
      const aliases = shapeISO && /^[A-Z]{2}-[A-Z0-9]+$/i.test(shapeISO) ? [shapeISO] : [];
      return {
        ...feature, id: code,
        properties: { code, name: shapeName || code, aliases, bounds: bbox(feature) as Bounds, region: boundary.boundaryISO },
      };
    })),
  };
}

export function childrenIn(geography: Geography, parent: Area) {
  const [west, south, east, north] = bbox(parent);
  return geography.features.filter(child => {
    const [left, bottom, right, top] = child.properties.bounds;
    if (right < west || left > east || top < south || bottom > north) return false;
    return booleanPointInPolygon(pointOnFeature(child), parent);
  });
}
