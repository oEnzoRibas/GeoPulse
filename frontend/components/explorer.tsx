"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Banknote, BookOpen, ChartNoAxesColumnIncreasing, ChevronsUpDown, Database, GitCompareArrows, Layers3, Map as MapIcon, MapPin, Search, SlidersHorizontal, UsersRound, X } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { classify, fetchSnapshot, formatValue, METRICS, metricKeys, normalize, type LegendClass, type Metric, type Municipality, type Snapshot } from "@/lib/territory";

const MapView = dynamic(() => import("./territory-map").then(module => module.TerritoryMap), {
  ssr: false,
  loading: () => <div className="map-frame map-notice">Preparando o mapa…</div>,
});
const icons = { population: UsersRound, density: ChartNoAxesColumnIncreasing, area: MapIcon, gdp: Banknote };

export function Explorer() {
  const [client] = useState(() => new QueryClient());
  return <QueryClientProvider client={client}><ExplorerLoader /></QueryClientProvider>;
}

function ExplorerLoader() {
  const snapshot = useQuery({ queryKey: ["mg", 2022], queryFn: ({ signal }) => fetchSnapshot(signal), staleTime: Infinity, retry: 1 });
  return <div className="explorer">
    <header className="explorer-header">
      <Brand />
      <span className="header-divider" />
      <Link className="workspace-name" prefetch={false} href="/explorar"><MapIcon size={17} /> Visualizador mundial</Link>
      <Link prefetch={false} className="header-method" href="/metodologia"><BookOpen size={17} /> <span>Metodologia</span></Link>
    </header>
    {snapshot.data ? <Workspace snapshot={snapshot.data} /> :
      <main className="page-status" role="status">
        <p>{snapshot.isError ? "Não foi possível carregar a base municipal. Confira a conexão e tente novamente." : "Carregando dados de Minas Gerais…"}</p>
        {snapshot.isError && <Button onClick={() => void snapshot.refetch()}>Tentar novamente</Button>}
      </main>}
  </div>;
}

