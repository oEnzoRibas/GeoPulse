"use client";

import { useMemo, useRef, useState } from "react";
import { boundaryFor, brazilDistricts, brazilMunicipalities, brazilState, childrenIn, collection, downloadBoundary, loadBoundaryCatalog, naturalEarth, stateAbbreviation, type Area, type Geography, type Place } from "@/lib/administrative";
import { useQuery, useQueryClient, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FileUp, Globe2, Layers3, MapPin, Search } from "lucide-react";
import { Brand } from "@/components/brand";
import { CsvImport } from "@/components/csv-import";
import { Explorer } from "@/components/explorer";
import { Button } from "@/components/ui/button";
import type { ImportedLayer } from "@/lib/import-layer";
import { classifyValues, normalize, type Bounds } from "@/lib/territory";

type RootLevel = "countries" | "subdivisions";
type Level = RootLevel | "local";
interface Scope { area: Area; neighbors: Area[] }
const WorldMap = dynamic(() => import("./territory-map").then(module => module.TerritoryMap), {
  ssr: false,
  loading: () => <div className="map-frame map-notice">Preparando o mapa…</div>,
});
const WORLD: Bounds = [-179, -82, 179, 84];
const NO_AREAS: Area[] = [];
const NO_SCOPES: Scope[] = [];

const continentNames: Record<string, string> = {
  Africa: "África", Antarctica: "Antártida", Asia: "Ásia", Europe: "Europa",
  "North America": "América do Norte", "South America": "América do Sul", Oceania: "Oceania",
  "Seven seas (open ocean)": "Territórios oceânicos",
};
const levelNames: Record<RootLevel, string> = { countries: "Países e territórios", subdivisions: "Estados e províncias" };
const format = (value: number) => value.toLocaleString("pt-BR", { maximumFractionDigits: 8 });

async function loadGeography(level: RootLevel, signal: AbortSignal): Promise<Geography> {
  const response = await fetch(`/data/world-${level}.geojson`, { signal });
  if (!response.ok) throw new Error("Malha indisponível");
  return response.json() as Promise<Geography>;
}

function union(places: Place[], fallback: Bounds): Bounds {
  if (!places.length) return fallback;
  const span = (shift: boolean) => places.reduce<Bounds>((bounds, place) => {
    const [west, south, east, north] = place.bounds;
    const offset = shift && east < 0 ? 360 : 0;
    return [Math.min(bounds[0], west + offset), Math.min(bounds[1], south),
      Math.max(bounds[2], east + offset), Math.max(bounds[3], north)];
  }, [Infinity, 85, -Infinity, -85]);
  const standard = span(false);
  const shifted = span(true);
  const fitted = shifted[2] - shifted[0] < standard[2] - standard[0] ? shifted : standard;
  return [fitted[0], Math.max(fitted[1], -85), fitted[2], Math.min(fitted[3], 85)];
}

export function WorldViewer() {
  const params = useSearchParams();
  const [client] = useState(() => new QueryClient());
  if (params.has("indicador") || params.has("limiar") || params.get("modo") === "mg") return <Explorer />;
  return <QueryClientProvider client={client}><Workspace /></QueryClientProvider>;
}

