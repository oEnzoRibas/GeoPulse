import Link from "next/link";
import { Banknote, ChartNoAxesColumnIncreasing, Download, FileUp, Globe2, Layers3, Map, MapPin, UsersRound } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";


const sampleGroups = [
  {
    title: "Mundo",
    icon: Globe2,
    files: [
      { file: "paises-mundo.csv", title: "Países do mundo", scope: "Países e territórios · todos os continentes · escolha 2022 ou 2023" },
      { file: "estados-eua.csv", title: "Estados dos EUA", scope: "Estados e províncias · Estados Unidos" },
    ],
  },
  {
    title: "Brasil",
    icon: MapPin,
    files: [
      { file: "ufs-brasil.csv", title: "UFs do Brasil", scope: "Estados e províncias · Brasil" },
      { file: "municipios-minas-gerais.csv", title: "Municípios de Minas Gerais", scope: "Brasil → Minas Gerais → Municípios · modelo de tabela do TABNET" },
      { file: "distritos-belo-horizonte.csv", title: "Distritos de Belo Horizonte", scope: "Brasil → Minas Gerais → Belo Horizonte → Distritos" },
    ],
  },
];

export default function Home() {
  return <>
    <header className="site-header shell">
      <Brand />
      <nav aria-label="Navegação principal">
        <a href="#navegacao">Como explorar</a>
        <a href="#csv-exemplos">Biblioteca de CSVs</a>
        <a href="#indicadores">Indicadores de MG</a>
        <Link prefetch={false} href="/metodologia">Metodologia</Link>
      </nav>
      <Button asChild variant="outline"><Link prefetch={false} href="/explorar"><Map size={16} /> Explorar mapa</Link></Button>
    </header>
    <main>
      <section className="hero shell" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow"><span className="status-dot" /> VISUALIZAÇÃO GEOGRÁFICA</p>
          <h1 id="hero-title">Mapas para <em>a ciência.</em></h1>
          <p className="hero-description">O GeoPulse ajuda cientistas e pesquisadores a visualizar dados no território. Importe um CSV para explorar padrões espaciais, comparar regiões e apresentar seus resultados em mapas interativos.</p>
          <div className="hero-actions">
            <Button asChild><Link prefetch={false} href="/explorar"><Map size={19} /> Explorar mapa interativo</Link></Button>
            <Button asChild variant="outline"><a href="#csv-exemplos"><Download size={18} /> Baixar CSVs de teste</a></Button>
          </div>
          <p className="hero-sample-note">Quer mapear dados reais? <a href="#fontes-csv">Veja onde baixar CSVs.</a></p>
        </div>
        <figure className="hero-map">
          <div className="hero-map-header">
            <span><Globe2 size={16} /> Visão mundial</span>
            <span className="map-period">NATURAL EARTH</span>
          </div>
          <div className="hero-map-visual">
            {/* The ETL renders this preview from the same official snapshot used by the explorer. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/data/world-preview.webp" alt="Mapa-múndi com os contornos dos países e o Brasil em destaque" width={1200} height={650} fetchPriority="high" />
          </div>
          <figcaption>
            <span>Países e territórios</span>
            <span>Brasil em destaque</span>
          </figcaption>
        </figure>
      </section>
      <div className="coverage">
        <div className="shell coverage-inner">
          <div><Globe2 /><strong>242</strong><span>países e territórios na malha</span></div>
          <div><Layers3 /><strong>27</strong><span>UFs com malhas do IBGE</span></div>
          <div><MapPin /><strong>10.698</strong><span>distritos brasileiros no Censo 2022</span></div>
        </div>
      </div>
      <section id="navegacao" className="shell landing-section applications">
        <div><h2>Do país ao distrito</h2><p className="section-intro">Clique numa área para enquadrá-la e abrir seus dados. Use <kbd>Shift</kbd> ou <kbd>Ctrl</kbd> + clique para abrir as subdivisões. No celular ou pelo teclado, use o botão no painel.</p></div>
        <div className="application-list">
          <article><Layers3 /><div><h3>Navegue por níveis</h3><p>Abra o Brasil para ver as UFs. Entre em uma UF para explorar seus municípios e em um município para consultar os distritos do Censo 2022.</p></div></article>
          <article><FileUp /><div><h3>Importe um indicador</h3><p>Escolha as colunas de lugar, valor e período. Confira na prévia quais áreas receberão valores e aplique a camada.</p><Link prefetch={false} href="/metodologia#importacao">Ver formatos aceitos</Link></div></article>
        </div>
      </section>
      <section id="csv-exemplos" className="shell landing-section" aria-labelledby="csv-title">
        <h2 id="csv-title">Biblioteca de CSVs</h2>
        <p className="section-intro">Baixe um arquivo, abra o recorte indicado e vá em <strong>Dados próprios → Importar CSV</strong>. Os exemplos por recorte usam valores fictícios.</p>
        <p className="sample-real">Para testar com dados reais, baixe <a href="/data/covid-19-mundo-oms-2022.csv" download>COVID-19 por país · OMS</a> e importe no nível <strong>Países e territórios</strong>.</p>
        <p className="sample-real">Para testar no recorte municipal, baixe <a href="/data/dengue-mato-grosso-do-sul-2024-datasus.csv" download>Dengue em Mato Grosso do Sul · DATASUS</a>. O recorte nacional também está disponível. <a href="/data/dengue-brasil-2024-datasus.csv" download>Baixar dengue por município no Brasil</a></p>
        <div className="sample-library">
          {sampleGroups.map(({ title, icon: Icon, files }) => <section className="sample-group" key={title}>
            <h3><Icon size={19} /> {title}</h3>
            <ul>
              {files.map(sample => <li key={sample.file}>
                <div><strong>{sample.title}</strong><p>{sample.scope}</p></div>
                <a href={`/exemplos/${sample.file}`} download aria-label={`Baixar CSV de ${sample.title}`}><Download size={16} /> Baixar CSV</a>
              </li>)}
            </ul>
          </section>)}
        </div>
      </section>
      <section id="fontes-csv" className="shell landing-section applications" aria-labelledby="fontes-csv-title">
        <div>
          <h2 id="fontes-csv-title">Onde baixar dados reais</h2>
          <p className="section-intro">Escolha a fonte pelo recorte do mapa. Ao importar, mantenha uma linha por área para o período escolhido e selecione a coluna do código geográfico e a do valor.</p>
        </div>
        <div className="application-list">
          <article><Globe2 /><div><h3>Banco Mundial · Países</h3><p>Baixe o CSV de um indicador e extraia a tabela do ZIP. Mantenha o cabeçalho com <strong>Country Code</strong> na primeira linha e escolha a coluna do ano que quer mapear.</p><a href="https://data.worldbank.org/indicator/SP.POP.TOTL">Abrir população por país</a></div></article>
          <article><MapPin /><div><h3>DATASUS TabNet · Saúde municipal</h3><p>Escolha uma UF e tabule por município de residência. No fim da tabela, use <strong>COPIA COMO .CSV</strong>. Se os códigos do CSV forem de uma única UF, o GeoPulse abre o recorte municipal automaticamente.</p><a href="https://datasus.saude.gov.br/mortalidade-desde-1996-pela-cid-10/">Abrir tabelas de mortalidade</a></div></article>
          <article><Layers3 /><div><h3>IBGE SIDRA · População e território</h3><p>Selecione municípios e o indicador desejado. Ao exportar, inclua o código IBGE para associar os valores no mapa.</p><a href="https://sidra.ibge.gov.br/tabela/4714">Abrir a tabela 4714</a></div></article>
        </div>
      </section>
      <section id="indicadores" className="shell landing-section">
        <p className="eyebrow">MINAS GERAIS · 2022</p>
        <h2>Compare os 853 municípios mineiros</h2>
        <p className="section-intro">Alterne a camada do mapa para investigar a população, a concentração de moradores, a extensão territorial e a atividade econômica.</p>
        <div className="indicator-grid">
          <article><UsersRound /><h3>População residente</h3><p>Dimensione o contingente de moradores e compare o porte dos municípios.</p><Link prefetch={false} href="/explorar?indicador=population">Ver população</Link></article>
          <article><ChartNoAxesColumnIncreasing /><h3>Densidade demográfica</h3><p>Compare a concentração de moradores por quilômetro quadrado.</p><Link prefetch={false} href="/explorar?indicador=density">Ver densidade</Link></article>
          <article><Map /><h3>Área territorial</h3><p>Identifique diferenças na extensão territorial entre municípios.</p><Link prefetch={false} href="/explorar?indicador=area">Ver área</Link></article>
          <article><Banknote /><h3>PIB municipal</h3><p>Compare a produção econômica total dos municípios em 2022.</p><Link prefetch={false} href="/explorar?indicador=gdp">Ver PIB</Link></article>
        </div>
      </section>

      <section className="shell landing-section source-section">
        <div><p className="eyebrow">DADOS E METODOLOGIA</p><h2>Da fonte ao mapa</h2><p className="section-intro">As malhas vêm do Natural Earth, do IBGE e do geoBoundaries. Consulte a cobertura, as regras de correspondência do CSV e o cálculo das classes de cor.</p></div>
        <Button asChild variant="outline"><Link prefetch={false} href="/metodologia">Consultar fontes e critérios</Link></Button>
      </section>
      <section className="shell landing-section last-cta">
        <h2>Explore seus dados de pesquisa no mapa</h2>
        <Button asChild><Link prefetch={false} href="/explorar"><Map size={18} /> Explorar mapa interativo</Link></Button>
      </section>
    </main>
    <footer className="shell site-footer"><Brand /><span>Projeto de portfólio · oEnzoRibas</span><Link prefetch={false} href="/metodologia">Fontes e metodologia</Link></footer>
  </>;
}
