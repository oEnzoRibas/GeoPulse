# Visualizador mundial e importação de CSV

O GeoPulse ajuda cientistas e pesquisadores a explorar e comunicar dados que têm uma dimensão geográfica. O mapa usa polígonos de países, estados, municípios e distritos. Um CSV acrescenta um indicador ao recorte que você escolheu. Cada linha é associada a uma área por código ou nome. Para esse fluxo, bastam uma coluna geográfica e uma coluna de valor.

## Navegar pelo mapa

1. Abra o **Visualizador mundial** em `/explorar`.
2. Escolha o **Nível geográfico**. Em **Países e territórios**, o filtro **Continente** define quais países aparecem. Em **Estados e províncias**, escolha o **País ou território**. No Brasil, abra a UF para ver seus municípios.
3. Clique em uma área ou use **Buscar lugar** para enquadrá-la e ver seus dados. Use **Shift + clique** ou **Ctrl + clique** para abrir o próximo nível com foco na área. No celular ou pelo teclado, selecione a área e use o botão do painel, como **Ver municípios**.
4. Ao abrir subdivisões, a câmera aproxima a área selecionada e os territórios ao redor ficam atenuados no mesmo mapa.
5. Use **Ctrl + botão direito** no mapa ou **Voltar um nível** para retornar ao recorte anterior. **Enquadrar recorte** restaura a vista do nível atual.

| Nível | Cobertura | Chave recomendada no CSV |
| --- | --- | --- |
| Países e territórios | 242 áreas na malha mundial Natural Earth | Código ISO de duas ou três letras, se disponível, como `BR` ou `BRA` |
| Estados e províncias | 4.596 subdivisões na malha de origem, consultadas por país | ISO 3166-2, como `BR-MG`. No recorte de UFs do Brasil, `MG` também funciona. |
| Municípios do Brasil | Todas as UFs via IBGE. Minas Gerais usa o snapshot de 853 municípios de 2022. | Código IBGE de seis ou sete dígitos, como `310620` ou `3106200` para Belo Horizonte |
| Distritos brasileiros | 10.698 distritos na malha do Censo 2022, consultados por município | Código IBGE do distrito com nove dígitos |
| Divisões locais fora do Brasil | Níveis ADM2 a ADM5, conforme a cobertura do geoBoundaries | Código da malha, ISO quando disponível ou nome reconhecido dentro da área |

