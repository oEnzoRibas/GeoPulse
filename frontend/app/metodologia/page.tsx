import Link from "next/link";
import type { Metadata } from "next";
import { Map } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { GDP_SOURCE, LOCALITIES, MESH, SOURCE } from "@/lib/territory";

export const metadata: Metadata = {
  title: "Metodologia e fontes",
  description: "Entenda a cobertura das malhas, a importação de CSV e os critérios usados para colorir o mapa do GeoPulse.",
};

const districts = "https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_de_setores_censitarios__divisoes_intramunicipais/censo_2022/distritos/shp/BR/";

export default function Methodology() {
  return <>
    <header className="site-header shell"><Brand /><Button asChild variant="outline"><Link prefetch={false} href="/explorar"><Map size={16} /> Explorar mapa</Link></Button></header>
    <main className="shell methodology">
      <h1>Metodologia e fontes</h1>
      <p className="section-intro">O GeoPulse apoia a exploração e a comunicação de dados em pesquisas científicas. Ele associa indicadores a limites administrativos e acompanha cada camada importada com as informações de fonte, período e unidade fornecidas pelo pesquisador.</p>
      <nav aria-label="Seções da metodologia" className="methodology-nav">
        <a href="#fontes">Malhas e cobertura</a><a href="#importacao">Importação de CSV</a><a href="#cores">Escala de cores</a><a href="#indicadores">Indicadores de MG</a>
      </nav>
      <section id="fontes">
        <h2>Malhas e cobertura</h2>
        <ul>
          <li><strong>Países e subdivisões de primeiro nível.</strong> O Natural Earth fornece os países e territórios em escala de 1:50 milhões e os estados e províncias em 1:10 milhões. Os limites seguem a representação do fornecedor. <a href="https://www.naturalearthdata.com/about/">Natural Earth</a></li>
          <li><strong>Municípios e distritos brasileiros.</strong> Os municípios das outras UFs são consultados no IBGE sob demanda. Minas Gerais usa o recorte municipal de 2022 para manter os códigos alinhados aos indicadores. Os distritos de todo o Brasil vêm da malha do Censo 2022 e são associados pelo código do município. <a href={MESH}>IBGE · Malha Municipal</a> · <a href={districts}>IBGE · Distritos do Censo 2022</a></li>
          <li><strong>Divisões em outros países.</strong> O GeoPulse consulta o geoBoundaries para os níveis disponíveis e usa um ponto representativo de cada polígono para associá-lo à área superior. As fontes podem ter limites e datas diferentes, especialmente em áreas de fronteira. A nomenclatura, a cobertura e a profundidade da hierarquia variam por país. <a href="https://www.geoboundaries.org/api.html">geoBoundaries · API e fontes</a></li>
        </ul>
      </section>
      <section id="importacao">
        <h2>Importação de CSV</h2>
        <p>Escolha o nível, o recorte e as colunas de lugar e valor. Países e estados podem ser associados pelos códigos reconhecidos na malha ou pelo nome. Os municípios brasileiros aceitam o código IBGE de seis ou sete dígitos. Para os distritos brasileiros, use o código IBGE de nove dígitos.</p>
        <p>Quando os códigos municipais pertencem a uma única UF, o mapa abre os municípios da UF automaticamente. Se a tabela tiver apenas nomes de municípios, abra a UF antes de importar. No recorte estadual do Brasil, o importador também aceita siglas como MG, MS e MT.</p>
        <p>O importador aceita arquivos de até 10 MB, separados por vírgula, ponto e vírgula ou tabulação. Se houver mais de um período, selecione o período desejado e use um valor por área. A prévia mostra correspondências, valores ausentes, valores inválidos e duplicatas.</p>
        <p>O CSV é processado no navegador. A camada fica vinculada ao recorte durante a sessão. A unidade, a fonte e o período informados aparecem na legenda. Calcule taxas ou agregações antes da importação.</p>
      </section>
      <section id="cores">
        <h2>Como ler as cores</h2>
        <p>Os quintis usam os valores válidos no recorte. Os pontos de corte vêm da interpolação linear nos percentis 20, 40, 60 e 80. Cada classe inclui seu limite superior. Cortes repetidos são reunidos, então alguns recortes têm menos de cinco classes.</p>
        <p>Consulte a legenda ao comparar mapas, pois os limites mudam com o indicador ou o recorte. Cinza indica ausência de dados. Um zero informado conta como valor válido.</p>
      </section>
      <section id="indicadores">
        <h2>Indicadores de Minas Gerais</h2>
        <ul>
          <li>População residente em pessoas, área territorial em km² e densidade demográfica em habitantes por km². <a href={SOURCE}>IBGE · SIDRA, tabela 4714</a></li>
          <li>PIB municipal a preços correntes, em milhares de reais. <a href={GDP_SOURCE}>IBGE · SIDRA, tabela 5938</a></li>
          <li>Regiões geográficas intermediárias usadas no filtro regional. <a href={LOCALITIES}>IBGE · API de Localidades</a></li>
        </ul>
        <p>O GeoPulse associa os indicadores à malha dos 853 municípios mineiros pelo código IBGE de sete dígitos. A área oficial vem da tabela do IBGE. A geometria foi simplificada em projeção métrica, preservando as fronteiras municipais compartilhadas.</p>
        <p>O painel compara valores com a mesma unidade e ano. Um limiar destaca os municípios que atingem o valor definido e preserva as classes da legenda. Médias municipais podem ocultar diferenças entre bairros. <Link prefetch={false} href="/explorar?modo=mg">Abrir indicadores de Minas Gerais</Link></p>
      </section>
    </main>
    <footer className="shell site-footer"><Brand /><span>Projeto de portfólio · oEnzoRibas</span></footer>
  </>;
}
