import Link from "next/link";
import type { Metadata } from "next";
import { Map } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { GDP_SOURCE, LOCALITIES, MESH, SOURCE } from "@/lib/territory";

export const metadata: Metadata = { title: "Metodologia e fontes" };

export default function Methodology() {
  return <>
    <header className="site-header shell"><Brand /><Button asChild variant="outline"><Link prefetch={false} href="/explorar"><Map size={16} /> Explorar mapa</Link></Button></header>
    <main className="shell methodology">
      <p className="eyebrow">MINAS GERAIS · CENSO 2022</p>
      <h1>Metodologia e fontes</h1>
      <p className="section-intro">A base cobre os 853 municípios mineiros. Cada observação é associada à malha pelo código municipal de sete dígitos do IBGE.</p>
      <section id="fontes"><h2>Fontes de dados</h2>
        <ul>
          <li>População residente, área territorial e densidade demográfica em 2022. <a href={SOURCE}>IBGE · SIDRA, tabela 4714</a></li>
          <li>Produto Interno Bruto municipal a preços correntes em 2022, em milhares de reais. <a href={GDP_SOURCE}>IBGE · SIDRA, tabela 5938</a></li>
          <li>Limites municipais da edição de 2022. A geometria foi simplificada em projeção métrica com preservação de fronteiras compartilhadas para visualização em tela. <a href={MESH}>IBGE · Malha Municipal 2022</a></li>
          <li>Classificação dos municípios em regiões geográficas intermediárias usada no filtro regional. <a href={LOCALITIES}>IBGE · API de Localidades</a></li>
        </ul>
      </section>
      <section><h2>Como ler as cores</h2>
        <p>O mapa usa quintis dos valores municipais disponíveis. Os pontos de corte são obtidos por interpolação linear nos percentis 20, 40, 60 e 80. Cada classe inclui seu limite superior. Pontos de corte repetidos são reunidos, por isso alguns recortes podem apresentar menos de cinco classes.</p>
        <p>Os quintis são recalculados ao mudar o indicador ou a região. Consulte a legenda ao comparar mapas. Cinza indica ausência de dados. Municípios fora da região e abaixo do limiar recebem tratamento visual próprio.</p>
      </section>
      <section><h2>Contagens, medidas e taxas</h2>
        <p>População é uma contagem em pessoas. Área é uma medida em km². Densidade é uma taxa em habitantes por km². As três variáveis usam os valores publicados pelo IBGE em 2022. O PIB mede a produção econômica dentro do município e é expresso em milhares de reais a preços correntes. A área informada na tabela é preservada em todas as visualizações.</p>
      </section>
      <section><h2>Comparação e simulação</h2>
        <p>O gráfico usa o mesmo indicador, unidade e ano para todos os municípios exibidos. O limiar destaca valores maiores ou iguais ao valor escolhido na região ativa e preserva as classes da legenda. Ele serve para testar um critério de triagem, com os valores originais visíveis no painel.</p>
      </section>
      <section><h2>Limites de interpretação</h2>
        <p>Os resultados são municipais e representam o recorte de 2022. Médias municipais ocultam variações entre bairros. Fluxo de pessoas, concorrência, renda, custos, zoneamento e localização de estabelecimentos exigem outras fontes. Use a análise para orientar investigações comerciais e combine-a com dados locais.</p>
      </section>
    </main>
    <footer className="shell site-footer"><Brand /><span>Projeto de portfólio · oEnzoRibas</span></footer>
  </>;
}
