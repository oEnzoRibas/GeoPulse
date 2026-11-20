"use client";

import { useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { stateAbbreviation } from "@/lib/administrative";
import { matchRows, municipalityState, tabnetTable, type ImportedLayer } from "@/lib/import-layer";
import { normalize } from "@/lib/territory";

type Locations = Parameters<typeof matchRows>[1];
const municipalCodeHeading = /^(?:codigo[ _-]+)?ibge(?:[ _-]+(?:municipio|municipal))?$/;
const municipalNameHeading = /^(?:nome[ _-]+(?:do[ _-]+)?)?municipio(?:$|[ _-])/;
const ibgeIdentifier = /^(?:codigo[ _-]+)?ibge(?:[ _-]+(?:municipio|municipal|distrito))?$/;

interface Props {
  locations: Locations;
  currentState?: string;
  onUseState: (state: string) => Promise<void>;
  onApply: (layer: ImportedLayer) => void;
}

export function CsvImport({ locations, currentState, onUseState, onApply }: Props) {
  const fileVersion = useRef(0);
  const [table, setTable] = useState<string[][]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [geo, setGeo] = useState(0);
  const [value, setValue] = useState(1);
  const [time, setTime] = useState(-1);
  const [period, setPeriod] = useState("");
  const [decimal, setDecimal] = useState<"." | ",">(".");
  const [label, setLabel] = useState("");
  const [unit, setUnit] = useState("");
  const [source, setSource] = useState("");
  const [header = [], ...rows] = table;

  const headings = header.map(normalize);
  const municipalCode = headings.findIndex(name => municipalCodeHeading.test(name));
  const useMunicipalCode = municipalCode >= 0 && municipalNameHeading.test(headings[geo] ?? "");
  const lookupGeography = useMunicipalCode ? municipalCode : geo;
  const whoCodeColumn = headings.indexOf("dim_geo_code_m49");
  const whoNameColumn = headings.indexOf("geo_name_short");
  const whoAlternate = geo === whoNameColumn ? whoCodeColumn : geo === whoCodeColumn ? whoNameColumn : -1;
  const lookupHeading = header[lookupGeography] ?? "";
  const periods = useMemo(() => time < 0 ? [] : [...new Set(table.slice(1).map(row => row[time]?.trim()).filter(Boolean))].sort(), [table, time]);
  const preview = useMemo(() => {
    if (!table.length || value < 0 || geo === value || time === geo || time === value || (time >= 0 && !period)) return null;
    const fallback = useMunicipalCode ? { column: geo, onlyWhenBlank: true } : { column: whoAlternate };
    return matchRows(table.slice(1), locations, lookupGeography, value, time, period, decimal, fallback);
  }, [table, locations, geo, value, time, period, decimal, useMunicipalCode, whoAlternate, lookupGeography]);

  const detectedState = useMemo(() => municipalityState(table.slice(1), lookupGeography, lookupHeading), [table, lookupGeography, lookupHeading]);
  const suggestedState = currentState === detectedState ? undefined : stateAbbreviation(detectedState);

  async function openSuggestedState(state: string) {
    setError("");
    setSwitching(true);
    try {
      await onUseState(state);
    } catch {
      setError("Não foi possível carregar os municípios desta UF. Tente novamente.");
    } finally {
      setSwitching(false);
    }
  }

  async function read(file: File | undefined) {
    const version = ++fileVersion.current;
    setError("");
    setTable([]);
    setLoading(false);
    if (!file) return;
    if (file.size > 10_000_000) { setError("Escolha um CSV de até 10 MB."); return; }
    setLoading(true);
    try {
      const bytes = await file.arrayBuffer();
      const decoded = new TextDecoder().decode(bytes);
      const text = decoded.includes("\ufffd") ? new TextDecoder("windows-1252").decode(bytes) : decoded;
      const tabnet = tabnetTable(text);
      const delimiters = [",", ";", "\t"];
      const parse = (input: string, delimiter?: string, preview = 0) => Papa.parse<string[]>(input, {
        skipEmptyLines: "greedy", delimitersToGuess: delimiters, delimiter, preview,
      });
      let parsed = tabnet ? parse(tabnet.table, ";") : parse(text);
      if (parsed.errors.some(item => item.code === "UndetectableDelimiter")) {
        const probes = delimiters.map(delimiter => ({ delimiter, score: parse(text, delimiter, 30).data.filter(row => row.length > 1).length }));
        const best = probes.sort((a, b) => b.score - a.score)[0];
        if (best.score) parsed = parse(text, best.delimiter);
      }
      if (version !== fileVersion.current) return;
      // TABNET exports can start with prose before the delimited table.
      const headerIndex = parsed.data.findIndex(row => row.length > 1 && row.filter(cell => cell.trim()).length > 1);
      if (parsed.errors.some(item => item.type === "Quotes") || headerIndex < 0 || parsed.data.length <= headerIndex + 1) {
        setError("O CSV precisa de um cabeçalho e ao menos uma linha com duas colunas.");
        return;
      }
      const [columns, ...body] = parsed.data.slice(headerIndex);
      const headings = columns.map(normalize);
      const whoCode = headings.indexOf("dim_geo_code_m49");
      const whoGeography = whoCode >= 0 ? whoCode : headings.indexOf("geo_name_short");
      const whoType = headings.indexOf("dim_geo_code_type");
      const whoTime = headings.indexOf("dim_time");
      const who = whoGeography >= 0 && whoTime >= 0;
      const records = who && whoType >= 0 ? body.filter(row => normalize(row[whoType] ?? "") === "country") : body;
      if (!records.length) {
        setError("Nenhuma linha por país encontrada no arquivo da OMS.");
        return;
      }
      const ibgeCode = headings.findIndex(name => municipalCodeHeading.test(name));
      const preferredGeography = whoGeography >= 0 ? whoGeography : ibgeCode;
      const geography = preferredGeography >= 0 ? preferredGeography : Math.max(0, headings.findIndex(name => /ibge|municip|iso|pais|estado|territorio|regiao/.test(name)));
      const periodIndex = who ? whoTime : headings.findIndex(name => /^(ano|periodo|year|period)$/.test(name));
      const numericWho = headings.findIndex(name => /^(rate_per_\d+_n|obs_value|numeric_value|number_n)$/.test(name));
      const available = headings.flatMap((name, index) => index !== geography && index !== periodIndex && !ibgeIdentifier.test(name) ? [index] : []);
      const sample = records.slice(0, 100);
      const numericColumn = available.find(index => {
        const values = sample.map(row => row[index]?.trim() ?? "").filter(Boolean);
        return values.length > 0 && values.filter(value => /^[+-]?\d+(?:[.,]\d+)*$/.test(value)).length >= values.length * .8;
      });
      const valueIndex = who && numericWho >= 0 ? numericWho : numericColumn ?? available[0] ?? -1;
      const whoLabel = who ? records[0][headings.indexOf("ind_name")]?.trim() ?? "" : "";
      setGeo(geography);
      setValue(valueIndex);
      setTime(periodIndex);
      const recordedPeriods = periodIndex < 0 ? [] : records.map(row => row[periodIndex]?.trim()).filter(Boolean);
      setPeriod(periodIndex < 0 ? tabnet?.period?.slice(0, 60) ?? "" : (who ? recordedPeriods.sort().at(-1) : recordedPeriods[0]) ?? "");
      setDecimal(parsed.meta.delimiter === ";" ? "," : ".");
      setLabel(whoLabel.slice(0, 90));
      setUnit(headings[valueIndex] === "rate_per_100_n" ? "%" : "");
      setSource(who ? "OMS · WHO Data" : tabnet?.source?.slice(0, 160) ?? "");
      setTable([columns, ...records]);
      const fileState = municipalityState(records, geography, columns[geography] ?? "");
      if (fileState && fileState !== currentState && stateAbbreviation(fileState)) {
        await openSuggestedState(fileState);
      }
    } catch {
      if (version === fileVersion.current) setError("Não foi possível ler o arquivo.");
    } finally {
      if (version === fileVersion.current) setLoading(false);
    }
  }

  const options = header.map((name, index) => <option value={index} key={index}>{name.trim() || `Coluna ${index + 1}`}</option>);
  return <div className="csv-fields">
    <label>Arquivo CSV<input type="file" disabled={switching} accept=".csv,.tsv,text/csv,text/tab-separated-values" onChange={event => void read(event.target.files?.[0])} /></label>
    <p className="field-note">Use códigos ISO, nomes reconhecidos ou códigos IBGE de 6 ou 7 dígitos na camada municipal. O arquivo é lido no navegador.</p>
    {loading && <p role="status">Lendo arquivo…</p>}
    {error && <p role="alert">{error}</p>}
    {!!rows.length && <>
      {suggestedState && detectedState && <div className="csv-preview">
        <span>Os códigos do arquivo são de municípios de {suggestedState}.</span>
        <Button type="button" variant="outline" disabled={switching} onClick={() => void openSuggestedState(detectedState)}>
          {switching ? `Carregando municípios de ${suggestedState}…` : `Abrir municípios de ${suggestedState}`}
        </Button>
      </div>}
      <label>Coluna geográfica<select value={geo} onChange={event => setGeo(+event.target.value)}>{options}</select></label>
      {whoAlternate >= 0 && <p className="field-note">Para reconhecer países da OMS, o GeoPulse pode combinar o nome e o código M49.</p>}
      {useMunicipalCode && <p className="field-note">O código IBGE identifica o município e ajuda a evitar confusão entre nomes iguais.</p>}
      <label>Coluna de valor<select value={value} onChange={event => setValue(+event.target.value)}>
        <option value={-1} disabled>Selecione</option>{options.filter((_, index) => !ibgeIdentifier.test(headings[index]))}
      </select></label>
      <label>Separador decimal<select value={decimal} onChange={event => setDecimal(event.target.value as "." | ",")}><option value=".">Ponto (12.5)</option><option value=",">Vírgula (12,5)</option></select></label>
      <label>Coluna de período<select value={time} onChange={event => { setTime(+event.target.value); setPeriod(""); }}><option value={-1}>Informar manualmente</option>{options}</select></label>
      {time >= 0 ? <label>Período<select value={period} onChange={event => setPeriod(event.target.value)}><option value="">Selecione</option>{periods.map(item => <option key={item}>{item}</option>)}</select></label>
        : <label>Período (opcional)<input value={period} maxLength={60} onChange={event => setPeriod(event.target.value)} placeholder="Ex.: 2022" /></label>}
      <label>Nome do indicador<input value={label} maxLength={90} placeholder={header[value]?.trim() || "Indicador do CSV"} onChange={event => setLabel(event.target.value)} /></label>
      <div className="csv-fields"><label>Unidade (opcional)<input value={unit} maxLength={40} onChange={event => setUnit(event.target.value)} /></label><label>Fonte (opcional)<input value={source} maxLength={160} onChange={event => setSource(event.target.value)} /></label></div>
      {switching ? <p role="status">Preparando o recorte municipal…</p> : preview ? <div role="status" className="csv-preview">
        <strong>{preview.values.size.toLocaleString("pt-BR")} áreas com valor</strong>
        <span>{preview.rejected.geography} sem correspondência · {preview.rejected.number} inválidos · {preview.rejected.missing} vazios</span>
        {!!preview.examples.length && <span>Chaves não associadas: {preview.examples.join(", ")}</span>}
        {!!preview.rejected.duplicate && <span title="Duplicatas precisam ser agregadas na origem">Há {preview.rejected.duplicate} linhas duplicadas. Deixe um valor por área no período escolhido.</span>}
      </div> : <p role="status">Escolha colunas distintas e selecione o período, quando houver.</p>}
      <Button type="button" disabled={switching || !preview?.values.size || !!preview.rejected.duplicate} onClick={() => {
        if (!preview) return;
        onApply({ label: label.trim() || header[value]?.trim() || "Indicador do CSV", unit: unit.trim(), period: period.trim(), source: source.trim(), values: preview.values });
      }}>Aplicar ao mapa</Button>
    </>}
  </div>;
}
