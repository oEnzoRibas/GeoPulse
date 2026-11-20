import { normalize } from "@/lib/territory";

interface Location {
  code: string;
  name: string;
  aliases?: string[];
}

export interface ImportedLayer {
  label: string;
  unit: string;
  period: string;
  source: string;
  values: Map<string, number>;
}

const unknown = new Set(["", "-", "–", "—", "...", "..", "na", "n/a", "null"]);

function numberFrom(text: string, decimal: "." | ",") {
  const input = text.trim().replace(/[\u00a0\u202f]/g, " ");
  const pattern = decimal === ","
    ? /^[+-]?(?:\d+|\d{1,3}(?:[. ]\d{3})+)(?:,\d+)?$/
    : /^[+-]?(?:\d+|\d{1,3}(?:[, ]\d{3})+)(?:\.\d+)?$/;
  if (!pattern.test(input)) return NaN;
  return Number(decimal === "," ? input.replace(/[. ]/g, "").replace(",", ".") : input.replace(/[, ]/g, ""));
}

function locationKey(value: string) {
  const key = normalize(value).replace(/^(\d{6,7})\s+.+$/, "$1");
  return /^\d{1,3}$/.test(key) ? key.padStart(3, "0") : key;
}

export function tabnetTable(text: string) {
  const lines = text.split(/\r\n|\n|\r/);
  const header = lines.findIndex(line => /^\s*"?munic[ií]pio[^";]*"?\s*;/i.test(line));
  if (header < 0) return null;

  const period = lines.slice(0, header)
    .map(line => /^\s*"?per[ií]odo\s*:\s*([^"\\]+?)[\s"\\]*$/i.exec(line)?.[1]).find(Boolean);
  const tail = lines.slice(header + 1);
  const source = tail
    .map(line => /^(?:\s|&#x20;|&nbsp;)*"?fonte\s*:\s*([^"\\]+?)[\s"\\]*$/i.exec(line)?.[1]).find(Boolean);
  if (!period && !source) return null;

  const footer = tail.findIndex(line => /^\s*"?total"?\s*;/i.test(line) || /^(?:\s|&#x20;|&nbsp;)*"?fonte\s*:/i.test(line));
  const body = footer < 0 ? tail : tail.slice(0, footer);
  const table = [lines[header], ...body].map(line => line.replace(/\\\s*$/, "")).join("\n");
  return { table, period: period?.trim(), source: source?.trim() };
}

export function municipalityState(rows: string[][], column: number, heading: string) {
  if (!/municip|ibge/.test(normalize(heading))) return undefined;
  const states = new Set(rows.flatMap(row => {
    const code = locationKey(row[column] ?? "");
    return /^\d{6,7}$/.test(code) ? [code.slice(0, 2)] : [];
  }));
  return states.size === 1 ? states.values().next().value : undefined;
}

export function matchRows(
  rows: string[][], locations: Location[], geography: number, value: number,
  periodColumn: number, period: string, decimal: "." | ",", fallback?: { column: number; onlyWhenBlank?: boolean },
) {
  const index = new Map<string, Set<string>>();
  for (const place of locations) {
    const shortCode = /^\d{7}$/.test(place.code) ? [place.code.slice(0, 6)] : [];
    for (const alias of [place.code, place.name, ...shortCode, ...place.aliases ?? []]) {
      const key = locationKey(alias);
      const matches = index.get(key) ?? new Set<string>();
      matches.add(place.code);
      index.set(key, matches);
    }
  }

  const values = new Map<string, number>();
  const rejected = { geography: 0, number: 0, missing: 0, duplicate: 0 };
  const examples = new Set<string>();
  for (const row of rows) {
    if (periodColumn >= 0 && row[periodColumn]?.trim() !== period) continue;
    const cell = row[geography] ?? "";
    let matches = index.get(locationKey(cell));
    if (matches?.size !== 1 && fallback && fallback.column >= 0 && (!fallback.onlyWhenBlank || !cell.trim())) {
      matches = index.get(locationKey(row[fallback.column] ?? ""));
    }
    if (!matches || matches.size !== 1) {
      rejected.geography++;
      if (examples.size < 5) examples.add(cell.trim() || "(vazio)");
      continue;
    }
    const rawValue = row[value] ?? "";
    if (unknown.has(normalize(rawValue))) {
      rejected.missing++;
      continue;
    }
    const numeric = numberFrom(rawValue, decimal);
    if (!Number.isFinite(numeric)) {
      rejected.number++;
      continue;
    }
    const [code] = matches;
    if (values.has(code)) rejected.duplicate++;
    else values.set(code, numeric);
  }
  return { values, rejected, examples: [...examples] };
}
