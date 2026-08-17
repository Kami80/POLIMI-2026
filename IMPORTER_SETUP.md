# Milan Home Hunt — URL Importer Setup

The website is ready for URL extraction, but the secure importer runs as a separate serverless Worker so the main GitHub Pages project can stay static.

## 1. Deploy the included Worker

From the project root:

```bash
cd home-hunt-worker
npm install
npx wrangler login
npm test
npm run deploy
```

After deployment, Cloudflare will give you a URL similar to:

```text
https://polimi-home-hunt-importer.YOUR-SUBDOMAIN.workers.dev
```

## 2. Connect the frontend

Open `home-hunt-config.js` and set:

```js
importerApi: "https://polimi-home-hunt-importer.YOUR-SUBDOMAIN.workers.dev/api/import-home"
```

Commit/push the changed config with the rest of the website.

## 3. Confirm CORS origin

`home-hunt-worker/wrangler.jsonc` already includes `https://kami80.github.io`. If you use a custom domain, add its **origin** to `ALLOWED_ORIGINS` and redeploy the Worker.

## 4. Test in Home Hunt

Open `housing.html` and paste a current URL from:

- Idealista
- Immobiliare.it
- HousingAnywhere
- Spotahome

The status pill should say **Secure importer connected**. Import then shows staged progress and opens the review form with confidence labels.

## Fallbacks

If a provider blocks extraction or changes its page:

1. the Worker can use its optional reader fallback;
2. the user can paste the listing text into Home Hunt;
3. the user can add/edit the property manually.

The original listing link is retained throughout the workflow.
