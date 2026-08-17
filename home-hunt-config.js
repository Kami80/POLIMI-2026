window.HOME_HUNT_CONFIG = Object.assign({
  // Deploy /home-hunt-worker and paste the Worker origin here, for example:
  // importerApi: "https://polimi-home-hunt-importer.your-subdomain.workers.dev/api/import-home"
  importerApi: "",
  allowReaderFallback: true,
  requestTimeoutMs: 28000
}, window.HOME_HUNT_CONFIG || {});
