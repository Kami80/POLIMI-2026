# POLIMI Home Hunt Importer

Small Cloudflare Worker used by `housing.html` to import one user-selected rental listing at a time.

## What it does

`POST /api/import-home` with:

```json
{"url":"https://www.idealista.it/immobile/.../"}
```

The Worker:

1. validates the URL against the supported-domain allowlist;
2. fetches the public listing page with redirect, timeout and response-size limits;
3. falls back to Jina Reader when direct retrieval is blocked (optional);
4. runs the provider-specific parser;
5. normalizes the property into one JSON schema;
6. returns extraction confidence and missing-field warnings.

Supported providers:

- Idealista
- Immobiliare.it
- HousingAnywhere
- Spotahome

## Local test

```bash
npm install
npm test
npm run dev
```

The included tests cover provider parsing, European money formats, current-style Italian labels, URL allowlisting, and CORS preflight behavior.

## Deploy

```bash
npm install
npx wrangler login
npm test
npm run deploy
```

Wrangler prints the deployed Worker URL. The import endpoint is:

```text
https://YOUR-WORKER.workers.dev/api/import-home
```

Paste that complete endpoint into `../home-hunt-config.js`:

```js
window.HOME_HUNT_CONFIG = {
  importerApi: "https://YOUR-WORKER.workers.dev/api/import-home",
  allowReaderFallback: true,
  requestTimeoutMs: 28000
};
```

Then redeploy the static POLIMI website.

## CORS

The default `wrangler.jsonc` allows the project's expected GitHub Pages origin plus common localhost development origins. If the website is hosted elsewhere, edit `ALLOWED_ORIGINS`:

```json
"ALLOWED_ORIGINS": "https://your-site.example,https://kami80.github.io"
```

Origins are comma-separated. Avoid `*` in production unless you intentionally want any website to call the importer.

## Optional Jina key

The Worker can use Jina Reader only when direct retrieval fails. Anonymous reader access may work without a key. If you use a key, store it as a Worker secret rather than committing it:

```bash
npx wrangler secret put JINA_API_KEY
```

Set `ENABLE_READER_FALLBACK` to `false` if you want direct-provider fetching only.

## Security model

The importer intentionally is not an open URL proxy. It rejects:

- non-HTTPS URLs;
- any host outside the four approved rental domains;
- URLs with embedded usernames/passwords;
- non-standard ports;
- redirects to another provider/domain;
- oversized responses;
- unsupported response content types.

The frontend still requires the user to review extracted values before saving them. Extraction is not a guarantee that a listing is legitimate or that every field is correct.