function Workspace() {
  const client = useQueryClient();
  const [level, setLevel] = useState<Level>("countries");
  const [continent, setContinent] = useState("");
  const [country, setCountry] = useState("BRA");
  const [parents, setParents] = useState<Scope[]>(NO_SCOPES);
  const [selected, setSelected] = useState("");
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("");
  const [importOpen, showImport] = useState(false);
  const navigationVersion = useRef(0);
  const [layers, setLayers] = useState<Record<string, ImportedLayer | null>>({});
  const layerKey = JSON.stringify([level, level === "countries" ? "" : country, ...parents.map(item => item.area.properties.code)]);
  const layer = layers[layerKey] ?? null;


  const countries = useQuery({ queryKey: ["countries"], queryFn: ({ signal }) => loadGeography("countries", signal), staleTime: Infinity });
  const subdivisions = useQuery({ queryKey: ["subdivisions"], queryFn: ({ signal }) => loadGeography("subdivisions", signal), enabled: level === "subdivisions", staleTime: Infinity });
  const naturalStates = useMemo(() => subdivisions.data?.features.filter(feature => feature.properties.country === country), [subdivisions.data, country]);
  const parent = parents.at(-1)?.area;
  const parentPlace = parent?.properties;
  const state = parentPlace && brazilState(parentPlace);
  const district = country === "BRA" && !!parentPlace && /^\d{7}$/.test(parentPlace.code);
  const depth = level === "subdivisions" ? 1 : parents.length + 1;
  const needsExternal = (level === "local" && !district && !(country === "BRA" && state))
    || (level === "subdivisions" && naturalStates?.length === 0);
  const catalog = useQuery({ queryKey: ["boundary-catalog", depth], queryFn: ({ signal }) => loadBoundaryCatalog(depth, signal), enabled: needsExternal, staleTime: Infinity });
  const countryArea = countries.data?.features.find(feature => feature.properties.code === country);
  const countryPlace = countryArea?.properties;
  const boundary = boundaryFor(catalog.data, countryPlace);
  const external = useQuery({
    queryKey: ["boundary", boundary?.simplifiedGeometryGeoJSON],
    queryFn: ({ signal }) => downloadBoundary(boundary!, signal),
    enabled: needsExternal && !!boundary, staleTime: Infinity,
  });
  const brazil = useQuery({
    queryKey: ["ibge-boundary", parentPlace?.code],
    queryFn: ({ signal }) => district ? brazilDistricts(parentPlace!, signal) : brazilMunicipalities(parentPlace!, signal),
    enabled: level === "local" && !!parentPlace && (district || (country === "BRA" && !!state)),
    staleTime: Infinity,
  });
  const details = needsExternal ? external.data : level === "local" ? brazil.data : undefined;
  const rootQuery = level === "countries" ? countries : subdivisions;
  const loaded = level === "local" || needsExternal ? !!details || (needsExternal && !!catalog.data && !boundary) : !!rootQuery.data;
  const error = needsExternal ? (catalog.isError ? catalog : external.isError ? external : null)
    : level === "local" ? (brazil.isError ? brazil : null) : rootQuery.isError ? rootQuery : null;

  const countryOptions = useMemo(() => (countries.data?.features ?? []).map(feature => feature.properties)
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")), [countries.data]);
  const countryName = countryOptions.find(item => item.code === country)?.name ?? country;
  const allFeatures = useMemo(() => {
    if (details) return needsExternal && parent ? childrenIn(details.geography, parent) : details.geography.features;
    if (level === "local" || needsExternal) return [];
    return level === "subdivisions" ? naturalStates ?? [] : rootQuery.data?.features ?? [];
  }, [details, rootQuery.data, naturalStates, level, needsExternal, parent]);
  const hasRegionalFilter = level === "local" && state === "31";
  const canDrill = level !== "local" || (!district && depth < 5);
  const levelLabel = level === "local" ? district ? "Distritos" : state && country === "BRA" ? "Municípios" : "Divisões administrativas" : levelNames[level];
  const locations = useMemo(() => allFeatures.map(({ properties: place }) => {
    if (level !== "subdivisions" || country !== "BRA") return place;
    const abbreviation = stateAbbreviation(brazilState(place));
    return abbreviation ? { ...place, aliases: [...place.aliases ?? [], abbreviation] } : place;
  }), [allFeatures, level, country]);
  const municipalRegions = useMemo(() => [...new Set(locations.map(place => place.region))].sort((a, b) => a.localeCompare(b, "pt-BR")), [locations]);
  const visible = useMemo(() => allFeatures.filter(feature => {
    if (level === "countries" && continent) return feature.properties.region === continent;
    if (hasRegionalFilter && region) return feature.properties.region === region;
    return true;
  }), [allFeatures, continent, level, hasRegionalFilter, region]);
  const focusArea = parent ?? (level === "subdivisions" ? countryArea : undefined);
  const snapshot = useMemo<Geography>(() => {
    if (!visible.length && focusArea) return collection([focusArea]);
    return collection(layer ? visible.map(feature => ({
      ...feature, properties: { ...feature.properties, value: layer.values.get(feature.properties.code) ?? null },
    })) : visible);
  }, [visible, layer, focusArea]);
  const regionalContext = hasRegionalFilter && region ? allFeatures : NO_AREAS;
  const surroundings = useMemo(() => collection([
    ...countries.data?.features ?? [],
    ...parents.flatMap(scope => scope.neighbors),
    ...regionalContext,
  ]), [countries.data, parents, regionalContext]);
  const extent = useMemo(() => {
    if (level === "countries" && !continent) return WORLD;
    if (parent && !region) return parent.properties.bounds;
    if (level === "subdivisions" && countryPlace) return countryPlace.bounds;
    return union(visible.map(feature => feature.properties), WORLD);
  }, [visible, level, continent, region, parent, countryPlace]);
  const current = snapshot.features.find(feature => feature.properties.code === selected)?.properties;
  const term = normalize(search);
  const results = term ? visible.map(feature => feature.properties).filter(place =>
    [place.name, place.code, ...place.aliases ?? []].some(alias => normalize(alias).includes(term))).slice(0, 10) : [];
  const mapped = snapshot.features.flatMap(({ properties }) => typeof properties.value === "number" ? [properties.value] : []);
  const classes = classifyValues(mapped);
  const scope = level === "local" ? region || parentPlace?.name || countryName : level === "subdivisions" ? countryName : continentNames[continent] || "Mundo";

  function resetSelection() {
    setSelected("");
    setSearch("");
  }

  function changeGeography(next: Level, nextCountry = country, nextParents: Scope[] = NO_SCOPES) {
    navigationVersion.current++;
    setLevel(next);
    setCountry(nextCountry);
    setParents(nextParents);
    setRegion("");
    resetSelection();
    showImport(false);
  }

  async function focusMunicipalities(stateId: string) {
    const version = navigationVersion.current;
    const data = await client.fetchQuery({
      queryKey: ["subdivisions"],
      queryFn: ({ signal }) => loadGeography("subdivisions", signal),
      staleTime: Infinity,
    });
    const neighbors = data.features.filter(feature => feature.properties.country === "BRA");
    const area = neighbors.find(feature => brazilState(feature.properties) === stateId);
    if (!area) throw new Error("UF indisponível");
    await client.fetchQuery({
      queryKey: ["ibge-boundary", area.properties.code],
      queryFn: ({ signal }) => brazilMunicipalities(area.properties, signal),
      staleTime: Infinity,
    });
    if (version !== navigationVersion.current) return;
    changeGeography("local", "BRA", [{ area, neighbors }]);
    showImport(true);
  }

  function select(code: string, drill = false) {
    setSearch("");
    const area = visible.find(feature => feature.properties.code === code);
    if (!area) return;
    if (!drill || !canDrill) { setSelected(code); return; }
    if (level === "countries") changeGeography("subdivisions", code);
    else changeGeography("local", country, [...parents, { area, neighbors: allFeatures }]);
  }

  const canGoBack = level === "local" || level === "subdivisions";

  function goBack() {
    if (level === "subdivisions") {
      changeGeography("countries");
      setSelected(country);
      if (continent && countryPlace?.region !== continent) setContinent("");
    } else {
      if (parents.length > 1) changeGeography("local", country, parents.slice(0, -1));
      else changeGeography("subdivisions");
      setSelected(parentPlace?.code ?? "");
    }
  }

  function apply(next: ImportedLayer | null) {
    setLayers(current => ({ ...current, [layerKey]: next }));
    showImport(false);

  }

  return <div className="explorer">
    <header className="explorer-header"><Brand /><span className="header-divider" /><span className="workspace-name"><Globe2 size={17} /> Visualizador mundial</span>
      <Link className="header-method" prefetch={false} href="/explorar?modo=mg">Indicadores de Minas Gerais</Link>
    </header>
    <main className="workspace world-workspace">
      <aside className="filters" aria-label="Filtros do visualizador">
        <div className="workspace-title"><span className="eyebrow">VISUALIZADOR GEOGRÁFICO</span><h1>{scope}</h1><p>{levelLabel}</p></div>
        <section className="filter-group csv-fields">
          <h2><Layers3 size={16} /> Recorte do mapa</h2>
          {canGoBack && <Button type="button" variant="outline" title="Ctrl + botão direito no mapa" onClick={goBack}>Voltar um nível</Button>}
          <label>Nível geográfico<select value={level} onChange={event => changeGeography(event.target.value as RootLevel)}>
            {level === "local" && <option value="local" disabled>{levelLabel}</option>}
            {Object.entries(levelNames).map(([key, name]) => <option key={key} value={key}>{name}</option>)}
          </select></label>
          {level === "countries" && <label>Continente<select value={continent} onChange={event => { setContinent(event.target.value); resetSelection(); }}>
            <option value="">Todos</option>{Object.entries(continentNames).map(([key, name]) => <option key={key} value={key}>{name}</option>)}
          </select></label>}
          {level === "subdivisions" && <label>País ou território<select value={country} onChange={event => changeGeography(level, event.target.value)}>
            {countryOptions.map(place => <option key={place.code} value={place.code}>{place.name}</option>)}
          </select></label>}
          {hasRegionalFilter && <label>Região intermediária<select value={region} onChange={event => { setRegion(event.target.value); resetSelection(); }}>
            <option value="">Todas</option>{municipalRegions.map(item => <option key={item}>{item}</option>)}
          </select></label>}
        </section>
        <section className="filter-group">
          <h2><FileUp size={16} /> Dados próprios</h2>
          <Button type="button" variant="outline" disabled={!locations.length} aria-expanded={importOpen} onClick={() => {
            if (importOpen) navigationVersion.current++;
            showImport(!importOpen);
          }}>{importOpen ? "Fechar importação" : "Importar CSV"}</Button>
          {importOpen && <CsvImport locations={locations} currentState={state} onUseState={focusMunicipalities} onApply={apply} />}
          <Link className="secondary-link" prefetch={false} href="/#csv-exemplos" target="_blank" rel="noopener noreferrer">Baixar CSVs de exemplo</Link>
          {layer && <button type="button" className="secondary-link reset-layer" onClick={() => apply(null)}>Remover camada importada</button>}
        </section>
      </aside>
      <section className="map-column" aria-label="Mapa e legenda">
        <div className="map-toolbar">
          <div className="map-toolbar-title"><span className="status-dot" /><strong>{scope}</strong></div>
          <div className="map-search">
            <form role="search" onSubmit={event => { event.preventDefault(); if (results[0]) { setSelected(results[0].code); setSearch(""); } }}>
              <Search size={16} /><input aria-label="Buscar lugar" value={search} onChange={event => setSearch(event.target.value)} onKeyDown={event => { if (event.key === "Escape") setSearch(""); }} placeholder="Buscar lugar ou código…" />
            </form>
            {term && <div className="search-results">{results.length ? results.map(place => <button type="button" key={place.code} onClick={() => { setSelected(place.code); setSearch(""); }}><span>{place.name}</span><small>{place.code}</small></button>) : <p>Nenhum resultado neste recorte.</p>}</div>}
          </div>
        </div>
        <WorldMap snapshot={snapshot} surroundings={surroundings} followExtent classes={classes}
          custom={layer ?? undefined} drillEnabled={canDrill} extent={extent} context={scope}
          attribution={details?.attribution ?? naturalEarth}
          notice={error ? <>Não foi possível carregar este recorte. <button type="button" onClick={() => void error.refetch()}>Tentar novamente</button></>
            : !loaded ? "Carregando limites geográficos…" : !visible.length ? "Nenhuma subdivisão disponível neste recorte." : undefined}
          region={null} threshold={null} selected={current} compare={undefined} onSelect={select} onBack={canGoBack ? goBack : undefined} />
        {layer && <div className="legend">
          <div className="legend-header"><strong>{layer.label}{layer.unit && ` · ${layer.unit}`}</strong><span>{[layer.period, layer.source].filter(Boolean).join(" · ")}</span></div>
          {classes.length ? <div className="legend-classes">{classes.map((entry, index) => <div key={entry.upper} className="legend-class"><i style={{ background: entry.color }} />{index === 0 ? `${format(entry.lower)} – ${format(entry.upper)}` : `≤ ${format(entry.upper)}`}</div>)}</div>
            : <p className="field-note">Nenhum valor neste recorte.</p>}
          <div className="legend-footer"><span><i className="swatch-missing" /> Sem dados</span><span>{mapped.length} de {visible.length} áreas com valor</span><span>Quintis do recorte</span></div>
        </div>}
      </section>
      <aside className="analysis-panel" aria-label="Detalhes do lugar">
        <div className="analysis-heading"><span className="eyebrow">{current ? "ÁREA SELECIONADA" : "RECORTE ATUAL"}</span><MapPin size={16} /></div>
        <h2>{current?.name ?? scope}</h2>
        <p className="analysis-description">{current ? `${current.code} · ${continentNames[current.region] ?? current.region}` : `${visible.length.toLocaleString("pt-BR")} áreas no mapa`}</p>
        {layer && current && <dl className="city-metrics"><div className="active"><dt>{layer.label}</dt><dd>{typeof current.value === "number" ? format(current.value) : "Sem dados"} {typeof current.value === "number" && <small>{layer.unit}</small>}</dd></div></dl>}
        {current && canDrill && <div className="chart-section"><Button type="button" variant="outline" onClick={() => select(current.code, true)}>
          {level === "countries" ? "Ver estados e províncias" : country === "BRA" ? level === "subdivisions" ? "Ver municípios" : "Ver distritos" : "Ver subdivisões"}
        </Button></div>}
        {!current && <p className="field-note chart-section">Clique para ver os dados. Use Shift ou Ctrl + clique para abrir as subdivisões.</p>}
        {details?.note && <p className="field-note chart-section">{details.note}</p>}
        {layer && !current && mapped.length > 0 && <section className="chart-section"><h3>Maiores valores</h3><ol className="chart-values">
          {snapshot.features.map(feature => feature.properties).filter(place => typeof place.value === "number")
            .sort((a, b) => b.value! - a.value!).slice(0, 8).map(place => <li key={place.code}><button type="button" onClick={() => setSelected(place.code)}>{place.name}</button><strong>{format(place.value!)}</strong></li>)}
        </ol></section>}
      </aside>
    </main>
  </div>;
}