Os códigos internos do Natural Earth e os nomes reconhecidos pela malha também podem ser usados. A correspondência por nome ignora acentos e diferenças entre maiúsculas e minúsculas. Quando um nome puder identificar mais de uma área, use o código. A navegação internacional carrega as malhas do geoBoundaries sob demanda e associa as divisões ao recorte superior usando um ponto representativo de cada polígono. A cobertura, o ano e as divisões variam por país. O painel informa quando não há subdivisões para um recorte e exibe a fonte e licença quando fornecidas. [geoBoundaries · API](https://www.geoboundaries.org/api.html) [Natural Earth · Países](https://www.naturalearthdata.com/downloads/50m-cultural-vectors/) · [Natural Earth · Estados e províncias](https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-1-states-provinces/)

O modo **Indicadores de Minas Gerais** (`/explorar?modo=mg`) continua disponível para consultar e comparar população, densidade, área e PIB de 2022. As novas camadas de CSV são abertas pelo visualizador mundial, inclusive no nível municipal. [Fontes municipais no README](../README.md#regenerar-a-base-oficial)

## Preparar e importar um CSV

Use um arquivo de até **10 MB**, com cabeçalho e um valor por área no período analisado. O importador aceita vírgula, ponto e vírgula ou tabulação como delimitador. A leitura tenta UTF-8 e, se encontrar caracteres de substituição, tenta Windows-1252. Para valores decimais, confirme se o formato é `12.5` ou `12,5`. Use aspas em campos que contenham o próprio delimitador.

1. Para arquivos de municípios brasileiros com códigos IBGE de uma única UF, você pode começar na visão mundial. Nos demais casos, escolha o nível geográfico e o recorte correspondente. Em **Dados próprios**, clique em **Importar CSV**.
2. Selecione o arquivo e confira as colunas de **geografia** e **valor**. A coluna geográfica pode conter um código, um nome reconhecido ou um rótulo municipal como `310620 Belo Horizonte`.
3. Se cada linha traz um ano ou outro período, escolha a **Coluna de período** e selecione um período da lista. Se o arquivo inteiro já corresponde a um único período, você pode informá-lo manualmente. O período manual aparece na legenda e serve como rótulo.
4. Confira o nome do indicador e, se for útil, informe a unidade e a fonte. Revise os totais da prévia e clique em **Aplicar ao mapa**.

| Resultado na prévia | O que verificar |
| --- | --- |
| Sem correspondência | Confirme a escala, o país, os códigos ou os nomes. Uma linha de total do exportador também pode aparecer aqui. |
| Inválidos | Confira o separador decimal e remova símbolos de moeda, percentuais escritos com `%` e textos da coluna numérica. Informe a unidade no campo próprio. |
| Vazios | Campos em branco e marcadores como `-`, `...` e `N/A` representam ausência. O valor `0` é mantido e pode entrar na escala de cores. |
| Linhas duplicadas | Prepare um valor numérico por área e período antes de aplicar. A agregação depende do indicador. Por exemplo, some contagens aditivas ou recalcule uma taxa a partir dos totais do numerador e do denominador. |

A prévia avalia as correspondências no nível escolhido e informa o saldo antes de aplicar. O mapa mostra a cobertura no recorte visível. Por isso, ao filtrar por continente ou região intermediária, o total de áreas com valor na legenda pode ser menor que o da prévia.

Para importar o CSV de cobertura vacinal DTP3 da OMS, abra **Países e territórios**. Você pode usar `GEO_NAME_SHORT` ou `DIM_GEO_CODE_M49` como coluna geográfica. Quando ambas existem, o importador consulta a outra coluna se a primeira não identificar um país. O valor vem de `RATE_PER_100_N` e o ano de `DIM_TIME`. O campo `DIM_GEO_CODE_TYPE` identifica as linhas por país. [OMS · Indicador de cobertura DTP3](https://data.who.int/indicators/i/F8E084C)

### Importação por município

O GeoPulse usa os dois primeiros dígitos dos códigos municipais IBGE de seis ou sete dígitos para identificar a UF. Quando todos os códigos do arquivo apontam para uma única UF, o mapa abre esse recorte e mantém o arquivo na prévia. Você pode usar a coluna `codigo_ibge` diretamente ou selecionar a coluna de nomes dos municípios. Quando o arquivo traz as duas colunas, o código tem prioridade para evitar associações entre cidades de mesmo nome. O código IBGE identifica a área e fica fora das opções de valor.

Se o CSV tiver apenas nomes de cidades, abra a UF pelo mapa antes de importar. Se tiver códigos de municípios de várias UFs, filtre por UF na planilha e importe o recorte desejado. Para mapear um indicador estadual, escolha **Estados e províncias → Brasil** e use siglas como `MS` e `MT` ou códigos como `BR-MS` e `BR-MT`.

### Exemplos de estrutura

Para baixar arquivos completos e ver em qual recorte importar cada exemplo, consulte a [lista de CSVs de exemplo](../README.md#csvs-de-exemplo).

Países, com código ISO e decimal com ponto:

```csv
iso,valor,ano
BRA,12.5,2022
ARG,9.8,2022
BRA,13.2,2023
```

Estados, com o Brasil selecionado:

```csv
estado;valor
BR-MG;12,5
BR-SP;9,8
```

Os números desses exemplos são fictícios. Escolha o período correspondente ao indicador que quer visualizar.

## Exemplos com o DATASUS

### Dengue de 2024

1. Baixe o [CSV de Mato Grosso do Sul](../frontend/public/data/dengue-mato-grosso-do-sul-2024-datasus.csv?raw=true). Você também pode baixá-lo na **Biblioteca de CSVs** da página inicial.
2. Importe o arquivo no visualizador mundial. O mapa irá para Mato Grosso do Sul e a prévia deverá mostrar **79 áreas com valor**.
3. Use `codigo_ibge` ou `Município de residência` como geografia, `Casos prováveis de dengue` como valor e `ano` como período. Após aplicar, busque **Campo Grande** para conferir o valor de **779 casos**.

Para reproduzir a extração, abra o TabNet nacional de dengue no SINAN. Selecione **Município de residência** na linha, mantenha a coluna desativada, escolha **Casos Prováveis** como conteúdo e selecione **2024**. O recorte segue a notificação por semana epidemiológica e usa o município de residência. Para gerar os CSVs, foram mantidas as linhas com código de município e excluídos 27 casos nas linhas de município ignorado ou exterior. Municípios ausentes da tabela ficam sem valor no mapa. [Consulta nacional no DATASUS](https://tabnet.datasus.gov.br/cgi/deftohtm.exe?sinannet/cnv/denguebbr.def) · [CSV nacional](../frontend/public/data/dengue-brasil-2024-datasus.csv?raw=true)

### Mortalidade geral

1. No TABNET, abra **Mortalidade geral** e consulte Minas Gerais para 2022. Tabule os óbitos pelo **município de residência** se a pergunta for sobre os residentes de cada município. A tabulação por ocorrência responde em que município o óbito ocorreu. Exporte a tabela em CSV. [DATASUS · Mortalidade geral](https://datasus.saude.gov.br/mortalidade-desde-1996-pela-cid-10/)
2. No GeoPulse, abra **Importar CSV** e selecione o arquivo. Se os códigos pertencerem a uma única UF fora do recorte atual, o mapa abre os municípios da UF automaticamente e mantém o arquivo na prévia. Mapeie o município para **Coluna geográfica** e o total de óbitos para **Coluna de valor**. O importador aproveita as linhas de período e fonte do TabNet quando estão presentes e retira a linha Total da análise municipal. Se o período não vier no arquivo, preencha-o manualmente. Use **óbitos** como unidade para mapear a contagem.

Um arquivo preparado para visualizar **taxas** pode ter esta estrutura, com números fictícios:

```csv
codigo_ibge;ano;taxa_por_mil
310620;2022;12,5
311860;2022;9,8
310620;2023;12,1
```

Para montar a coluna de taxa, divida o número de óbitos de residentes pela população residente do mesmo município e ano, e multiplique por 1.000. Faça o cálculo antes de importar. A contagem descreve o volume e a taxa bruta permite comparar municípios de tamanhos diferentes. A composição etária também influencia a taxa bruta. [IBGE · População residente](https://sidra.ibge.gov.br/tabela/4714)

## Ler e trocar a camada

A legenda mostra o indicador, a cobertura, a unidade, o período e a fonte informados. Os quintis partem dos valores válidos do recorte visível. Empates nos cortes podem resultar em menos de cinco classes. Ao mudar o recorte, confira os limites das classes antes de comparar cores entre mapas. As áreas em cinza aparecem como **Sem dados**.

Clique em uma área para ver seu valor. Sem uma área selecionada, o painel mostra até oito dos maiores valores visíveis. Use **Remover camada importada** para limpar a visualização ou aplique um novo arquivo para substituir a camada.

O arquivo é processado no navegador. A camada fica em memória, vinculada ao nível e à área usados na importação. Voltar ao recorte recupera a camada da sessão. Recarregar a página ou sair do visualizador encerra a sessão. Os filtros de continente e de região intermediária recalculam o recorte da camada aplicada.

## Atualizar as malhas

Países e subdivisões são arquivos GeoJSON estáticos servidos pelo frontend. A malha municipal de Minas Gerais vem do snapshot do IBGE ou da API configurada em `NEXT_PUBLIC_API_URL`. Para as demais UFs, o navegador consulta as APIs de Malhas e Localidades do IBGE. Os distritos do Censo 2022 são servidos em arquivos estáticos por UF e podem ser regenerados com `python scripts/build_districts.py`. Os níveis internacionais adicionais requerem acesso ao geoBoundaries e aos arquivos de malha que seu catálogo indicar. A importação em si roda no navegador. [IBGE · Distritos do Censo 2022](https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_de_setores_censitarios__divisoes_intramunicipais/censo_2022/distritos/shp/BR/)

A partir da raiz do repositório, regenere as camadas Natural Earth com os comandos abaixo. O script usa os países em escala 1:50 milhões e as subdivisões de primeiro nível em escala 1:10 milhões. O argumento `--cache` permite reutilizar os arquivos brutos baixados.

```sh
python -m pip install -r scripts/requirements.txt
python scripts/build_world.py
```

A malha global é distribuída pelo Natural Earth em domínio público. A malha municipal e os indicadores de Minas Gerais são atribuídos ao IBGE. [Termos do Natural Earth](https://www.naturalearthdata.com/about/terms-of-use/) · [Preparação da base municipal](../README.md#regenerar-a-base-oficial)
