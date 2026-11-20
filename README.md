# GeoPulse

Plataforma de inteligência territorial para explorar e comparar os 853 municípios de Minas Gerais. O mapa cruza a malha municipal oficial com população, densidade demográfica, área territorial e PIB de referência de 2022. Projeto de portfólio de **oEnzoRibas**.

## Demonstração da Plataforma

![Prévia animada do GeoPulse mostrando a busca por Belo Horizonte e a comparação com Contagem no mapa de Minas Gerais](docs/media/demo-preview.gif)

[Assistir ao vídeo completo (MP4, 36,6 s, sem áudio)](docs/media/demo.mp4?raw=true)

## Iniciar o site

Requer Node.js 22 ou superior.

```sh
cd frontend
npm ci
npm run dev
```

Abra [o GeoPulse](http://localhost:3000). O explorador usa o snapshot versionado do IBGE por padrão. A página de metodologia documenta a origem dos dados, a classificação por quintis, o cálculo da comparação e as limitações do recorte municipal.

## Usar a API e o PostGIS

A partir da raiz, com Docker Compose ativo:

```sh
docker compose up -d --build api
```

O Compose sobe o PostGIS, aplica as migrações SQL versionadas e carrega o snapshot em uma transação antes de iniciar a API. As importações são serializadas por um bloqueio transacional. A documentação OpenAPI fica em [localhost:8000/docs](http://localhost:8000/docs). Para usar a API no navegador, copie `frontend/.env.example` para `frontend/.env.local`, defina `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000` e reinicie o Next.js.

| Rota | Retorno |
| --- | --- |
| `/health` | Estado da API e modo de armazenamento |
| `/v1/metadata` | Ano, cobertura e fontes |
| `/v1/municipalities` | Indicadores por município, com filtro opcional `?region=3101` |
| `/v1/municipalities/{code}` | Indicadores para um código IBGE |
| `/v1/municipalities.geojson` | Malha e indicadores |
| `/v1/locate?lon=-43.95&lat=-19.92` | Municípios cujo polígono cobre a coordenada, em modo PostGIS |

A API também pode servir o snapshot diretamente. Com Python 3.12+, instale `backend/requirements.txt` e execute `python -m uvicorn backend.main:app` na raiz com `DATABASE_URL` ausente.

## Regenerar a base oficial

```sh
python -m pip install -r scripts/requirements.txt
python scripts/build_snapshot.py
```

O ETL verifica os 853 identificadores e cruza as fontes abaixo. A simplificação usa projeção métrica EPSG:5880 e tolerância de 220 m, com preservação das fronteiras compartilhadas. O GeoJSON de exibição é exportado em EPSG:4326. Os valores oficiais de área e densidade são preservados. O argumento opcional `--cache` permite reaproveitar os arquivos brutos.

- [IBGE · SIDRA 4714, Censo Demográfico 2022](https://sidra.ibge.gov.br/tabela/4714)
- [IBGE · SIDRA 5938, PIB dos Municípios](https://sidra.ibge.gov.br/tabela/5938)
- [IBGE · Malha Municipal 2022 de Minas Gerais](https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_municipais/municipio_2022/UFs/MG/)
- [IBGE · API de Localidades, municípios de Minas Gerais](https://servicodados.ibge.gov.br/api/v1/localidades/estados/31/municipios)

## Deploy

- **Vercel**. Aponte o diretório raiz do projeto para `frontend` e selecione o preset Next.js. O build produz a exportação estática em `out/`. Configure `NEXT_PUBLIC_API_URL` antes do build para usar uma API remota.
- **API**. Use a raiz deste repositório como contexto e `backend/Dockerfile` como Dockerfile. Para PostGIS gerenciado, configure `DATABASE_URL` com a URL do banco e execute `python -m backend.import_snapshot` como etapa de inicialização da base. O ambiente de migração precisa ter permissão para criar a extensão PostGIS ou encontrá-la pré-instalada. Configure `CORS_ORIGINS` com as origens do frontend separadas por vírgula.
- **CI**. O GitHub Actions compila o frontend e verifica a importação da malha e uma consulta espacial em PostGIS.

## Participar do projeto

As releases reúnem as versões e suas notas. Para propor mudanças, consultar as regras de convivência ou comunicar uma vulnerabilidade, use os canais do projeto. [Releases](https://github.com/oEnzoRibas/GeoPulse/releases) · [Guia de contribuição](CONTRIBUTING.md) · [Código de conduta](CODE_OF_CONDUCT.md) · [Política de segurança](SECURITY.md)

## Licença e atribuição

O código original do GeoPulse é distribuído sob a licença MIT. Os indicadores e limites municipais têm origem no IBGE. Ao reutilizar os dados ou mapas derivados, preserve a atribuição, o ano de referência e a identificação das fontes. As dependências de terceiros seguem suas próprias licenças. [Licença do código](LICENSE) · [Fontes dos dados](#regenerar-a-base-oficial)
