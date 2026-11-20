"use client";

import { useEffect, useRef, useState } from "react";
import { Map as LibreMap, Popup, setWorkerUrl, type ExpressionSpecification } from "maplibre-gl";
import { Compass, Maximize, Minus, Plus } from "lucide-react";
import { formatValue, METRICS, MISSING, STATE_BOUNDS, type Bounds, type LegendClass, type Metric, type Municipality, type Snapshot } from "@/lib/territory";

interface Props {
  snapshot: Snapshot;
  metric: Metric;
  classes: LegendClass[];
  region: number | null;
  threshold: number | null;
  selected: Municipality | undefined;
  compare: Municipality | undefined;
  onSelect: (code: string) => void;
}

setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).toString());

const base: ExpressionSpecification = ["==", ["get", "code"], ""];
const corners = ([west, south, east, north]: Bounds): [[number, number], [number, number]] => [[west, south], [east, north]];

export function TerritoryMap({ snapshot, metric, classes, region, threshold, selected, compare, onSelect }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const map = useRef<LibreMap | null>(null);
  const listeners = useRef({ metric, onSelect });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    listeners.current = { metric, onSelect };
  }, [metric, onSelect]);

  useEffect(() => {
    if (!host.current) return;
    let instance: LibreMap;
    try {
      instance = new LibreMap({
        container: host.current,
        style: {
          version: 8,
          sources: { municipalities: { type: "geojson", data: snapshot } },
          layers: [
            { id: "background", type: "background", paint: { "background-color": "#111c27" } },
            { id: "municipalities", source: "municipalities", type: "fill", paint: { "fill-color": "#164a47" } },
            { id: "borders", source: "municipalities", type: "line", paint: { "line-color": "#0a2227", "line-width": .6, "line-opacity": .72 } },
            { id: "comparison", source: "municipalities", type: "line", filter: base, paint: { "line-color": "#69dafa", "line-width": 2.8 } },
            { id: "selected", source: "municipalities", type: "line", filter: base, paint: { "line-color": "#e5fff5", "line-width": 2.6 } },
          ],
        },
        bounds: corners(STATE_BOUNDS),
        fitBoundsOptions: { padding: 30 },
        maxZoom: 12,
        cooperativeGestures: true,
        attributionControl: false,
        pitchWithRotate: false,
        dragRotate: false,
      });
    } catch {
      setError(true);
      return;
    }
    map.current = instance;
    const tooltip = new Popup({ closeButton: false, closeOnClick: false, offset: 13, className: "map-tooltip" });

    instance.once("load", () => { setReady(true); setError(false); });
    instance.on("error", () => { if (!instance.loaded()) setError(true); });
    instance.on("webglcontextlost", () => setError(true));
    instance.on("webglcontextrestored", () => setError(false));
    instance.on("mousemove", "municipalities", event => {
      const city = event.features?.[0]?.properties;
      if (!city) return;
      instance.getCanvas().style.cursor = "pointer";
      const activeMetric = listeners.current.metric;
      const title = document.createElement("strong");
      title.textContent = city.name;
      const label = document.createElement("span");
      const value = typeof city[activeMetric] === "number" ? city[activeMetric] : null;
      label.textContent = value === null ? "Sem dados" : formatValue(value, activeMetric) + " " + METRICS[activeMetric].unit;
      const content = document.createElement("div");
      content.append(title, label);
      tooltip.setLngLat(event.lngLat).setDOMContent(content).addTo(instance);
    });
    instance.on("mouseleave", "municipalities", () => {
      instance.getCanvas().style.cursor = "";
      tooltip.remove();
    });
    instance.on("click", "municipalities", event => {
      const code = event.features?.[0]?.properties.code;
      if (typeof code === "string") listeners.current.onSelect(code);
    });
    return () => {
      tooltip.remove();
      instance.remove();
      map.current = null;
    };
  }, [snapshot]);

  useEffect(() => {
    if (!ready || !map.current?.getLayer("municipalities")) return;
    const value: ExpressionSpecification = ["get", metric];
    const valid: ExpressionSpecification = ["==", ["typeof", value], "number"];
    const inRegion: ExpressionSpecification = region === null ? ["literal", true] : ["==", ["get", "regionId"], region];
    const thematic: ExpressionSpecification = ["case",
      ["!", inRegion], "#21343d",
      ["!", valid], MISSING,
    ];
    if (threshold !== null) thematic.push(["<", ["to-number", value], threshold], "#36505a");
    for (const item of classes.slice(0, -1)) thematic.push(["<=", ["to-number", value], item.upper], item.color);
    thematic.push(classes.at(-1)?.color ?? MISSING);
    map.current.setPaintProperty("municipalities", "fill-color", thematic);
    map.current.setFilter("selected", ["==", ["get", "code"], selected?.code ?? ""]);
    map.current.setFilter("comparison", ["==", ["get", "code"], compare?.code ?? ""]);
  }, [ready, metric, classes, region, threshold, selected, compare]);

  useEffect(() => {
    if (!ready || !map.current || !selected) return;
    let bounds = selected.bounds;
    if (compare) {
      const a = selected.bounds;
      const b = compare.bounds;
      bounds = [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];
    }
    map.current.fitBounds(corners(bounds), { padding: 48, maxZoom: 8.2, duration: 650 });
  }, [ready, selected, compare]);

  return <div className="map-frame" ref={frame}>
    <div className="map-surface" ref={host} aria-label="Mapa temático dos municípios de Minas Gerais" />
    {!ready && !error && <div className="map-notice" role="status">Preparando a malha municipal…</div>}
    {error && <div className="map-notice" role="status">Mapa indisponível neste navegador. A busca e o painel analítico continuam disponíveis.</div>}
    <div className="map-context"><span className="status-dot" /> MINAS GERAIS <small>·</small> 2022</div>
    <div className="map-controls">
      <button type="button" aria-label="Aproximar mapa" title="Aproximar" disabled={!ready || error} onClick={() => map.current?.zoomIn()}><Plus size={18} /></button>
      <button type="button" aria-label="Afastar mapa" title="Afastar" disabled={!ready || error} onClick={() => map.current?.zoomOut()}><Minus size={18} /></button>
      <button type="button" aria-label="Enquadrar Minas Gerais" title="Enquadrar Minas Gerais" disabled={!ready || error} onClick={() => map.current?.fitBounds(corners(STATE_BOUNDS), { padding: 30 })}><Compass size={17} /></button>
      <button type="button" aria-label="Alternar tela cheia" title="Tela cheia" onClick={() => {
        const action = document.fullscreenElement === frame.current ? document.exitFullscreen() : frame.current?.requestFullscreen?.();
        void action?.catch(() => {});
      }}><Maximize size={17} /></button>
    </div>
    <a className="map-attribution" href="https://www.ibge.gov.br/geociencias/organizacao-do-territorio/malhas-territoriais/15774-malhas.html" target="_blank" rel="noreferrer">Malha Municipal © IBGE</a>
  </div>;
}
