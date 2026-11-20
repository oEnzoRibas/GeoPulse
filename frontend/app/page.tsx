import Link from "next/link";
import { Banknote, Building2, ChartNoAxesColumnIncreasing, Globe2, Layers3, Map, MapPin, UsersRound } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { COLORS } from "@/lib/territory";

export default function Home() {
  return <>
    <header className="site-header shell">
      <Brand />
      <nav aria-label="Navegação principal">
        <a href="#indicadores">Indicadores</a>
        <a href="#aplicacoes">Aplicações</a>
        <Link prefetch={false} href="/metodologia">Metodologia</Link>
      </nav>
      <Button asChild variant="outline"><Link prefetch={false} href="/explorar"><Map size={16} /> Explorar mapa</Link></Button>
    </header>
    <main>
      <section className="hero shell" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow"><span className="status-dot" /> INTELIGÊNCIA TERRITORIAL</p>
          <h1 id="hero-title">Entenda o território.<br /><em>Decida com dados.</em></h1>
          <p className="hero-description">Explore indicadores de Minas Gerais, compare municípios e entenda o contexto de cada região antes de tomar uma decisão comercial.</p>
          <div className="hero-actions">
            <Button asChild><Link prefetch={false} href="/explorar"><Map size={19} /> Explorar mapa interativo</Link></Button>
            <Link prefetch={false} className="secondary-link" href="/metodologia">Conhecer a metodologia</Link>
          </div>
        </div>
        <figure className="hero-map">
          <div className="hero-map-header">
            <span><Layers3 size={16} /> Minas Gerais</span>
            <span className="map-period">CENSO 2022</span>
          </div>
          <div className="hero-map-visual">
            {/* The ETL renders this preview from the same official snapshot used by the explorer. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/data/minas-densidade.webp" alt="Mapa de Minas Gerais com municípios coloridos por quintil de densidade demográfica" width={1100} height={850} fetchPriority="high" />
          </div>
          <figcaption>
            <span>Densidade demográfica</span>
            <span className="hero-scale">Menor <span className="scale-swatches">{COLORS.map(color => <i key={color} style={{ background: color }} />)}</span> Maior</span>
          </figcaption>
        </figure>
      </section>
      <div className="coverage">
        <div className="shell coverage-inner">
          <div><MapPin /><strong>853</strong><span>municípios mineiros</span></div>
          <div><Layers3 /><strong>13</strong><span>regiões intermediárias</span></div>
          <div><Globe2 /><strong>IBGE</strong><span>dados públicos oficiais</span></div>
        </div>
      </div>
      <section id="indicadores" className="shell landing-section">
        <p className="eyebrow">INDICADORES</p>
        <h2>Quatro formas de ler o território</h2>
        <p className="section-intro">Alterne a camada do mapa para investigar a população, a concentração de moradores, a extensão territorial e a atividade econômica.</p>
        <div className="indicator-grid">
          <article><UsersRound /><h3>População residente</h3><p>Dimensione o contingente de moradores e compare o porte dos municípios.</p><Link prefetch={false} href="/explorar?indicador=population">Ver população</Link></article>
          <article><ChartNoAxesColumnIncreasing /><h3>Densidade demográfica</h3><p>Compare a concentração de moradores por quilômetro quadrado.</p><Link prefetch={false} href="/explorar?indicador=density">Ver densidade</Link></article>
          <article><Map /><h3>Área territorial</h3><p>Identifique diferenças na extensão territorial entre municípios.</p><Link prefetch={false} href="/explorar?indicador=area">Ver área</Link></article>
          <article><Banknote /><h3>PIB municipal</h3><p>Compare a produção econômica total dos municípios em 2022.</p><Link prefetch={false} href="/explorar?indicador=gdp">Ver PIB</Link></article>
        </div>
      </section>
      <section id="aplicacoes" className="shell landing-section applications">
        <div><p className="eyebrow">APLICAÇÕES</p><h2>Da pergunta à comparação</h2><p className="section-intro">Experimente um recorte regional e teste um limiar para o indicador escolhido.</p></div>
        <div className="application-list">
          <article><Building2 /><div><h3>Planejar a expansão</h3><p>Monte uma lista de municípios a investigar conforme o número de moradores e a região.</p><Link prefetch={false} href="/explorar?indicador=population&amp;limiar=200000">Testar limiar de 200 mil moradores</Link></div></article>
          <article><MapPin /><div><h3>Contextualizar uma localização</h3><p>Compare densidade e área entre municípios para orientar uma pesquisa de campo.</p></div></article>
        </div>
      </section>
      <section className="shell landing-section source-section">
        <div><p className="eyebrow">DADOS E METODOLOGIA</p><h2>Da fonte ao mapa</h2><p className="section-intro">O GeoPulse cruza o Censo Demográfico 2022, o PIB dos Municípios e a Malha Municipal do IBGE pelo código oficial de cada município.</p></div>
        <Button asChild variant="outline"><Link prefetch={false} href="/metodologia">Consultar fontes e critérios</Link></Button>
      </section>
      <section className="shell landing-section last-cta">
        <h2>Minas Gerais em perspectiva</h2>
        <Button asChild><Link prefetch={false} href="/explorar"><Map size={18} /> Explorar mapa interativo</Link></Button>
      </section>
    </main>
    <footer className="shell site-footer"><Brand /><span>Projeto de portfólio · oEnzoRibas</span><Link prefetch={false} href="/metodologia">Fontes e metodologia</Link></footer>
  </>;
}
