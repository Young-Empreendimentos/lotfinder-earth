# Lotfinder Earth

Mapa de visualização de lotes da Young. Site estático (um `index.html` com [Leaflet](https://leafletjs.com/)) que desenha os lotes de cada empreendimento sobre imagens de satélite e mostra **disponibilidade e preço à vista em tempo real**.

## Como funciona

- **Geometria e dados fixos** (`dados.json`): polígonos dos lotes (`points`), calibração das imagens no mapa, áreas em licenciamento e metadados dos empreendimentos.
- **Status e preço ao vivo**: o site chama uma **Edge Function pública** (`/functions/v1/mapa-lotes`) hospedada no Supabase. A função devolve, por lote, `{ status, preço }` — status vindo do Sienge (`disponivel` / `vendido` / `reserva` / `indisponivel`) e preço à vista do comercial.
  - **Nenhuma chave do Supabase fica no site.** A Edge Function roda no servidor com credencial secreta (`service_role`) e só devolve dados públicos dos lotes; o cliente não precisa de chave.
- Se o serviço estiver indisponível, o site usa o status congelado do `dados.json` como fallback.

## Rodar localmente

Qualquer servidor estático serve a pasta. Ex.:

```bash
npx serve .
# ou
python -m http.server 8000
```

Depois abra `http://localhost:<porta>`.

## Deploy

Publicado como site estático (GitHub Pages). Cada push na branch `main` republica o site.