function Workspace({ snapshot }: { snapshot: Snapshot }) {
  const params = useSearchParams();
  const requestedMetric = params.get("indicador");
  const initialMetric = metricKeys.find(key => key === requestedMetric) ?? "density";
  const [metric, setMetric] = useState<Metric>(initialMetric);
  const [region, setRegion] = useState<number | null>(null);
  const [selected, setSelected] = useState("");
  const [compare, setCompare] = useState("");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [thresholdInput, setThresholdInput] = useState(() => {
    const value = params.get("limiar");
    return value && /^\d+(\.\d+)?$/.test(value) && Number.isFinite(+value) ? value : "";
  });

  const cities = useMemo(() => snapshot.features.map(feature => feature.properties).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")), [snapshot]);
  const regions = useMemo(() => [...new Map(cities.map(city => [city.regionId, city.region]))].sort((a, b) => a[1].localeCompare(b[1], "pt-BR")), [cities]);
  const scoped = useMemo(() => cities.filter(city => region === null || city.regionId === region), [cities, region]);
  const classes = useMemo(() => classify(scoped, metric), [scoped, metric]);
  const matches = useMemo(() => {
    const term = normalize(query);
    return term ? cities.filter(city => normalize(city.name).includes(term) || city.code.includes(term)).slice(0, 8) : [];
  }, [cities, query]);
  const threshold = thresholdInput !== "" && Number.isFinite(+thresholdInput) && +thresholdInput >= 0 ? +thresholdInput : null;
  const passing = scoped.filter(city => threshold === null || (city[metric] !== null && city[metric] >= threshold));
  const current = cities.find(city => city.code === selected);
  const compared = cities.find(city => city.code === compare);
  const details = METRICS[metric];

  function selectCity(code: string) {
    setSelected(code);
    if (compare === code) setCompare("");
    setSearchOpen(false);
    setQuery("");
    if (region !== null && cities.find(city => city.code === code)?.regionId !== region) setRegion(null);
  }

  return <main className="workspace">
    <aside className="filters" data-expanded={controlsOpen} aria-label="Controles de análise">
      <div className="workspace-title"><span className="eyebrow">EXPLORADOR</span><h1>Minas Gerais</h1><p>Censo Demográfico 2022</p></div>
      <button className="mobile-filter-toggle" type="button" aria-expanded={controlsOpen} onClick={() => setControlsOpen(!controlsOpen)}>
        <SlidersHorizontal size={17} /> {controlsOpen ? "Ocultar filtros" : "Filtros e indicadores"}
      </button>
      <section className="filter-group">
        <h2><Layers3 size={16} /> Indicadores</h2>
        <div className="metric-list">
          {metricKeys.map(key => {
            const Icon = icons[key];
            return <button key={key} className="metric-button" aria-pressed={metric === key} type="button" onClick={() => { setMetric(key); setThresholdInput(""); }}>
              <Icon size={17} /> {METRICS[key].label}
            </button>;
          })}
        </div>
      </section>
      <section className="filter-group">
        <h2><MapPin size={16} /> Recorte geográfico</h2>
        <label className="field-label" htmlFor="region">Região intermediária</label>
        <div className="select-wrap"><select id="region" value={region ?? ""} onChange={event => {
          const nextRegion = event.target.value ? Number(event.target.value) : null;
          setRegion(nextRegion);
          if (nextRegion !== null && current?.regionId !== nextRegion) {
            setSelected("");
            setCompare("");
          }
        }}>
          <option value="">Todas as regiões</option>
          {regions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select><ChevronsUpDown size={14} /></div>
        <p className="field-note">{scoped.length} municípios no recorte</p>
      </section>
      <section className="filter-group">
        <h2><GitCompareArrows size={16} /> Comparação</h2>
        <label className="field-label" htmlFor="compare">Município de referência</label>
        <div className="select-wrap"><select id="compare" value={compare} disabled={!current} onChange={event => setCompare(event.target.value)}>
          <option value="">Selecione um município</option>
          {cities.filter(city => city.code !== selected).map(city => <option key={city.code} value={city.code}>{city.name}</option>)}
        </select><ChevronsUpDown size={14} /></div>
        {!current && <p className="field-note">Selecione um município no mapa ou na busca para comparar.</p>}
      </section>
      <section className="filter-group">
        <h2><SlidersHorizontal size={16} /> Simular limiar</h2>
        <label className="field-label" htmlFor="threshold">Valor mínimo em {details.unit}</label>
        <div className="threshold-field"><input id="threshold" type="number" min={0} step={details.digits === 0 ? 1 : "any"} placeholder="Sem limiar" value={thresholdInput} onChange={event => setThresholdInput(event.target.value)} />
          {thresholdInput && <button type="button" aria-label="Limpar limiar" onClick={() => setThresholdInput("")}><X size={17} /></button>}
        </div>
        <p className="field-note" aria-live="polite">{threshold !== null ? `${passing.length} de ${scoped.length} municípios atendem ao limiar.` : "Destaque municípios que atingem um valor mínimo."}</p>
      </section>
      <div className="filter-footer"><Link prefetch={false} href="/metodologia#fontes"><Database size={16} /> Fontes dos dados</Link><Link prefetch={false} href="/metodologia"><BookOpen size={16} /> Metodologia</Link></div>
    </aside>
    <section className="map-column" aria-label="Mapa e legenda">
      <div className="map-toolbar"><div className="map-toolbar-title"><span className="status-dot" /><strong>Mapa temático</strong></div>
        <div className="map-search" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setSearchOpen(false); }}>
          <form role="search" onSubmit={event => { event.preventDefault(); if (matches[0]) selectCity(matches[0].code); }}>
            <Search size={16} />
            <input aria-label="Buscar município por nome ou código IBGE" aria-expanded={searchOpen && !!query.trim()} aria-controls="city-results" placeholder="Buscar município…" value={query} onFocus={() => setSearchOpen(true)} onChange={event => { setQuery(event.target.value); setSearchOpen(true); }} onKeyDown={event => { if (event.key === "Escape") setSearchOpen(false); }} />
            {query && <button type="button" aria-label="Limpar busca" onClick={() => setQuery("")}><X size={16} /></button>}
          </form>
          <div id="city-results" hidden={!searchOpen || !query.trim()} className="search-results">
            {matches.map(city => <button type="button" key={city.code} onClick={() => selectCity(city.code)}><span>{city.name}</span><small>{city.code}</small></button>)}
            {!matches.length && <p>Nenhum município encontrado.</p>}
          </div>
        </div>
      </div>
      <MapView snapshot={snapshot} metric={metric} classes={classes} region={region} threshold={threshold} selected={current} compare={current ? compared : undefined} onSelect={selectCity} />
      <Legend classes={classes} metric={metric} filtered={region !== null} simulation={threshold !== null} />
    </section>
    <Analysis metric={metric} city={current} compare={compared} cities={passing} clear={() => { setSelected(""); setCompare(""); }} />
  </main>;
}

