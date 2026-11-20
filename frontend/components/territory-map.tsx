"use client";

import type { FeatureCollection, MultiPolygon, Polygon } from "geojson";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Map as LibreMap, Popup, setWorkerUrl, type ExpressionSpecification, type GeoJSONSource } from "maplibre-gl";
import { Compass, Maximize, Minus, Plus } from "lucide-react";
import { formatValue, METRICS, MISSING, STATE_BOUNDS, type Bounds, type LegendClass, type Metric } from "@/lib/territory";

interface MapLocation { code: string; name: string; bounds: Bounds }

type Geography = FeatureCollection<Polygon | MultiPolygon, MapLocation>;
const empty: Geography = { type: "FeatureCollection", features: [] };

interface Props {
  snapshot: Geography;
  surroundings?: Geography;
  notice?: ReactNode;
  followExtent?: boolean;
  metric?: Metric;
  custom?: { unit: string; label?: string };
  drillEnabled?: boolean;
  extent?: Bounds;
  context?: string;
  attribution?: { label: string; url: string };
  classes: LegendClass[];
  region: number | null;
  threshold: number | null;
  selected: MapLocation | undefined;
  compare: MapLocation | undefined;
  onSelect: (code: string, drill: boolean) => void;
  onBack?: () => void;
}

setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).toString());

const base: ExpressionSpecification = ["==", ["get", "code"], ""];
const corners = ([west, south, east, north]: Bounds): [[number, number], [number, number]] => [[west, south], [east, north]];

