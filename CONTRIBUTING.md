# Como contribuir com o GeoPulse

O GeoPulse é um visualizador geográfico para explorar dados de pesquisa. Contribuições podem melhorar a navegação entre níveis, a importação de CSV, as malhas, a API, os indicadores e a documentação.

## Relatar um problema ou propor uma mudança

Abra uma issue com a tarefa que tentou realizar e o resultado esperado. Em erros de dados, inclua o código IBGE do município, o indicador, o ano, o valor exibido e o link da tabela oficial. Para relatos de segurança, use o canal privado. [Issues](https://github.com/oEnzoRibas/GeoPulse/issues) · [Política de segurança](SECURITY.md)

## Preparar o ambiente

Crie uma branch a partir da `main` atualizada. O frontend requer Node.js 22 ou superior. O README descreve como iniciar o site com o snapshot, conectar a API ao PostGIS e regenerar a base com Python. [Instruções de execução](README.md#iniciar-o-site)

## Validar uma alteração

- **Interface** — em `frontend/`, execute `npm ci` e `npm run build`. Em alterações no mapa, confira o clique de seleção, a abertura de subdivisões e o retorno ao recorte anterior. Em alterações no importador, confira a prévia, a legenda e o valor exibido ao selecionar uma área. Para reproduzir um erro de importação, use um CSV pequeno com dados públicos ou fictícios e informe o nível, as colunas e o período selecionados. [Guia do visualizador](docs/visualizador.md)
- **API e banco** — na raiz, execute `docker compose up -d --build api`. Confira `/health`, a rota modificada e, para alterações espaciais, o resultado de `/v1/locate?lon=-43.95&lat=-19.92`, que deve incluir Belo Horizonte (`3106200`). Encerre com `docker compose down`.
- **Dados** — altere o ETL em `scripts/build_snapshot.py` e regenere os produtos afetados. Documente fonte, ano, unidade, denominador quando aplicável e tratamento de valores ausentes. Verifique a correspondência entre os códigos IBGE e a geometria.
- **Documentação ou mídia** — confira os links relativos e a reprodução das mídias afetadas a partir do README.

## Enviar o pull request

Descreva o problema, a mudança e como verificá-la. Inclua uma captura para alterações visuais quando ela ajudar a revisão. Para mudanças de indicador ou classificação, explique o efeito sobre a leitura do mapa. A CI verifica o build e a integração com PostGIS. [Código de conduta](CODE_OF_CONDUCT.md)