function Legend({ classes, metric, filtered, simulation }: { classes: LegendClass[]; metric: Metric; filtered: boolean; simulation: boolean }) {
  const rangeValue = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: Math.max(METRICS[metric].digits + 2, 2) });
  return <div className="legend">
    <div className="legend-header"><div><strong>{METRICS[metric].label}</strong><span> · {METRICS[metric].unit}</span></div><span>Quintis · 2022</span></div>
    {classes.length ? <div className="legend-classes" aria-label="Classes do mapa">
      {classes.map((item, i) => <div className="legend-class" key={item.upper} title={`${i ? "(" : "["}${rangeValue(item.lower)} a ${rangeValue(item.upper)}]`}>
        <i style={{ backgroundColor: item.color }} />
        <span>{i === 0 && rangeValue(item.lower) + " – "}{i > 0 && "≤ "}{rangeValue(item.upper)}</span>
      </div>)}
    </div> : <p className="field-note">Nenhum valor disponível neste recorte.</p>}
    <div className="legend-footer"><span><i className="swatch-missing" /> Sem dados</span>
      {filtered && <span><i className="swatch-outside" /> Fora da região</span>}
      {simulation && <span><i className="swatch-below" /> Abaixo do limiar</span>}
      <a href={METRICS[metric].source} target="_blank" rel="noreferrer">IBGE · SIDRA {METRICS[metric].table}</a>
    </div>
  </div>;
}

function Analysis({ metric, city, compare, cities, clear }: { metric: Metric; city?: Municipality; compare?: Municipality; cities: Municipality[]; clear: () => void }) {
  const details = METRICS[metric];
  const reducedMotion = useReducedMotion();
  const ranking = cities.filter(city => city[metric] !== null).sort((a, b) => b[metric]! - a[metric]!).slice(0, 5);
  const chartCities = city ? [city, ...(compare ? [compare] : [])] : ranking;
  const chartData = chartCities.flatMap(item => item[metric] === null ? [] : [{ name: item.name, value: item[metric] }]);
  const delta = city && compare && city[metric] !== null && compare[metric] !== null ? city[metric] - compare[metric] : null;
  return <aside className="analysis-panel" aria-label="Painel analítico">
    <div className="analysis-heading"><span className="eyebrow">ANÁLISE TERRITORIAL</span>{city && <button aria-label="Limpar seleção municipal" type="button" onClick={clear}><X size={18} /></button>}</div>
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={city?.code ?? "overview"} initial={reducedMotion ? false : { opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={reducedMotion ? undefined : { opacity: 0 }} transition={{ duration: .14 }}>
        <h2>{city?.name ?? "Visão geral"}</h2>
        <p className="analysis-description">{city ? `${city.region} · IBGE ${city.code}` : "Selecione um município para examinar seus indicadores."}</p>
        {city && <dl className="city-metrics">
          {metricKeys.map(key => <div key={key} className={key === metric ? "active" : ""}><dt>{METRICS[key].label}</dt><dd>{formatValue(city[key], key)} {city[key] !== null && <small>{METRICS[key].unit}</small>}</dd></div>)}
        </dl>}
        <section className="chart-section">
          <h3>{city ? compare ? "Comparação municipal" : "Indicador selecionado" : "Maiores valores no recorte"}</h3>
          <p className="field-note">{details.label} · {details.unit}</p>
          {chartData.length ? <>
            <div className="analysis-chart" style={{ height: Math.max(112, chartData.length * 34 + 30) }} aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 8, top: 6, bottom: 0 }}>
                  <CartesianGrid horizontal={false} stroke="#2a3a43" />
                  <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#adc0c9" }} tickFormatter={value => new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(value)} />
                  <YAxis dataKey="name" type="category" hide />
                  <Tooltip cursor={{ fill: "#1c2d37" }} formatter={value => typeof value === "number" ? formatValue(value, metric) : "Sem dados"} contentStyle={{ background: "#14222c", border: "1px solid #39515a", color: "#effaf7" }} itemStyle={{ color: "#8ff0d1" }} />
                  <Bar dataKey="value" name={details.label} radius={[0, 4, 4, 0]} maxBarSize={18} isAnimationActive={false}>
                    {chartData.map(entry => <Cell key={entry.name} fill={entry.name === compare?.name ? "#69dafa" : "#63d9b6"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <ol className="chart-values">{chartCities.map(item => <li key={item.code}><span>{item.name}</span><strong>{formatValue(item[metric], metric)}</strong></li>)}</ol>
          </> : <p className="field-note">Sem valores disponíveis para este indicador no recorte.</p>}
          {compare && city && delta !== null && <p className="comparison-delta">Diferença ({city.name} − {compare.name}) <strong>{delta > 0 ? "+" : ""}{formatValue(delta, metric)} {details.unit}</strong></p>}
        </section>
      </motion.div>
    </AnimatePresence>
    <section className="analysis-source"><h3><BookOpen size={16} /> Sobre o indicador</h3><p>{details.description}</p><a href={details.source} target="_blank" rel="noreferrer">IBGE · {metric === "gdp" ? "PIB dos Municípios 2022" : "Censo 2022"} · SIDRA {details.table}</a></section>
  </aside>;
}