export function TerritoryMap({ snapshot, surroundings = empty, notice, followExtent = false, metric, custom, drillEnabled = false, extent = STATE_BOUNDS, context = "Minas Gerais · 2022", attribution, classes, region, threshold, selected, compare, onSelect, onBack }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const map = useRef<LibreMap | null>(null);
  const initialExtent = useRef(extent);
  const popup = useRef<Popup | null>(null);
  const listeners = useRef({ metric, custom, onSelect });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    listeners.current = { metric, custom, onSelect };
  }, [metric, custom, onSelect]);

  useEffect(() => {
    if (!host.current) return;
    let instance: LibreMap;
    let initialized = false;
    try {
      instance = new LibreMap({
        container: host.current,
        style: {
          version: 8,
          sources: { municipalities: { type: "geojson", data: empty }, surroundings: { type: "geojson", data: empty } },
          layers: [
            { id: "background", type: "background", paint: { "background-color": "#111c27" } },
            { id: "surrounding-fill", source: "surroundings", type: "fill", paint: { "fill-color": "#1b3039" } },
            { id: "surrounding-borders", source: "surroundings", type: "line", paint: { "line-color": "#385058", "line-width": .65, "line-opacity": .65 } },
            { id: "municipalities", source: "municipalities", type: "fill", paint: { "fill-color": "#164a47" } },
            { id: "borders", source: "municipalities", type: "line", paint: { "line-color": "#0a2227", "line-width": .6, "line-opacity": .72 } },
            { id: "comparison", source: "municipalities", type: "line", filter: base, paint: { "line-color": "#69dafa", "line-width": 2.8 } },
            { id: "selected", source: "municipalities", type: "line", filter: base, paint: { "line-color": "#e5fff5", "line-width": 2.6 } },
          ],
        },
        bounds: corners(initialExtent.current),
        fitBoundsOptions: { padding: 30 },
        maxZoom: 12,
        cooperativeGestures: true,
        attributionControl: false,
        pitchWithRotate: false,
        dragRotate: false,
        boxZoom: false,
      });
    } catch {
      setError(true);
      return;
    }
    map.current = instance;
    const tooltip = new Popup({ closeButton: false, closeOnClick: false, offset: 13, className: "map-tooltip" });
    popup.current = tooltip;

    instance.once("load", () => { initialized = true; setReady(true); setError(false); });
    instance.on("error", () => { if (!initialized) setError(true); });
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
      const key = activeMetric ?? "value";
      const value = typeof city[key] === "number" ? city[key] : null;
      const imported = listeners.current.custom;
      const content = document.createElement("div");
      content.append(title);
      if (activeMetric || imported) {
        label.textContent = value === null ? "Sem dados" : activeMetric
          ? formatValue(value, activeMetric) + " " + METRICS[activeMetric].unit
          : [value.toLocaleString("pt-BR", { maximumFractionDigits: 8 }), imported?.unit].filter(Boolean).join(" ");
        content.append(label);
      }
      tooltip.setLngLat(event.lngLat).setDOMContent(content).addTo(instance);
    });
    instance.on("mouseleave", "municipalities", () => {
      instance.getCanvas().style.cursor = "";
      tooltip.remove();
    });
    instance.on("click", "municipalities", event => {
      const code = event.features?.[0]?.properties.code;
      tooltip.remove();
      if (typeof code === "string") listeners.current.onSelect(code, event.originalEvent.shiftKey || event.originalEvent.ctrlKey);
    });
    return () => {
      tooltip.remove();
      popup.current = null;
      instance.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ready || !map.current) return;
    if (drillEnabled) map.current.boxZoom.disable();
    else map.current.boxZoom.enable();
  }, [ready, drillEnabled]);

  useEffect(() => {
    if (ready) map.current?.getSource<GeoJSONSource>("municipalities")?.setData(snapshot);
  }, [ready, snapshot]);

  useEffect(() => {
    if (ready) map.current?.getSource<GeoJSONSource>("surroundings")?.setData(surroundings);
  }, [ready, surroundings]);

  useEffect(() => {
    if (!ready || !map.current?.getLayer("municipalities")) return;
    const value: ExpressionSpecification = ["get", metric ?? "value"];
    const valid: ExpressionSpecification = ["==", ["typeof", value], "number"];
    const inRegion: ExpressionSpecification = region === null ? ["literal", true] : ["==", ["get", "regionId"], region];
    const thematic: ExpressionSpecification = ["case",
      ["!", inRegion], "#21343d",
      ["!", valid], metric || custom ? MISSING : "#285250",
    ];
    if (threshold !== null) thematic.push(["<", ["to-number", value], threshold], "#36505a");
    for (const item of classes.slice(0, -1)) thematic.push(["<=", ["to-number", value], item.upper], item.color);
    thematic.push(classes.at(-1)?.color ?? MISSING);
    map.current.setPaintProperty("municipalities", "fill-color", thematic);
    map.current.setPaintProperty("borders", "line-color", custom ? ["case", valid, "#73ddba", "#0a2227"] : "#0a2227");
    map.current.setPaintProperty("borders", "line-width", custom ? ["case", valid, 1.1, .6] : .6);
    map.current.setFilter("selected", ["==", ["get", "code"], selected?.code ?? ""]);
    map.current.setFilter("comparison", ["==", ["get", "code"], compare?.code ?? ""]);
  }, [ready, snapshot, metric, custom, classes, region, threshold, selected, compare]);

  const selectedBounds = selected?.bounds;
  const comparisonBounds = compare?.bounds;
  const [west, south, east, north] = extent;
  useEffect(() => {
    if (!ready || !map.current || (!selectedBounds && !followExtent)) return;
    let bounds: Bounds = selectedBounds ?? [west, south, east, north];
    if (selectedBounds && comparisonBounds) {
      const [a, b, c, d] = comparisonBounds;
      bounds = [Math.min(bounds[0], a), Math.min(bounds[1], b), Math.max(bounds[2], c), Math.max(bounds[3], d)];
    }
    map.current.fitBounds(corners(bounds), { padding: selectedBounds ? 48 : 30, maxZoom: 8.2, duration: 700 });
  }, [ready, followExtent, west, south, east, north, selectedBounds, comparisonBounds]);

  return <div className="map-frame" ref={frame}>
    <div className="map-surface" ref={host} aria-label={`Mapa temático: ${context}`}
      onContextMenu={event => {
        if (!onBack || event.button !== 2 || !event.ctrlKey) return;
        event.preventDefault();
        popup.current?.remove();
        onBack();
      }} />
    {!ready && !error && <div className="map-notice" role="status">Preparando o mapa…</div>}
    {error && <div className="map-notice" role="status">Mapa indisponível neste navegador. A busca e o painel analítico continuam disponíveis.</div>}
    <div className="map-context"><span className="status-dot" /><div>{context}{custom?.label && <strong className="map-indicator-name">{custom.label}</strong>}</div></div>
    {notice && <div className="map-transition-notice" role="status">{notice}</div>}
    <div className="map-controls">
      <button type="button" aria-label="Aproximar mapa" title="Aproximar" disabled={!ready || error} onClick={() => map.current?.zoomIn()}><Plus size={18} /></button>
      <button type="button" aria-label="Afastar mapa" title="Afastar" disabled={!ready || error} onClick={() => map.current?.zoomOut()}><Minus size={18} /></button>
      <button type="button" aria-label="Enquadrar recorte" title="Enquadrar recorte" disabled={!ready || error} onClick={() => map.current?.fitBounds(corners(extent), { padding: 30 })}><Compass size={17} /></button>
      <button type="button" aria-label="Alternar tela cheia" title="Tela cheia" onClick={() => {
        const action = document.fullscreenElement === frame.current ? document.exitFullscreen() : frame.current?.requestFullscreen?.();
        void action?.catch(() => {});
      }}><Maximize size={17} /></button>
    </div>
    <a className="map-attribution" href={attribution?.url ?? "https://www.ibge.gov.br/geociencias/organizacao-do-territorio/malhas-territoriais/15774-malhas.html"} target="_blank" rel="noreferrer">{attribution?.label ?? "Malha Municipal © IBGE"}</a>
  </div>;
}
