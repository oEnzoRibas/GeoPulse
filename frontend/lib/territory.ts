import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";

export type Metric = "population" | "density" | "area" | "gdp";
export type Bounds = [number, number, number, number];
export interface Municipality {
  code: string;
  name: string;
  regionId: number;
  region: string;
  center: [number, number];
  bounds: Bounds;
  population: number | null;
  density: number | null;
  area: number | null;
  gdp: number | null;
}
export type Territory = Feature<Polygon | MultiPolygon, Municipality>;
export type Snapshot = FeatureCollection<Polygon | MultiPolygon, Municipality>;

export const SOURCE = "https://sidra.ibge.gov.br/tabela/4714";
export const GDP_SOURCE = "https://sidra.ibge.gov.br/tabela/5938";
export const MESH = "https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_municipais/municipio_2022/UFs/MG/";
export const LOCALITIES = "https://servicodados.ibge.gov.br/api/v1/localidades/estados/31/municipios";
export const STATE_BOUNDS: Bounds = [-51.05, -23.01, -39.84, -14.22];
export const COLORS = ["#164a47", "#1a6d61", "#229882", "#43c7a4", "#93eace"];
export const MISSING = "#52656a";
export const METRICS: Record<Metric, { label: string; unit: string; digits: number; source: string; table: string; description: string }> = {
  population: { label: "População residente", unit: "pessoas", digits: 0, source: SOURCE, table: "4714", description: "Total de pessoas residentes no município em 2022." },
  density: { label: "Densidade demográfica", unit: "hab./km²", digits: 2, source: SOURCE, table: "4714", description: "Número de residentes por quilômetro quadrado de área territorial." },
  area: { label: "Área territorial", unit: "km²", digits: 3, source: SOURCE, table: "4714", description: "Extensão territorial do município na base de referência do Censo 2022." },
  gdp: { label: "PIB municipal", unit: "mil R$", digits: 0, source: GDP_SOURCE, table: "5938", description: "Valor total dos bens e serviços finais produzidos no município em 2022, a preços correntes." },
};
export const metricKeys = Object.keys(METRICS) as Metric[];

export function normalize(text: string) {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("pt-BR").trim();
}

export function formatValue(value: number | null, metric: Metric) {
  return value === null ? "Sem dados" : value.toLocaleString("pt-BR", {
    minimumFractionDigits: METRICS[metric].digits,
    maximumFractionDigits: METRICS[metric].digits,
  });
}

export function classify(cities: Municipality[], metric: Metric) {
  return classifyValues(cities.flatMap(city => city[metric] === null ? [] : [city[metric]]));
}

export function classifyValues(input: Iterable<number>) {
  const values = [...input].sort((a, b) => a - b);
  if (!values.length) return [];
  const min = values[0];
  const max = values[values.length - 1];
  const cuts = [.2, .4, .6, .8].map(percentile => {
    const position = (values.length - 1) * percentile;
    const lower = Math.floor(position);
    return Number((values[lower] + (values[Math.ceil(position)] - values[lower]) * (position - lower)).toFixed(8));
  });
  const upperBounds = [...new Set([...cuts, max])].filter(upper => upper >= min && upper <= max).sort((a, b) => a - b);
  return upperBounds.map((upper, index) => ({
    lower: index ? upperBounds[index - 1] : min,
    upper,
    color: COLORS[upperBounds.length === 1 ? 2 : Math.round(index * 4 / (upperBounds.length - 1))],
  }));
}

export type LegendClass = ReturnType<typeof classify>[number];

export async function fetchSnapshot(signal: AbortSignal): Promise<Snapshot> {
  const api = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  const response = await fetch(api ? api + "/v1/municipalities.geojson" : "/data/mg-2022.geojson", { signal });
  if (!response.ok) throw new Error("A base municipal está temporariamente indisponível.");
  return response.json() as Promise<Snapshot>;
}
