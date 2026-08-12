const CONFIG = {
  sheetId: "1_ap0ixPjvndp31qc-039_4o7451dpCfsELfnYh1SKQY",
  sheetGid: "0",
  rowsPerPage: 24,
  defaultView: "cards",
  formUrl: "https://docs.google.com/forms/d/e/1FAIpQLScaMc4FaCOXqVHRq0NsBdv4FXi6NoKjLQoZ2wQY26TVA8gqnQ/viewform?usp=dialog",
  reportEmail: "",
  creatorMatchName: "Kamyab Safaei",
  creatorDisplayName: "Kamyab",
  cacheMaxAgeMs: 7 * 24 * 60 * 60 * 1000,
  hiddenColumns: ["timestamp", "email address", "email", "e-mail", "e mail", "show telegram", "display telegram", "telegram visibility", "share telegram", "show polimi mail", "display polimi mail", "polimi mail visibility", "share polimi mail"],
  slicers: [
    { key: "program", label: "Program name", aliases: ["program name", "programme name", "study program", "study programme", "program", "programme"] },
    { key: "gender", label: "Gender", aliases: ["gender", "sex"] },
    { key: "campus", label: "Campus", aliases: ["which campus are you primarily attending", "primary campus", "campus"] },
    { key: "roommate", label: "Want roommate", aliases: ["do you want a roommate", "want roommate", "roommate", "looking for roommate"] },
  ],
  semantic: {
    name: ["full name", "name"],
    gender: ["gender", "sex"],
    program: ["program name", "programme name", "study program", "study programme", "program", "programme"],
    campus: ["which campus are you primarily attending", "primary campus", "campus"],
    degree: ["current degree level", "degree level", "degree"],
    roommate: ["do you want a roommate", "want roommate", "roommate", "looking for roommate"],
    note: ["maybe a note to describe yourself", "note to describe yourself", "about me", "bio", "note", "description"],
    telegram: ["telegram id", "telegram username", "telegram", "telegram account"],
    polimiMail: ["polimi mail", "polimi email", "polimi e-mail", "polimi e mail", "politecnico mail", "politecnico email", "university mail", "university email"],
    email: ["email address", "email", "e-mail", "e mail"],
    timestamp: ["timestamp", "submitted at", "submission time", "date submitted"],
    telegramVisibility: ["show telegram", "display telegram", "telegram visibility", "share telegram", "make telegram public"],
    polimiMailVisibility: ["show polimi mail", "display polimi mail", "polimi mail visibility", "share polimi mail", "make polimi mail public"],
  }
};

const VERIFIED_EMAIL_KEY = "polimi-verified-email";

const state = {
  columns: [],
  rows: [],
  filteredRows: [],
  query: "",
  filters: {},
  sort: { index: null, direction: "asc" },
  page: 1,
  view: CONFIG.defaultView,
  sheetReady: false,
  authorized: false,
  authorizedEmail: "",
  pendingEmail: "",
  draftFilters: {},
  profileBySlug: new Map(),
  slugByRow: new WeakMap(),
  activeProfileSlug: "",
  roommateMatchMode: false,
  roommateReferenceRow: null,
  roommateMatchMeta: new WeakMap(),
  preferencesRestored: false,
  sortMode: "recent",
  savedOnly: false,
  savedSlugs: new Set(),
  cachedDataLoaded: false,
  deferredInstallPrompt: null,
  installPromptDismissed: false,
  appInstalled: false,
  pwaRegistrationError: "",
  isOfflineCache: false,
  appView: "students",
};

const els = {};

// Capture Chromium's one-time install event as early as possible. Waiting for
// the rest of the directory to initialize can otherwise miss the prompt.
window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
window.addEventListener("appinstalled", handleAppInstalled);

function cacheElements() {
  [
    "accessGate", "protectedApp", "accessForm", "accessEmail", "accessSubmit", "accessSubmitLabel", "accessStatus", "accessNotFound", "changeEmailButton",
    "connectionStatus", "themeToggle", "themeIcon", "myProfileButton", "myProfileAvatar", "installAppButton", "accessInstallButton", "accessInstallLabel",
    "directoryIntroTitle", "directoryIntroText", "sortSelect", "savedTrigger", "savedCount", "savedBanner", "savedReset",
    "searchInput", "searchClear", "filterTrigger", "filterCount", "desktopFilters", "mobileFilters",
    "activeFilterChips", "clearFilters", "resultText", "resultsBar", "directoryHeadingCount", "cardView", "tableView", "tableHead", "tableBody",
    "cardViewBtn", "tableViewBtn", "pagination", "prevPage", "nextPage", "pageInfo", "pageNumbers", "loadMoreButton", "loadMoreLabel", "filterSheet", "filterBackdrop",
    "filterClose", "sheetReset", "sheetApply", "mobileFilterButton", "mobileFilterBadge", "refreshButton", "updatedText",
    "profileSheet", "profileBackdrop", "profilePanel", "profileClose", "profileShare", "profileShareLabel", "profileBody", "profileActions", "profileContactPrivacy",
    "profileSave", "profileMenuButton", "profileMenu", "profileUpdateAction", "profileReportAction",
    "roommateMatchButton", "roommateMatchButtonLabel", "mobileRoommateButton", "roommateMatchBanner", "roommateMatchTitle", "roommateMatchText", "roommateMatchReset",
    "studentAppView", "noticesAppView", "groupsAppView", "meAppView", "mePage", "mePageName", "mePageSubtitle", "mePageBadges", "mePageBody", "mePageShare", "mePageSwitchEmail", "mePageAccountEmail", "topNoticesButton", "topGroupsButton",
    "mobileStudentsButton", "mobileSavedButton", "mobileSavedBadge", "mobileNoticesButton", "mobileGroupsButton", "mobileMyProfileButton",
    "quickFilters", "emptyState", "emptyReset", "welcomeTour", "welcomeTourBackdrop", "welcomeTourDone", "appToast"
  ].forEach(id => els[id] = document.getElementById(id));
}

const APP_VIEW_NAMES = new Set(["students", "saved", "notices", "groups", "me"]);
const APP_VIEW_ORDER = ["students", "saved", "notices", "groups", "me"];
let appViewAnimationTimer = 0;

function appViewFromUrl() {
  const requested = new URL(window.location.href).searchParams.get("view") || "students";
  return APP_VIEW_NAMES.has(requested) ? requested : "students";
}

function appPanelForView(view) {
  if (view === "notices" || view === "groups" || view === "me") return view;
  return "students";
}

function appViewUrl(view) {
  const url = new URL(window.location.href);
  url.searchParams.delete("student");
  if (view === "students") url.searchParams.delete("view");
  else url.searchParams.set("view", view);
  url.hash = "";
  return url;
}

function syncAppViewUrl(view, mode = "push") {
  if (mode === "none") return;
  const url = appViewUrl(view);
  if (url.toString() === window.location.href) return;
  const method = mode === "replace" ? "replaceState" : "pushState";
  history[method]({ view }, "", url.toString());
}

function updateAppNavigationState() {
  const activeRow = state.activeProfileSlug ? state.profileBySlug.get(state.activeProfileSlug) : null;
  const activeView = activeRow && activeRow === currentUserRow() ? "me" : state.appView;
  document.querySelectorAll("[data-app-view]").forEach(control => {
    const active = control.dataset.appView === activeView;
    control.classList.toggle("active", active);
    if (active) control.setAttribute("aria-current", "page");
    else control.removeAttribute("aria-current");
  });
}

function showAppView(requestedView, options = {}) {
  if (!state.authorized) return;
  const view = APP_VIEW_NAMES.has(requestedView) ? requestedView : "students";
  const {
    historyMode = "push",
    animate = true,
    scroll = true,
  } = options;
  const previousView = state.appView;
  const direction = APP_VIEW_ORDER.indexOf(view) < APP_VIEW_ORDER.indexOf(previousView) ? "back" : "forward";

  const commit = () => {
    state.appView = view;
    const activePanel = appPanelForView(view);
    [els.studentAppView, els.noticesAppView, els.groupsAppView, els.meAppView].filter(Boolean).forEach(panel => {
      panel.hidden = panel.dataset.appViewPanel !== activePanel;
    });
    document.body.dataset.appView = view;

    let directoryChanged = false;
    if (view === "saved") {
      directoryChanged = !state.savedOnly || state.roommateMatchMode;
      state.savedOnly = true;
      state.roommateMatchMode = false;
      state.roommateReferenceRow = null;
      state.roommateMatchMeta = new WeakMap();
    } else if (view === "students" || view === "me") {
      directoryChanged = state.savedOnly || (view === "students" && state.roommateMatchMode);
      state.savedOnly = false;
      if (view === "students") {
        state.roommateMatchMode = false;
        state.roommateReferenceRow = null;
        state.roommateMatchMeta = new WeakMap();
      }
    }

    if (els.profileSheet?.classList.contains("open")) {
      closeStudentProfile({ syncUrl: false });
    }
    if (view === "notices" || view === "groups" || view === "me") closeFilterSheet();

    updateSavedUI();
    updateRoommateMatchUI();
    if (directoryChanged && state.sheetReady) applyDataPipeline();
    updateAppNavigationState();

    if (view === "groups") window.PolimiGroups?.render?.();
    if (view === "notices" && typeof window.renderAnnouncements === "function") window.renderAnnouncements();
    if (view === "me") renderMyProfilePage();
  };

  let transition = null;
  if (animate && typeof document.startViewTransition === "function") transition = document.startViewTransition(commit);
  else {
    commit();
    if (animate) {
      const activePanel = [els.studentAppView, els.noticesAppView, els.groupsAppView, els.meAppView].find(panel => panel && !panel.hidden);
      if (activePanel) {
        const className = `app-view-fallback-${direction}`;
        activePanel.classList.remove("app-view-fallback-forward", "app-view-fallback-back");
        void activePanel.offsetWidth;
        activePanel.classList.add(className);
        window.clearTimeout(appViewAnimationTimer);
        appViewAnimationTimer = window.setTimeout(() => activePanel.classList.remove(className), 460);
      }
    }
  }
  transition?.finished?.catch?.(() => {});

  syncAppViewUrl(view, historyMode);
  if (scroll) requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
}

window.PolimiAppNavigation = { go: showAppView };

function normalize(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function searchNormalize(value) {
  let text = normalize(value);
  const replacements = [
    [/\bmilan\b/g, "milano"],
    [/\bleonardo\b/g, "milano leonardo"],
    [/\bbovisa\b/g, "milano bovisa"],
    [/\bchem eng\b/g, "chemical engineering"],
    [/\barch\b/g, "architecture"],
    [/\bmsc\b/g, "master laurea magistrale"],
    [/\bbsc\b/g, "bachelor laurea"],
  ];
  replacements.forEach(([pattern, replacement]) => { text = text.replace(pattern, replacement); });
  return text.replace(/\s+/g, " ").trim();
}

function searchTokens(value) {
  return searchNormalize(value).split(" ").filter(Boolean);
}

function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

function rememberedVerifiedEmail() {
  try {
    const email = normalizeEmail(localStorage.getItem(VERIFIED_EMAIL_KEY) || "");
    if (!email) return "";
    if (isValidEmail(email)) return email;
    localStorage.removeItem(VERIFIED_EMAIL_KEY);
  } catch (_) {}
  return "";
}

function rememberVerifiedEmail(email) {
  try { localStorage.setItem(VERIFIED_EMAIL_KEY, normalizeEmail(email)); } catch (_) {}
}

function forgetVerifiedEmail() {
  try { localStorage.removeItem(VERIFIED_EMAIL_KEY); } catch (_) {}
}

function stageRememberedAccess() {
  const email = rememberedVerifiedEmail();
  if (!email) return false;
  state.authorized = true;
  state.authorizedEmail = email;
  state.pendingEmail = "";
  els.accessEmail.value = email;
  els.accessGate.hidden = true;
  els.protectedApp.hidden = false;
  document.body.classList.add("directory-unlocked");
  return true;
}

function isHiddenColumn(column) {
  if (isPolimiMailColumn(column)) return false;
  const header = normalize(column.label);
  return CONFIG.hiddenColumns.some(item => header === normalize(item) || header.includes(normalize(item)));
}

function matchColumn(aliases) {
  const normalizedAliases = aliases.map(normalize);
  let column = state.columns.find(item => normalizedAliases.includes(normalize(item.label)));
  if (column) return column;
  return state.columns.find(item => {
    const header = normalize(item.label);
    return normalizedAliases.some(alias => header.includes(alias) || alias.includes(header));
  }) || null;
}

function semanticColumn(key) {
  return matchColumn(CONFIG.semantic[key] || []);
}

function displayValue(row, column) {
  if (!column) return "";
  return String(row[column.index]?.display ?? "").trim();
}

function visibleColumns() {
  const columns = state.columns.filter(column => !isHiddenColumn(column));
  const preferredKeys = ["name", "gender", "program", "campus", "degree", "roommate", "note", "telegram", "polimiMail"];
  const preferred = preferredKeys.map(semanticColumn).filter(Boolean);
  const seen = new Set(preferred.map(c => c.index));
  return [...preferred, ...columns.filter(c => !seen.has(c.index))];
}

function setupTheme() {
  const stored = localStorage.getItem("polimi-theme");
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  applyTheme(stored || (prefersDark ? "dark" : "light"));
  els.themeToggle.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    localStorage.setItem("polimi-theme", next);
    applyTheme(next);
  });
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  if (els.themeIcon) els.themeIcon.textContent = theme === "dark" ? "light_mode" : "dark_mode";
}

function setupEvents() {
  els.accessForm.addEventListener("submit", event => {
    event.preventDefault();
    requestAccess(els.accessEmail.value);
  });

  els.accessEmail.addEventListener("input", () => {
    els.accessNotFound.hidden = true;
    if (state.sheetReady) setAccessStatus("", "Enter the same email you used in the form.");
  });

  els.changeEmailButton?.addEventListener("click", lockDirectory);
  els.mePageSwitchEmail?.addEventListener("click", lockDirectory);
  els.mePageShare?.addEventListener("click", shareMyProfilePage);

  els.searchInput.addEventListener("input", debounce(event => {
    state.query = event.target.value.trim().toLowerCase();
    state.page = 1;
    els.searchClear.hidden = !state.query;
    persistDirectoryPreferences();
    applyDataPipeline();
  }, 100));

  els.searchClear.addEventListener("click", () => {
    state.query = "";
    state.page = 1;
    els.searchInput.value = "";
    els.searchClear.hidden = true;
    persistDirectoryPreferences();
    applyDataPipeline();
    els.searchInput.focus();
  });

  [els.cardViewBtn, els.tableViewBtn].filter(Boolean).forEach(button => button.addEventListener("click", () => setView(button.dataset.view)));
  els.clearFilters.addEventListener("click", resetAllFilters);
  els.emptyReset?.addEventListener("click", resetAllFilters);
  els.prevPage.addEventListener("click", () => changePage(-1));
  els.nextPage.addEventListener("click", () => changePage(1));
  els.loadMoreButton?.addEventListener("click", () => {
    const pages = Math.max(1, Math.ceil(state.filteredRows.length / CONFIG.rowsPerPage));
    if (state.page >= pages) return;
    state.page += 1;
    persistDirectoryPreferences();
    renderRows();
  });
  els.refreshButton?.addEventListener("click", loadSheet);

  [els.roommateMatchButton, els.mobileRoommateButton].filter(Boolean).forEach(button => button.addEventListener("click", toggleRoommateMatchMode));
  els.roommateMatchReset?.addEventListener("click", exitRoommateMatchMode);

  [els.filterTrigger, els.mobileFilterButton].filter(Boolean).forEach(button => button.addEventListener("click", openFilterSheet));
  [els.filterBackdrop, els.filterClose].filter(Boolean).forEach(button => button.addEventListener("click", closeFilterSheet));
  els.sheetApply.addEventListener("click", applyDraftFilters);
  els.sheetReset.addEventListener("click", () => {
    state.draftFilters = {};
    renderMobileFilters();
    updateSheetApplyLabel();
  });

  [els.profileBackdrop, els.profileClose].forEach(button => button?.addEventListener("click", () => closeStudentProfile()));
  els.profileShare?.addEventListener("click", shareActiveProfile);
  els.profileSave?.addEventListener("click", toggleSavedActiveProfile);
  els.profileMenuButton?.addEventListener("click", event => {
    event.stopPropagation();
    toggleProfileMenu();
  });
  els.profileReportAction?.addEventListener("click", reportActiveProfile);
  document.addEventListener("click", event => {
    if (!els.profileMenu?.hidden && !event.target.closest(".profile-menu-wrap")) closeProfileMenu();
  });

  document.querySelectorAll("[data-app-view]").forEach(control => {
    control.addEventListener("click", () => showAppView(control.dataset.appView));
  });
  els.savedTrigger?.addEventListener("click", toggleSavedMode);
  els.savedReset?.addEventListener("click", exitSavedMode);

  els.sortSelect?.addEventListener("change", event => {
    state.sortMode = event.target.value || "recent";
    state.sort = { index: null, direction: "asc" };
    state.page = 1;
    persistDirectoryPreferences();
    applyDataPipeline();
  });

  [els.installAppButton, els.accessInstallButton].filter(Boolean).forEach(button => button.addEventListener("click", installApp));
  els.welcomeTourDone?.addEventListener("click", dismissWelcomeTour);
  els.welcomeTourBackdrop?.addEventListener("click", dismissWelcomeTour);

  window.addEventListener("popstate", () => {
    if (!state.authorized) return;
    const url = new URL(window.location.href);
    const view = APP_VIEW_NAMES.has(url.searchParams.get("view")) ? url.searchParams.get("view") : "students";
    showAppView(view, { historyMode: "none", scroll: false });
    const slug = url.searchParams.get("student");
    if (slug) openStudentProfileBySlug(slug, { syncUrl: false });
    else closeStudentProfile({ syncUrl: false });
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      if (els.profileSheet?.classList.contains("open")) closeStudentProfile();
      else closeFilterSheet();
    }
    if (event.key === "/" && document.activeElement?.tagName !== "INPUT") {
      event.preventDefault();
      els.searchInput.focus();
    }
  });
}

function setAccessStatus(type, text) {
  els.accessStatus.className = `access-status ${type || ""}`.trim();
  els.accessStatus.textContent = text;
}

function setAccessBusy(isBusy, label) {
  els.accessSubmit.disabled = isBusy || !state.sheetReady;
  if (label) els.accessSubmitLabel.textContent = label;
}

function emailExists(email) {
  const emailColumn = semanticColumn("email");
  if (!emailColumn) return null;
  const target = normalizeEmail(email);
  return state.rows.some(row => normalizeEmail(displayValue(row, emailColumn)) === target);
}

function requestAccess(rawEmail, options = {}) {
  const email = normalizeEmail(rawEmail);
  els.accessEmail.value = email;
  els.accessNotFound.hidden = true;

  if (!isValidEmail(email)) {
    setAccessStatus("error", "Enter a valid email address.");
    els.accessEmail.focus();
    return;
  }

  if (!state.sheetReady) {
    state.pendingEmail = email;
    setAccessBusy(true, "Checking…");
    setAccessStatus("loading", "Loading the latest form responses…");
    return;
  }

  setAccessBusy(true, "Checking…");
  setAccessStatus("loading", "Looking for your form submission…");

  const exists = emailExists(email);
  if (exists === null) {
    setAccessBusy(false, "Check & enter");
    setAccessStatus("error", "I couldn’t find an email column in the response sheet. Check the form response headers.");
    return;
  }

  if (exists) {
    rememberVerifiedEmail(email);
    unlockDirectory(email);
    return;
  }

  forgetVerifiedEmail();
  state.authorized = false;
  state.authorizedEmail = "";
  setAccessBusy(true, "Redirecting…");
  setAccessStatus("loading", "Email not found. Redirecting you to the submission form…");

  // Redirect in the current tab. Using a real anchor click first is more reliable
  // in iOS Safari and embedded mobile browsers than popup-style navigation.
  redirectToForm();
}

function redirectToForm() {
  const url = CONFIG.formUrl;

  // Native same-tab link navigation works reliably on mobile and in-app browsers.
  const link = document.createElement("a");
  link.href = url;
  link.target = "_self";
  link.rel = "noreferrer";
  link.style.position = "fixed";
  link.style.left = "-9999px";
  link.style.width = "1px";
  link.style.height = "1px";
  document.body.appendChild(link);

  try {
    link.click();
  } catch (error) {
    // Ignore and fall through to the hard-navigation fallback below.
  }

  // Some embedded mobile webviews can ignore a synthetic click. If the page is
  // still alive a moment later, force a same-tab navigation without opening a popup.
  window.setTimeout(() => {
    try {
      window.location.href = url;
    } catch (error) {
      try {
        document.location.href = url;
      } catch (_) {}
    }
  }, 80);
}

function consumeRequestedDirectoryView() {
  return appViewFromUrl();
}

function refreshAuthorizedDirectory() {
  buildProfileIndex();
  loadSavedProfiles();
  updatePersonalizedHeader();
  renderFilters();
  renderQuickFilters();
  updateRoommateMatchUI();
  updateSavedUI();
  applyDataPipeline();
  if (state.appView === "me") renderMyProfilePage();
}

function unlockDirectory(email) {
  state.authorized = true;
  state.authorizedEmail = normalizeEmail(email);
  state.pendingEmail = "";

  els.accessGate.hidden = true;
  els.protectedApp.hidden = false;
  document.body.classList.add("directory-unlocked");

  state.sort = { index: null, direction: "asc" };
  state.page = 1;
  state.roommateMatchMeta = new WeakMap();
  restoreDirectoryPreferences();

  const requestedView = consumeRequestedDirectoryView();
  if (requestedView === "saved") {
    state.savedOnly = true;
    state.roommateMatchMode = false;
    state.roommateReferenceRow = null;
  }
  refreshAuthorizedDirectory();
  showAppView(requestedView, { historyMode: "replace", animate: false, scroll: false });
  setStatus(state.isOfflineCache ? "" : "online", state.isOfflineCache ? "Cached" : "Live");
  setAccessBusy(false, "Check & enter");

  const now = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(new Date());
  els.updatedText.textContent = `Updated ${now}`;
  requestAnimationFrame(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
    if (requestedView !== "me") openProfileFromUrl();
    if (requestedView === "students") maybeShowWelcomeTour();
  });
}

function lockDirectory() {
  forgetVerifiedEmail();
  state.authorized = false;
  state.authorizedEmail = "";
  state.pendingEmail = "";
  state.preferencesRestored = false;
  state.roommateMatchMode = false;
  state.roommateReferenceRow = null;
  state.savedOnly = false;
  state.sortMode = "recent";
  state.roommateMatchMeta = new WeakMap();
  state.savedOnly = false;
  closeFilterSheet();
  closeStudentProfile({ syncUrl: false });
  els.protectedApp.hidden = true;
  els.accessGate.hidden = false;
  document.body.classList.remove("directory-unlocked");
  els.accessEmail.value = "";
  els.accessNotFound.hidden = true;
  setAccessBusy(false, "Check & enter");
  setAccessStatus("", "Enter the same email you used in the form.");
  requestAnimationFrame(() => els.accessEmail.focus());
}

function setStatus(type, text) {
  els.connectionStatus.className = `connection ${type || ""}`.trim();
  const label = els.connectionStatus.querySelector(".connection-text");
  if (label) label.textContent = text;
}

function cloneFilters(source = {}) {
  return Object.fromEntries(Object.entries(source).map(([key, values]) => [key, new Set(values)]));
}

function openFilterSheet() {
  state.draftFilters = cloneFilters(state.filters);
  renderMobileFilters();
  updateSheetApplyLabel();
  els.filterSheet.classList.add("open");
  els.filterSheet.setAttribute("aria-hidden", "false");
  els.filterTrigger.setAttribute("aria-expanded", "true");
  syncBodyLock();
}

function closeFilterSheet() {
  els.filterSheet.classList.remove("open");
  els.filterSheet.setAttribute("aria-hidden", "true");
  els.filterTrigger.setAttribute("aria-expanded", "false");
  syncBodyLock();
}

function applyDraftFilters() {
  state.filters = cloneFilters(state.draftFilters);
  state.page = 1;
  renderDesktopFilters();
  persistDirectoryPreferences();
  renderQuickFilters();
  applyDataPipeline();
  closeFilterSheet();
}

function syncBodyLock() {
  const locked = els.filterSheet?.classList.contains("open") || els.profileSheet?.classList.contains("open");
  document.body.style.overflow = locked ? "hidden" : "";
}

function setView(view) {
  state.view = view;
  els.cardViewBtn.classList.toggle("active", view === "cards");
  els.tableViewBtn.classList.toggle("active", view === "table");
  persistDirectoryPreferences();
  renderRows();
}

function loadSheet() {
  state.sheetReady = false;
  state.isOfflineCache = false;
  setStatus("", "Connecting");

  const hydrated = hydrateSheetCache();
  if (!hydrated) {
    if (!state.authorized) {
      setAccessBusy(true, "Loading directory…");
      setAccessStatus("loading", "Checking the latest form responses…");
    } else {
      renderSkeletonCards();
    }
    els.resultText.textContent = "Loading students…";
  } else {
    setStatus("", "Cached");
    if (els.updatedText) els.updatedText.textContent = "Cached · refreshing…";
  }

  if (!window.google?.charts) {
    showError("Google data loader did not start.");
    return;
  }
  if (!window.google?.visualization) {
    google.charts.load("current", { packages: ["table"] });
    google.charts.setOnLoadCallback(querySheet);
  } else {
    querySheet();
  }
}

function querySheet() {
  const url = `https://docs.google.com/spreadsheets/d/${CONFIG.sheetId}/gviz/tq?gid=${encodeURIComponent(CONFIG.sheetGid)}&headers=1`;
  const query = new google.visualization.Query(url);
  query.setQuery("select *");
  query.send(handleSheetResponse);
}

function handleSheetResponse(response) {
  if (response.isError()) {
    showError(response.getMessage() || "Google Sheets returned an error.");
    return;
  }

  try {
    const data = response.getDataTable();
    const columnCount = data.getNumberOfColumns();
    const rowCount = data.getNumberOfRows();

    state.columns = Array.from({ length: columnCount }, (_, index) => ({
      index,
      label: data.getColumnLabel(index)?.trim() || `Column ${index + 1}`,
      type: data.getColumnType(index) || "string",
    }));

    state.rows = Array.from({ length: rowCount }, (_, rowIndex) =>
      state.columns.map(column => ({
        raw: data.getValue(rowIndex, column.index),
        display: data.getFormattedValue(rowIndex, column.index) ?? ""
      }))
    ).filter(row => row.some(cell => String(cell.display).trim() !== ""));

    buildProfileIndex();
    state.sheetReady = true;
    state.isOfflineCache = false;
    saveSheetCache();
    setStatus("online", "Live");

    const pendingEmail = state.pendingEmail;
    const rememberedEmail = state.authorizedEmail || rememberedVerifiedEmail();
    let initializedNow = false;
    if (pendingEmail) {
      requestAccess(pendingEmail, { silent: true });
      initializedNow = state.authorized;
    } else if (rememberedEmail) {
      state.authorized = true;
      state.authorizedEmail = rememberedEmail;
      if (!state.preferencesRestored) {
        unlockDirectory(rememberedEmail);
        initializedNow = true;
      }
    }

    if (state.authorized && !initializedNow) refreshAuthorizedDirectory();
    if (state.authorized && els.updatedText) {
      els.updatedText.textContent = `Updated ${new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(new Date())}`;
    } else if (!pendingEmail) {
      setAccessBusy(false, "Check & enter");
      setAccessStatus("", "Directory ready. Enter the same email you used in the form.");
      requestAnimationFrame(() => els.accessEmail.focus());
    }
  } catch (error) {
    showError(error.message || "Could not read the sheet.");
  }
}

function showError(message) {
  console.error(message);
  if (state.rows.length) {
    state.sheetReady = true;
    state.isOfflineCache = true;
    setStatus("", "Offline · cached");
    if (els.updatedText) els.updatedText.textContent = "Showing the latest cached directory";
    if (state.authorized) applyDataPipeline();
    else {
      const rememberedEmail = rememberedVerifiedEmail();
      if (rememberedEmail) unlockDirectory(rememberedEmail);
      else { setAccessBusy(false, "Check & enter"); setAccessStatus("", "Offline copy available. Enter the email you previously used."); }
    }
    return;
  }
  state.sheetReady = false;
  setStatus("error", "Offline");
  els.resultText.textContent = "Could not load student data. Check the Sheet sharing settings and refresh.";
  if (!state.authorized) {
    setAccessBusy(true, "Directory unavailable");
    setAccessStatus("error", "Could not check the form responses right now. Refresh the page and try again.");
  }
}



function slugifyProfileName(value) {
  const slug = String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return slug || "student";
}

function stableHash(value) {
  let hash = 2166136261;
  const text = String(value || "");
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).slice(0, 5);
}

function buildProfileIndex() {
  state.profileBySlug = new Map();
  state.slugByRow = new WeakMap();
  const nameCol = semanticColumn("name");
  const emailCol = semanticColumn("email");
  const polimiMailCol = semanticColumn("polimiMail");
  const telegramCol = semanticColumn("telegram");
  const programCol = semanticColumn("program");
  const campusCol = semanticColumn("campus");
  const legacyBases = new Map();

  state.rows.forEach((row, index) => {
    const name = displayValue(row, nameCol) || `Student ${index + 1}`;
    const base = slugifyProfileName(name);
    const identity = displayValue(row, emailCol) || displayValue(row, polimiMailCol) || displayValue(row, telegramCol) || `${name}|${displayValue(row, programCol)}|${displayValue(row, campusCol)}|${index}`;
    let slug = `${base}-${stableHash(identity)}`;
    let bump = 2;
    while (state.profileBySlug.has(slug)) slug = `${base}-${stableHash(`${identity}-${bump++}`)}`;
    state.profileBySlug.set(slug, row);
    state.slugByRow.set(row, slug);
    if (!legacyBases.has(base)) legacyBases.set(base, []);
    legacyBases.get(base).push(row);
  });

  // Keep old name-only links working when the name is unique. New shares always use the stable hashed URL.
  legacyBases.forEach((rows, base) => { if (rows.length === 1 && !state.profileBySlug.has(base)) state.profileBySlug.set(base, rows[0]); });
}

function studentSlug(row) {
  return state.slugByRow.get(row) || "student";
}

function profileUrl(slug) {
  const url = new URL(window.location.href);
  url.searchParams.delete("view");
  url.searchParams.set("student", slug);
  url.hash = "";
  return url.toString();
}

function openProfileFromUrl() {
  const slug = new URL(window.location.href).searchParams.get("student");
  if (slug) openStudentProfileBySlug(slug, { syncUrl: false });
}

function openStudentProfileBySlug(slug, options = {}) {
  const row = state.profileBySlug.get(String(slug || ""));
  if (!row) return false;
  openStudentProfile(row, options);
  return true;
}

function openStudentProfile(row, options = {}) {
  if (!row || !els.profileSheet) return;
  const { syncUrl = true } = options;
  if (syncUrl && row === currentUserRow()) {
    showAppView("me");
    return;
  }
  const slug = studentSlug(row);
  state.activeProfileSlug = slug;
  closeProfileMenu();
  renderStudentProfile(row);
  updateProfileSaveButton();
  updateProfileMenuForRow(row);
  els.profileSheet.classList.add("open");
  els.profileSheet.setAttribute("aria-hidden", "false");
  updateAppNavigationState();
  syncBodyLock();
  els.profilePanel?.querySelector(".profile-scroll")?.scrollTo({ top: 0, behavior: "auto" });

  if (syncUrl) {
    const current = new URL(window.location.href).searchParams.get("student");
    if (current !== slug) history.pushState({ student: slug }, "", profileUrl(slug));
  }
  requestAnimationFrame(() => els.profileClose?.focus({ preventScroll: true }));
}

function closeStudentProfile(options = {}) {
  const { syncUrl = true } = options;
  if (!els.profileSheet) return;
  els.profileSheet.classList.remove("open");
  els.profileSheet.setAttribute("aria-hidden", "true");
  state.activeProfileSlug = "";
  closeProfileMenu();
  updateAppNavigationState();
  syncBodyLock();

  if (syncUrl) {
    history.replaceState({ view: state.appView }, "", appViewUrl(state.appView).toString());
  }
}

function renderStudentProfile(row) {
  const nameCol = semanticColumn("name");
  const genderCol = semanticColumn("gender");
  const programCol = semanticColumn("program");
  const campusCol = semanticColumn("campus");
  const degreeCol = semanticColumn("degree");
  const roommateCol = semanticColumn("roommate");
  const noteCol = semanticColumn("note");
  const telegramCol = semanticColumn("telegram");
  const polimiMailCol = semanticColumn("polimiMail");
  const telegramVisibilityCol = semanticColumn("telegramVisibility");
  const polimiMailVisibilityCol = semanticColumn("polimiMailVisibility");
  const coreIndexes = new Set([nameCol, genderCol, programCol, campusCol, degreeCol, roommateCol, noteCol, telegramCol, polimiMailCol].filter(Boolean).map(column => column.index));

  const name = displayValue(row, nameCol) || "Polimi student";
  const gender = displayValue(row, genderCol);
  const program = displayValue(row, programCol) || "Program not specified";
  const campus = displayValue(row, campusCol) || "Not specified";
  const degree = displayValue(row, degreeCol) || "Not specified";
  const roommate = displayValue(row, roommateCol) || "Not specified";
  const note = displayValue(row, noteCol);
  const telegram = contactVisibilityAllows(displayValue(row, telegramVisibilityCol)) ? displayValue(row, telegramCol) : "";
  const polimiMail = contactVisibilityAllows(displayValue(row, polimiMailVisibilityCol)) ? displayValue(row, polimiMailCol) : "";

  if (els.profilePanel) {
    els.profilePanel.classList.remove("profile-gender-female", "profile-gender-male", "profile-gender-other");
    els.profilePanel.classList.add(`profile-gender-${genderClass(gender)}`);
  }

  els.profileBody.innerHTML = "";
  const hero = document.createElement("section");
  hero.className = "profile-hero profile-hero-text-only";
  const copy = document.createElement("div");
  copy.className = "profile-identity";
  const kicker = document.createElement("span");
  kicker.className = "profile-kicker";
  kicker.textContent = "POLIMI · 2026/27";
  const title = document.createElement("h2");
  title.id = "profileName";
  title.textContent = name;
  const badges = document.createElement("div");
  badges.className = "profile-badges";
  if (gender) {
    const genderBadge = document.createElement("span");
    genderBadge.className = `gender-badge ${genderClass(gender)}`;
    genderBadge.textContent = gender;
    badges.appendChild(genderBadge);
  }
  if (isCreatorRow(row)) {
    const creatorBadge = document.createElement("span");
    creatorBadge.className = "creator-badge profile-creator-badge";
    creatorBadge.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">verified</span><span>Creator</span>';
    creatorBadge.title = "Creator of Polimi Students 2026/2027";
    badges.appendChild(creatorBadge);
  }
  if (mailtoUrl(polimiMail)) {
    const mailBadge = document.createElement("span");
    mailBadge.className = "polimi-mail-badge profile-polimi-badge";
    mailBadge.append(mailIcon());
    const mailBadgeLabel = document.createElement("span");
    mailBadgeLabel.textContent = "Polimi mail";
    mailBadge.append(mailBadgeLabel);
    mailBadge.title = "Polimi mail provided";
    badges.appendChild(mailBadge);
  }
  copy.append(kicker, title, badges);
  hero.appendChild(copy);

  const programCard = document.createElement("section");
  programCard.className = "profile-program";
  programCard.innerHTML = `<span>Program</span><strong>${escapeHtml(program)}</strong>`;

  const detailGrid = document.createElement("section");
  detailGrid.className = "profile-detail-grid";
  detailGrid.append(
    createProfileDetail("Campus", campus, "location_on"),
    createProfileDetail("Degree", degree, "school"),
    createProfileDetail("Roommate", roommate, "bed")
  );

  els.profileBody.append(hero, programCard, detailGrid);

  if (note) {
    const about = document.createElement("section");
    about.className = "profile-about";
    const heading = document.createElement("div");
    heading.className = "profile-section-title";
    heading.innerHTML = `<span class="material-symbols-rounded" aria-hidden="true">auto_awesome</span><strong>About me</strong>`;
    const text = document.createElement("p");
    text.dir = "auto";
    appendProfileNote(text, note);
    about.append(heading, text);
    els.profileBody.appendChild(about);
  }

  const extras = visibleColumns().filter(column => !coreIndexes.has(column.index) && displayValue(row, column));
  if (extras.length) {
    const extraSection = document.createElement("section");
    extraSection.className = "profile-extra-section";
    const heading = document.createElement("div");
    heading.className = "profile-section-title";
    heading.innerHTML = `<span class="material-symbols-rounded" aria-hidden="true">add</span><strong>More details</strong>`;
    const grid = document.createElement("div");
    grid.className = "profile-extra-grid";
    extras.forEach(column => {
      const item = document.createElement("div");
      item.className = "profile-extra-item";
      const label = document.createElement("span");
      label.textContent = shortHeader(column.label);
      const value = document.createElement("strong");
      renderColumnContent(value, column, displayValue(row, column));
      item.append(label, value);
      grid.appendChild(item);
    });
    extraSection.append(heading, grid);
    els.profileBody.appendChild(extraSection);
  }

  els.profileActions.innerHTML = "";
  const telegramButton = createProfileContactButton("telegram", telegram);
  const mailButton = createProfileContactButton("mail", polimiMail);
  [telegramButton, mailButton].filter(Boolean).forEach(button => els.profileActions.appendChild(button));
  els.profileActions.classList.toggle("single-action", els.profileActions.childElementCount === 1);
  els.profileActions.hidden = els.profileActions.childElementCount === 0;
  if (els.profileContactPrivacy) els.profileContactPrivacy.hidden = els.profileActions.hidden;
  els.profileShareLabel.textContent = "Share";
}

function appendProfileNote(container, value) {
  const text = String(value || "");
  const urlPattern = /https?:\/\/[^\s<>]+/gi;
  let cursor = 0;

  for (const match of text.matchAll(urlPattern)) {
    const index = match.index || 0;
    if (index > cursor) container.append(document.createTextNode(text.slice(cursor, index)));

    const rawUrl = match[0].replace(/[),.;!?]+$/, "");
    const trailing = match[0].slice(rawUrl.length);
    const link = document.createElement("a");
    link.className = "profile-inline-link";
    link.href = rawUrl;

    if (/^https?:\/\/(?:www\.)?t\.me\//i.test(rawUrl)) {
      link.setAttribute("aria-label", "Open Telegram link");
      const icon = document.createElement("span");
      icon.className = "material-symbols-rounded";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = "send";
      const label = document.createElement("span");
      label.textContent = "Open Telegram link";
      link.append(icon, label);
      activateTelegramLink(link, rawUrl);
    } else {
      link.textContent = rawUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }

    container.append(link);
    if (trailing) container.append(document.createTextNode(trailing));
    cursor = index + match[0].length;
  }

  if (cursor < text.length) container.append(document.createTextNode(text.slice(cursor)));
}

function createProfileDetail(label, value, iconText) {
  const item = document.createElement("div");
  item.className = "profile-detail";
  const icon = document.createElement("span");
  icon.className = "profile-detail-icon material-symbols-rounded";
  icon.textContent = iconText;
  const copy = document.createElement("div");
  const key = document.createElement("span");
  key.textContent = label;
  const val = document.createElement("strong");
  val.textContent = value;
  copy.append(key, val);
  item.append(icon, copy);
  return item;
}

function activateTelegramLink(anchor, href) {
  if (!anchor || !href) return anchor;
  anchor.href = href;
  anchor.removeAttribute("target");
  anchor.rel = "external noopener noreferrer";
  anchor.addEventListener("click", event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    try {
      // Same-tab navigation is much more reliable from installed PWAs and mobile browsers.
      window.location.assign(href);
    } catch (_) {
      window.location.href = href;
    }
  });
  return anchor;
}

function createProfileContactButton(type, value) {
  const isTelegram = type === "telegram";
  const href = isTelegram ? telegramUrl(value) : mailtoUrl(value);
  if (!href) return null;
  const a = document.createElement("a");
  a.className = `profile-contact-btn ${isTelegram ? "telegram" : "mail"}`;
  a.href = href;
  if (isTelegram) {
    activateTelegramLink(a, href);
    a.setAttribute("aria-label", `Open ${telegramLabel(value)} on Telegram`);
    a.append(telegramIcon());
  } else {
    a.setAttribute("aria-label", `Email ${String(value).trim()}`);
    a.append(mailIcon());
  }
  const label = document.createElement("span");
  label.textContent = isTelegram ? "Telegram" : "Polimi Mail";
  a.append(label);
  return a;
}

async function shareProfileRow(row) {
  if (!row) return "unavailable";
  const slug = studentSlug(row);
  const name = displayValue(row, semanticColumn("name")) || "Polimi student";
  const url = profileUrl(slug);
  try {
    if (navigator.share) {
      await navigator.share({ title: `${name} · Polimi Students`, text: `View ${name}'s Polimi Students profile.`, url });
      return "shared";
    }
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch (error) {
    if (error?.name === "AbortError") return "aborted";
    try {
      const input = document.createElement("textarea");
      input.value = url;
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
      return "copied";
    } catch (_) {
      return "unavailable";
    }
  }
}

async function shareActiveProfile() {
  const result = await shareProfileRow(state.profileBySlug.get(state.activeProfileSlug));
  if (result === "copied") flashShareLabel("Copied");
  else if (result === "unavailable") flashShareLabel("Copy link");
}

async function shareMyProfilePage() {
  const result = await shareProfileRow(currentUserRow());
  if (result === "shared") showToast("Profile shared");
  else if (result === "copied") showToast("Profile link copied");
  else if (result === "unavailable") showToast("Profile link is unavailable");
}

function flashShareLabel(text) {
  if (!els.profileShareLabel) return;
  els.profileShareLabel.textContent = text;
  window.setTimeout(() => {
    if (els.profileShareLabel) els.profileShareLabel.textContent = "Share";
  }, 1600);
}


function currentUserRow() {
  const emailColumn = semanticColumn("email");
  if (!emailColumn || !state.authorizedEmail) return null;
  const target = normalizeEmail(state.authorizedEmail);
  return state.rows.find(row => normalizeEmail(displayValue(row, emailColumn)) === target) || null;
}

function roommateIntent(value) {
  const n = normalize(value);
  if (!n) return { score: 12, eligible: true, label: "Roommate preference not specified" };
  if (n === "no" || n === "nope" || n.includes("dont") || n.includes("do not") || n.includes("not looking") || n.includes("no roommate")) {
    return { score: 0, eligible: false, label: "Not looking for a roommate" };
  }
  if (n.includes("maybe") || n.includes("possibly") || n.includes("not sure") || n.includes("depends")) {
    return { score: 42, eligible: true, label: "Maybe looking for a roommate" };
  }
  if (n === "yes" || n.includes("yes") || n.includes("looking") || n.includes("want") || n.includes("need") || n.includes("sure")) {
    return { score: 60, eligible: true, label: "Looking for a roommate" };
  }
  return { score: 28, eligible: true, label: String(value || "Roommate preference") };
}

function comparableParts(value) {
  return String(value || "")
    .split(/[,;/|]+|\s+and\s+/i)
    .map(normalize)
    .filter(Boolean);
}

function valuesOverlap(a, b) {
  const aa = comparableParts(a);
  const bb = comparableParts(b);
  if (!aa.length || !bb.length) return false;
  return aa.some(x => bb.some(y => x === y || (x.length > 4 && y.includes(x)) || (y.length > 4 && x.includes(y))));
}

function selectedValuesOverlap(a, b) {
  const choices = value => String(value || "")
    .split(/[,;/|]+/)
    .map(normalize)
    .filter(Boolean);
  const aa = choices(a);
  const bb = choices(b);
  if (!aa.length || !bb.length) return false;
  return aa.some(value => bb.includes(value));
}

function calculateRoommateMatch(referenceRow, candidateRow) {
  const roommateCol = semanticColumn("roommate");
  const campusCol = semanticColumn("campus");
  const programCol = semanticColumn("program");
  const genderCol = semanticColumn("gender");
  const degreeCol = semanticColumn("degree");

  const intent = roommateIntent(displayValue(candidateRow, roommateCol));
  if (!intent.eligible) return { eligible: false, score: 0, reasons: [] };

  let score = intent.score;
  const reasons = [];
  if (intent.score >= 42) reasons.push(intent.score >= 55 ? "Wants a roommate" : "Open to a roommate");

  const sameCampus = selectedValuesOverlap(displayValue(referenceRow, campusCol), displayValue(candidateRow, campusCol));
  const sameProgram = selectedValuesOverlap(displayValue(referenceRow, programCol), displayValue(candidateRow, programCol));
  const sameGender = selectedValuesOverlap(displayValue(referenceRow, genderCol), displayValue(candidateRow, genderCol));
  const sameDegree = selectedValuesOverlap(displayValue(referenceRow, degreeCol), displayValue(candidateRow, degreeCol));

  if (sameGender) { score += 12; reasons.push("Same gender"); }
  if (sameProgram) { score += 30; reasons.push("Same program"); }
  if (sameCampus) { score += 25; reasons.push("Same campus"); }
  if (sameDegree) { score += 5; reasons.push("Same degree level"); }

  return { eligible: true, score, reasons, sameCampus, sameProgram, sameGender, sameDegree };
}

function roommateMatchTier(meta) {
  if (!meta) return "Potential match";
  if (meta.sameCampus && meta.sameProgram) return "Strong match";
  if (meta.sameProgram) return "Same program";
  if (meta.sameCampus) return "Same campus";
  if (meta.score >= 55) return "Looking for roommate";
  return "Potential match";
}

function toggleRoommateMatchMode() {
  if (state.roommateMatchMode) exitRoommateMatchMode();
  else enterRoommateMatchMode();
}

function enterRoommateMatchMode() {
  const reference = currentUserRow();
  if (!reference) {
    if (els.roommateMatchButtonLabel) els.roommateMatchButtonLabel.textContent = "Profile not found";
    window.setTimeout(updateRoommateMatchUI, 1500);
    return;
  }
  state.savedOnly = false;
  updateSavedUI();
  state.roommateMatchMode = true;
  state.roommateReferenceRow = reference;
  state.roommateMatchMeta = new WeakMap();
  state.page = 1;
  state.sort = { index: null, direction: "asc" };
  updateRoommateMatchUI();
  persistDirectoryPreferences();
  applyDataPipeline();
  document.querySelector(".results-bar")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function exitRoommateMatchMode() {
  if (!state.roommateMatchMode) return;
  state.roommateMatchMode = false;
  state.roommateReferenceRow = null;
  state.roommateMatchMeta = new WeakMap();
  state.page = 1;
  updateRoommateMatchUI();
  persistDirectoryPreferences();
  applyDataPipeline();
}

function updateRoommateMatchUI() {
  const active = state.roommateMatchMode;
  if (els.roommateMatchButton) {
    els.roommateMatchButton.classList.toggle("active", active);
    els.roommateMatchButton.setAttribute("aria-pressed", String(active));
  }
  if (els.roommateMatchButtonLabel) els.roommateMatchButtonLabel.textContent = active ? "Roommate matches" : "Find roommates";
  if (els.mobileRoommateButton) {
    els.mobileRoommateButton.classList.toggle("active", active);
    els.mobileRoommateButton.setAttribute("aria-pressed", String(active));
  }
  if (els.roommateMatchBanner) els.roommateMatchBanner.hidden = !active;
  updateMobileNavState();

  if (active && state.roommateReferenceRow) {
    const name = displayValue(state.roommateReferenceRow, semanticColumn("name")) || "your profile";
    const campus = displayValue(state.roommateReferenceRow, semanticColumn("campus"));
    const program = displayValue(state.roommateReferenceRow, semanticColumn("program"));
    if (els.roommateMatchTitle) els.roommateMatchTitle.textContent = `Potential roommates for ${name}`;
    const details = [campus && `campus: ${campus}`, program && `program: ${program}`].filter(Boolean).join(" · ");
    if (els.roommateMatchText) els.roommateMatchText.textContent = `Same-gender students are shown first, followed by same-program and same-campus matches${details ? ` for ${details}` : ""}.`;
  }
}

function getSlicerDefinitions() {
  return CONFIG.slicers.map(definition => {
    const column = matchColumn(definition.aliases);
    if (!column) return null;
    const counts = new Map();
    state.rows.forEach(row => {
      const value = displayValue(row, column);
      if (!value) return;
      counts.set(value, (counts.get(value) || 0) + 1);
    });
    const values = [...counts.keys()].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
    return { definition, column, counts, values };
  }).filter(Boolean);
}

function renderFilters() {
  renderDesktopFilters();
  renderMobileFilters();
  renderActiveFilters();
  renderQuickFilters();
}

function renderDesktopFilters() {
  els.desktopFilters.innerHTML = "";
  const slicers = getSlicerDefinitions();
  slicers.forEach(({ definition, column, counts, values }) => {
    const details = document.createElement("details");
    details.className = "filter-group";
    details.addEventListener("toggle", () => {
      if (!details.open) return;
      els.desktopFilters.querySelectorAll("details[open]").forEach(other => { if (other !== details) other.open = false; });
    });

    const selected = state.filters[column.index] || new Set();
    const summary = document.createElement("summary");
    const selectionText = selected.size === 0 ? "All" : selected.size === 1 ? [...selected][0] : `${selected.size} selected`;
    summary.innerHTML = `<span class="filter-summary-copy"><small>${escapeHtml(definition.label)}</small><strong>${escapeHtml(selectionText)}</strong></span><span class="filter-chevron material-symbols-rounded" aria-hidden="true">expand_more</span>`;
    details.appendChild(summary);

    const options = document.createElement("div");
    options.className = "filter-options";
    values.forEach(value => options.appendChild(createDesktopOption(column.index, value, counts.get(value) || 0, selected.has(value))));
    details.appendChild(options);
    els.desktopFilters.appendChild(details);
  });
}

function createDesktopOption(columnIndex, value, count, checked) {
  const label = document.createElement("label");
  label.className = "filter-option";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = checked;
  input.addEventListener("change", () => {
    toggleFilterValue(columnIndex, value, input.checked, false);
    const selectedNow = state.filters[columnIndex] || new Set();
    const details = input.closest("details");
    const summaryText = details?.querySelector(".filter-summary-copy strong");
    if (summaryText) {
      summaryText.textContent = selectedNow.size === 0 ? "All" : selectedNow.size === 1 ? [...selectedNow][0] : `${selectedNow.size} selected`;
    }
  });
  const box = document.createElement("span");
  box.className = "check-ui";
  const text = document.createElement("span");
  text.className = "option-label";
  text.textContent = value;
  const number = document.createElement("span");
  number.className = "option-count";
  number.textContent = count;
  label.append(input, box, text, number);
  return label;
}

function renderMobileFilters() {
  els.mobileFilters.innerHTML = "";
  getSlicerDefinitions().forEach(({ definition, column, counts, values }, groupIndex) => {
    const group = document.createElement("details");
    group.className = "mobile-filter-group";
    group.open = groupIndex === 0 || Boolean(state.draftFilters[column.index]?.size);

    const selected = state.draftFilters[column.index] || new Set();
    const summary = document.createElement("summary");
    summary.className = "mobile-filter-summary";
    const summaryCopy = document.createElement("span");
    const title = document.createElement("strong");
    title.textContent = definition.label;
    const meta = document.createElement("small");
    meta.textContent = selected.size
      ? `${selected.size} selected`
      : definition.key === "program" ? `All ${values.length} programs` : "All";
    summaryCopy.append(title, meta);
    const chevron = document.createElement("span");
    chevron.className = "mobile-filter-chevron material-symbols-rounded";
    chevron.setAttribute("aria-hidden", "true");
    chevron.textContent = "expand_more";
    summary.append(summaryCopy, chevron);

    const options = document.createElement("div");
    options.className = "mobile-filter-options";
    values.forEach(value => {
      const label = document.createElement("label");
      label.className = "mobile-check";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = selected.has(value);
      input.addEventListener("change", () => {
        toggleDraftFilterValue(column.index, value, input.checked);
        const now = state.draftFilters[column.index] || new Set();
        meta.textContent = now.size
          ? `${now.size} selected`
          : definition.key === "program" ? `All ${values.length} programs` : "All";
      });
      const box = document.createElement("span");
      box.className = "mobile-check-box";
      const text = document.createElement("span");
      text.className = "mobile-check-label";
      text.textContent = value;
      const count = document.createElement("span");
      count.className = "mobile-check-count";
      count.textContent = counts.get(value) || 0;
      label.append(input, box, text, count);
      options.appendChild(label);
    });

    if (definition.key === "program") {
      group.classList.add("mobile-filter-programs");
      const finder = document.createElement("label");
      finder.className = "mobile-filter-search";
      finder.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">search</span>';
      const finderInput = document.createElement("input");
      finderInput.type = "search";
      finderInput.placeholder = `Search ${values.length} programs`;
      finderInput.setAttribute("aria-label", "Search program filters");
      const emptyMessage = document.createElement("span");
      emptyMessage.className = "mobile-filter-search-empty";
      emptyMessage.textContent = "No program matches that search.";
      emptyMessage.hidden = true;
      finderInput.addEventListener("input", () => {
        const query = normalize(finderInput.value);
        let visible = 0;
        options.querySelectorAll(".mobile-check").forEach(option => {
          const matches = !query || normalize(option.querySelector(".mobile-check-label")?.textContent).includes(query);
          option.hidden = !matches;
          if (matches) visible += 1;
        });
        emptyMessage.hidden = visible !== 0;
      });
      finder.appendChild(finderInput);
      group.append(summary, finder, options, emptyMessage);
    } else {
      group.append(summary, options);
    }
    els.mobileFilters.appendChild(group);
  });
}

function toggleDraftFilterValue(columnIndex, value, checked) {
  const current = state.draftFilters[columnIndex] || new Set();
  if (checked) current.add(value); else current.delete(value);
  if (current.size) state.draftFilters[columnIndex] = current; else delete state.draftFilters[columnIndex];
  updateSheetApplyLabel();
}

function rowsMatchingFilters(filters) {
  const query = state.query;
  const entries = Object.entries(filters || {});
  return state.rows.filter(row => {
    if (query) {
      const haystack = visibleColumns().map(column => displayValue(row, column).toLowerCase()).join(" ");
      if (!haystack.includes(query)) return false;
    }
    return entries.every(([index, selected]) => selected.has(displayValue(row, state.columns[Number(index)])));
  });
}

function updateSheetApplyLabel() {
  if (!els.sheetApply) return;
  const count = rowsMatchingFilters(state.draftFilters).length;
  els.sheetApply.textContent = `Show ${formatNumber(count)} ${count === 1 ? "student" : "students"}`;
}

function toggleFilterValue(columnIndex, value, checked, rerender = true) {
  const current = state.filters[columnIndex] || new Set();
  if (checked) current.add(value); else current.delete(value);
  if (current.size) state.filters[columnIndex] = current; else delete state.filters[columnIndex];
  state.page = 1;
  persistDirectoryPreferences();
  if (rerender) renderFilters();
  else renderQuickFilters();
  applyDataPipeline();
  updateFilterBadges();
}

function resetAllFilters() {
  state.query = "";
  state.filters = {};
  state.page = 1;
  els.searchInput.value = "";
  els.searchClear.hidden = true;
  persistDirectoryPreferences();
  renderFilters();
  renderQuickFilters();
  applyDataPipeline();
}

function activeFilterCount() {
  return Object.values(state.filters).reduce((sum, set) => sum + set.size, 0);
}

function updateFilterBadges() {
  const count = activeFilterCount();
  [els.filterCount, els.mobileFilterBadge].filter(Boolean).forEach(el => {
    el.textContent = count;
    el.hidden = count === 0;
  });
}

function renderActiveFilters() {
  els.activeFilterChips.innerHTML = "";
  Object.entries(state.filters).forEach(([index, values]) => {
    const column = state.columns[Number(index)];
    values.forEach(value => {
      const chip = document.createElement("span");
      chip.className = "active-chip";
      chip.textContent = `${shortHeader(column?.label)}: ${value}`;
      els.activeFilterChips.appendChild(chip);
    });
  });
  const hasAny = activeFilterCount() > 0 || Boolean(state.query);
  els.clearFilters.hidden = !hasAny;
  els.resultsBar?.classList.toggle("has-active", hasAny);
  updateFilterBadges();
}

function applyDataPipeline() {
  const tokens = searchTokens(state.query);
  const filterEntries = Object.entries(state.filters);

  let rows = state.rows.filter(row => {
    if (tokens.length) {
      const values = visibleColumns().map(column => displayValue(row, column));
      const words = values.flatMap(value => searchNormalize(value).split(" ").filter(Boolean));
      const acronyms = values.map(value => searchNormalize(value).split(" ").filter(Boolean).map(word => word[0]).join("")).filter(Boolean);
      const haystack = `${values.map(searchNormalize).join(" ")} ${words.join(" ")} ${acronyms.join(" ")}`;
      if (!tokens.every(token => haystack.includes(token))) return false;
    }
    return filterEntries.every(([index, selected]) => selected.has(displayValue(row, state.columns[Number(index)])));
  });

  if (state.savedOnly) rows = rows.filter(row => state.savedSlugs.has(studentSlug(row)));

  if (state.roommateMatchMode && state.roommateReferenceRow) {
    const reference = state.roommateReferenceRow;
    const ranked = [];
    state.roommateMatchMeta = new WeakMap();
    rows.forEach(row => {
      if (row === reference) return;
      const meta = calculateRoommateMatch(reference, row);
      if (!meta.eligible) return;
      state.roommateMatchMeta.set(row, meta);
      ranked.push({ row, meta });
    });
    const roommatePriority = item => (
      (item.meta.sameGender ? 1_000_000 : 0)
      + (item.meta.sameProgram ? 10_000 : 0)
      + (item.meta.sameCampus ? 100 : 0)
      + item.meta.score
    );
    ranked.sort((a, b) => roommatePriority(b) - roommatePriority(a)
      || String(displayValue(a.row, semanticColumn("name"))).localeCompare(String(displayValue(b.row, semanticColumn("name")))));
    rows = ranked.map(item => item.row);
  } else if (state.sort.index !== null) {
    const index = state.sort.index;
    const direction = state.sort.direction === "asc" ? 1 : -1;
    rows = [...rows].sort((a, b) => compareCells(a[index], b[index]) * direction);
  } else {
    rows = sortRowsByMode(rows, state.sortMode);
  }

  state.filteredRows = rows;
  const maxPage = Math.max(1, Math.ceil(rows.length / CONFIG.rowsPerPage));
  state.page = Math.min(state.page, maxPage);
  let resultLabel = "";
  if (state.savedOnly) {
    resultLabel = `${formatNumber(rows.length)} ${rows.length === 1 ? "saved student" : "saved students"}`;
  } else if (state.roommateMatchMode) {
    resultLabel = `${formatNumber(rows.length)} ${rows.length === 1 ? "potential roommate" : "potential roommates"}`;
  } else {
    resultLabel = `${formatNumber(rows.length)} ${rows.length === 1 ? "student" : "students"}`;
  }
  els.resultText.textContent = resultLabel;
  if (els.directoryHeadingCount) els.directoryHeadingCount.textContent = resultLabel;
  renderActiveFilters();
  updateSavedUI();
  updateEmptyStateCopy();
  renderRows();
}

function renderRows() {
  const isMobile = window.matchMedia("(max-width: 760px)").matches;
  const effectiveView = isMobile ? "cards" : state.view;
  const hasRows = state.filteredRows.length > 0;
  if (els.emptyState) els.emptyState.hidden = hasRows;
  els.cardView.hidden = !hasRows || effectiveView !== "cards";
  els.tableView.hidden = !hasRows || effectiveView !== "table";

  const start = isMobile ? 0 : (state.page - 1) * CONFIG.rowsPerPage;
  const end = isMobile ? state.page * CONFIG.rowsPerPage : start + CONFIG.rowsPerPage;
  const pageRows = state.filteredRows.slice(start, end);

  renderCards(pageRows, start);
  if (!isMobile) renderTable(pageRows);
  renderPagination();
}

function appendSearchHighlightedText(container, value) {
  const text = String(value ?? "");
  const tokens = searchTokens(state.query);
  if (!tokens.length) {
    container.textContent = text;
    return;
  }

  text.split(/(\s+|[.,/()\u00b7\u2013\u2014-]+)/).forEach(part => {
    const normalizedPart = searchNormalize(part);
    const matches = normalizedPart && tokens.some(token => normalizedPart.includes(token));
    if (!matches) {
      container.appendChild(document.createTextNode(part));
      return;
    }
    const mark = document.createElement("mark");
    mark.className = "search-match";
    mark.textContent = part;
    container.appendChild(mark);
  });
}

function sameDirectoryValue(a, b) {
  return Boolean(normalize(a)) && normalize(a) === normalize(b);
}

function cardContextForRow(row) {
  const name = displayValue(row, semanticColumn("name"));
  const program = displayValue(row, semanticColumn("program"));
  const campus = displayValue(row, semanticColumn("campus"));
  const degree = displayValue(row, semanticColumn("degree"));
  const roommate = displayValue(row, semanticColumn("roommate"));
  const gender = displayValue(row, semanticColumn("gender"));
  const tokens = searchTokens(state.query);
  const fieldMatches = value => tokens.length && tokens.some(token => searchNormalize(value).includes(token));

  if (state.roommateMatchMode) {
    const meta = state.roommateMatchMeta.get(row);
    if (meta) return { icon: "bed", label: `${roommateMatchTier(meta)} roommate fit`, tone: "roommate" };
  }

  if (tokens.length) {
    if (fieldMatches(name)) return { icon: "person_search", label: "Name match", tone: "match" };
    if (fieldMatches(program)) return { icon: "school", label: "Program match", tone: "match" };
    if (fieldMatches(campus)) return { icon: "location_on", label: campus, tone: "match" };
    if (fieldMatches(degree)) return { icon: "school", label: "Degree match", tone: "match" };
    if (fieldMatches(roommate)) return { icon: "bed", label: "Looking for roommate", tone: "match" };
    if (fieldMatches(gender)) return { icon: "person", label: gender, tone: "match" };
    return { icon: "search", label: "Search match", tone: "match" };
  }

  const activeFilter = Object.entries(state.filters).find(([, selected]) => selected?.size);
  if (!activeFilter) return null;

  const column = state.columns[Number(activeFilter[0])];
  const value = displayValue(row, column);
  const own = currentUserRow();
  const programColumn = semanticColumn("program");
  const campusColumn = semanticColumn("campus");
  const genderColumn = semanticColumn("gender");
  const roommateColumn = semanticColumn("roommate");
  const degreeColumn = semanticColumn("degree");

  if (column?.index === programColumn?.index) {
    const ownProgram = own ? displayValue(own, programColumn) : "";
    return { icon: "school", label: sameDirectoryValue(value, ownProgram) ? "Same program" : "Program match", tone: "program" };
  }
  if (column?.index === campusColumn?.index) {
    const ownCampus = own ? displayValue(own, campusColumn) : "";
    return { icon: "location_on", label: sameDirectoryValue(value, ownCampus) ? "Same campus" : value, tone: "campus" };
  }
  if (column?.index === roommateColumn?.index) {
    return { icon: "bed", label: roommateIntent(value).score >= 42 ? "Looking for roommate" : "Roommate match", tone: "roommate" };
  }
  if (column?.index === genderColumn?.index) return { icon: "person", label: value, tone: "match" };
  if (column?.index === degreeColumn?.index) return { icon: "school", label: "Degree match", tone: "degree" };
  return { icon: "filter_alt", label: `${column?.label || "Filter"} match`, tone: "match" };
}

function renderCards(rows, start) {
  els.cardView.innerHTML = "";
  const fragment = document.createDocumentFragment();
  const nameCol = semanticColumn("name");
  const programCol = semanticColumn("program");
  const genderCol = semanticColumn("gender");

  rows.forEach((row, offset) => {
    const name = displayValue(row, nameCol) || `Student ${start + offset + 1}`;
    const program = displayValue(row, programCol) || "Program not specified";
    const gender = displayValue(row, genderCol);
    const slug = studentSlug(row);

    const card = document.createElement("article");
    card.className = `student-card student-card-v2 student-card-simple student-card-warm ${cardAccentClass(program || name)} card-gender-${genderClass(gender)}`;
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `Open ${name}'s student profile`);
    card.dataset.studentSlug = slug;

    const open = () => {
      if (card.classList.contains("is-opening")) return;
      const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
      card.classList.add("is-opening");
      window.setTimeout(() => {
        openStudentProfile(row);
        card.classList.remove("is-opening");
      }, reducedMotion ? 0 : 105);
    };
    card.addEventListener("click", open);
    card.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    });

    const content = document.createElement("div");
    content.className = "student-card-content student-card-simple-content";

    const identityRow = document.createElement("div");
    identityRow.className = "student-card-identity student-card-identity-text-only";
    const identityCopy = document.createElement("div");
    identityCopy.className = "student-card-identity-copy";

    const titleRow = document.createElement("div");
    titleRow.className = "student-card-title-row";

    const title = document.createElement("h3");
    title.className = "student-name";
    appendSearchHighlightedText(title, name);
    titleRow.appendChild(title);

    const programLine = document.createElement("div");
    programLine.className = "student-card-program student-card-program-simple";
    appendSearchHighlightedText(programLine, program);
    identityCopy.append(titleRow, programLine);
    identityRow.appendChild(identityCopy);

    const contextData = cardContextForRow(row);
    content.appendChild(identityRow);
    if (contextData) {
      card.classList.add("has-context");
      const context = document.createElement("span");
      context.className = `student-context-badge context-${contextData.tone}`;
      const contextIcon = document.createElement("span");
      contextIcon.className = "material-symbols-rounded";
      contextIcon.setAttribute("aria-hidden", "true");
      contextIcon.textContent = contextData.icon;
      const contextLabel = document.createElement("span");
      appendSearchHighlightedText(contextLabel, contextData.label);
      context.append(contextIcon, contextLabel);
      content.appendChild(context);
    }

    card.append(content);
    fragment.appendChild(card);
  });

  els.cardView.appendChild(fragment);
}

function createFact(label, value) {
  const item = document.createElement("div");
  item.className = "fact";
  const key = document.createElement("span");
  key.textContent = label;
  const val = document.createElement("strong");
  val.textContent = value;
  val.title = value;
  item.append(key, val);
  return item;
}

function renderTable(rows) {
  const columns = visibleColumns();
  els.tableHead.innerHTML = "";
  els.tableBody.innerHTML = "";

  const headRow = document.createElement("tr");
  columns.forEach(column => {
    const th = document.createElement("th");
    if (state.sort.index === column.index) th.classList.add("sorted");
    const sortIcon = state.sort.index === column.index ? (state.sort.direction === "asc" ? "arrow_upward" : "arrow_downward") : "unfold_more";
    th.innerHTML = `${escapeHtml(shortHeader(column.label))}<span class="sort-indicator material-symbols-rounded" aria-hidden="true">${sortIcon}</span>`;
    th.addEventListener("click", () => sortBy(column.index));
    headRow.appendChild(th);
  });
  els.tableHead.appendChild(headRow);

  rows.forEach(row => {
    const tr = document.createElement("tr");
    tr.className = "student-table-row";
    tr.tabIndex = 0;
    tr.addEventListener("click", event => {
      if (event.target.closest("a, button")) return;
      openStudentProfile(row);
    });
    tr.addEventListener("keydown", event => {
      if (event.key === "Enter") openStudentProfile(row);
    });
    columns.forEach(column => {
      const td = document.createElement("td");
      renderColumnContent(td, column, displayValue(row, column));
      tr.appendChild(td);
    });
    els.tableBody.appendChild(tr);
  });
}

function sortBy(index) {
  if (state.roommateMatchMode) {
    state.roommateMatchMode = false;
    state.roommateReferenceRow = null;
    state.roommateMatchMeta = new WeakMap();
    updateRoommateMatchUI();
  }
  if (state.sort.index === index) state.sort.direction = state.sort.direction === "asc" ? "desc" : "asc";
  else state.sort = { index, direction: "asc" };
  state.page = 1;
  persistDirectoryPreferences();
  applyDataPipeline();
}

function renderPagination() {
  const pages = Math.max(1, Math.ceil(state.filteredRows.length / CONFIG.rowsPerPage));
  const isMobile = window.matchMedia("(max-width: 760px)").matches;
  const shown = Math.min(state.page * CONFIG.rowsPerPage, state.filteredRows.length);
  const remaining = Math.max(0, state.filteredRows.length - shown);

  if (isMobile) {
    els.pagination.hidden = remaining === 0;
    els.pageInfo.textContent = `Showing ${formatNumber(shown)} of ${formatNumber(state.filteredRows.length)}`;
    els.prevPage.hidden = true;
    els.nextPage.hidden = true;
    if (els.pageNumbers) els.pageNumbers.innerHTML = "";
    if (els.loadMoreButton) {
      els.loadMoreButton.hidden = remaining === 0;
      els.loadMoreButton.setAttribute("aria-label", `Show ${formatNumber(Math.min(CONFIG.rowsPerPage, remaining))} more students`);
    }
    if (els.loadMoreLabel) els.loadMoreLabel.textContent = `Show ${formatNumber(Math.min(CONFIG.rowsPerPage, remaining))} more students`;
    return;
  }

  els.pagination.hidden = pages <= 1;
  els.prevPage.hidden = false;
  els.nextPage.hidden = false;
  if (els.loadMoreButton) els.loadMoreButton.hidden = true;
  els.pageInfo.textContent = `Page ${state.page} of ${pages} · ${CONFIG.rowsPerPage} per page`;
  els.prevPage.disabled = state.page <= 1;
  els.nextPage.disabled = state.page >= pages;

  if (!els.pageNumbers) return;
  els.pageNumbers.innerHTML = "";

  const visiblePages = paginationWindow(state.page, pages);
  visiblePages.forEach(item => {
    if (item === "…") {
      const ellipsis = document.createElement("span");
      ellipsis.className = "pagination-ellipsis";
      ellipsis.textContent = "…";
      ellipsis.setAttribute("aria-hidden", "true");
      els.pageNumbers.appendChild(ellipsis);
      return;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "pagination-page";
    button.textContent = item;
    button.setAttribute("aria-label", `Go to page ${item}`);
    if (item === state.page) {
      button.classList.add("is-active");
      button.setAttribute("aria-current", "page");
    }
    button.addEventListener("click", () => goToPage(item));
    els.pageNumbers.appendChild(button);
  });
}

function paginationWindow(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "…", total];
  if (current >= total - 3) return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "…", current - 1, current, current + 1, "…", total];
}

function goToPage(page) {
  const pages = Math.max(1, Math.ceil(state.filteredRows.length / CONFIG.rowsPerPage));
  state.page = Math.max(1, Math.min(pages, Number(page) || 1));
  renderRows();
  document.querySelector(".explore-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function changePage(direction) {
  goToPage(state.page + direction);
}

function compareCells(a, b) {
  const av = a?.raw ?? a?.display ?? "";
  const bv = b?.raw ?? b?.display ?? "";
  if (typeof av === "number" && typeof bv === "number") return av - bv;
  return String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: "base" });
}


function renderColumnContent(container, column, value) {
  if (isPolimiMailColumn(column)) {
    const action = createMailInlineLink(value);
    if (action) { container.appendChild(action); return; }
  }
  if (isTelegramColumn(column)) {
    const action = createTelegramInlineLink(value);
    if (action) { container.appendChild(action); return; }
  }
  renderCellContent(container, value);
}

function isPolimiMailColumn(column) {
  if (!column) return false;
  const n = normalize(column.label);
  return (n.includes("polimi") || n.includes("politecnico") || n.includes("university")) && (n.includes("mail") || n.includes("email"));
}

function mailtoUrl(value) {
  const email = String(value ?? "").trim();
  return isValidEmail(email) ? `mailto:${email}` : null;
}

function mailIcon() {
  const span = document.createElement("span");
  span.className = "mail-icon contact-icon-svg";
  span.setAttribute("aria-hidden", "true");
  span.innerHTML = '<svg viewBox="0 0 24 24" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4.25 5.75h15.5c.69 0 1.25.56 1.25 1.25v10c0 .69-.56 1.25-1.25 1.25H4.25C3.56 18.25 3 17.69 3 17V7c0-.69.56-1.25 1.25-1.25Z"/><path d="m4.25 7 7.1 5.33a1.08 1.08 0 0 0 1.3 0L19.75 7"/></svg>';
  return span;
}

function createMailAction(value) {
  const url = mailtoUrl(value);
  if (!url) return null;
  const email = String(value).trim();
  const a = document.createElement("a");
  a.className = "mail-action";
  a.href = url;
  a.setAttribute("aria-label", `Email ${email}`);

  const copy = document.createElement("span");
  copy.className = "mail-copy";
  const eyebrow = document.createElement("small");
  eyebrow.textContent = "Polimi mail";
  const label = document.createElement("strong");
  label.textContent = email;
  copy.append(eyebrow, label);

  const arrow = document.createElement("span");
  arrow.className = "mail-arrow material-symbols-rounded";
  arrow.setAttribute("aria-hidden", "true");
  arrow.textContent = "open_in_new";

  a.append(mailIcon(), copy, arrow);
  return a;
}

function createMailInlineLink(value) {
  const url = mailtoUrl(value);
  if (!url) return null;
  const email = String(value).trim();
  const a = document.createElement("a");
  a.className = "mail-inline";
  a.href = url;
  a.append(mailIcon());
  const label = document.createElement("span");
  label.textContent = email;
  a.append(label);
  return a;
}

function isTelegramColumn(column) {
  if (!column) return false;
  const n = normalize(column.label);
  return n.includes("telegram");
}

function telegramUrl(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  if (/^https?:\/\/(?:www\.)?(?:t\.me|telegram\.me)\//i.test(raw)) return raw;
  if (/^(?:www\.)?(?:t\.me|telegram\.me)\//i.test(raw)) return `https://${raw.replace(/^www\./i, "")}`;

  const withoutAt = raw.replace(/^@/, "").trim();
  if (/^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(withoutAt)) return `https://t.me/${withoutAt}`;

  if (/^\d+$/.test(raw)) return `tg://user?id=${raw}`;
  return null;
}

function telegramLabel(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "Telegram";
  const match = raw.match(/(?:t\.me|telegram\.me)\/([^/?#]+)/i);
  const handle = match?.[1] || raw.replace(/^@/, "");
  if (/^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(handle)) return `@${handle}`;
  return raw;
}

function telegramIcon() {
  const span = document.createElement("span");
  span.className = "telegram-icon contact-icon-svg";
  span.setAttribute("aria-hidden", "true");
  span.innerHTML = '<svg viewBox="0 0 24 24" focusable="false" fill="currentColor"><path d="M21.2 3.12 3.93 9.78c-.78.3-.77 1.4.02 1.68l4.36 1.52 1.7 5.48c.25.8 1.3.96 1.78.27l2.42-3.5 4.77 3.5c.6.44 1.46.1 1.6-.63L22.4 4.2c.15-.79-.45-1.36-1.2-1.08ZM9.26 12.1l8.45-5.42-6.72 7.24-.6 2.63-1.13-4.45Z"/></svg>';
  return span;
}

function createTelegramAction(value) {
  const url = telegramUrl(value);
  if (!url) return null;
  const a = document.createElement("a");
  a.className = "telegram-action";
  activateTelegramLink(a, url);
  a.setAttribute("aria-label", `Open ${telegramLabel(value)} on Telegram`);

  const copy = document.createElement("span");
  copy.className = "telegram-copy";
  const eyebrow = document.createElement("small");
  eyebrow.textContent = "Telegram";
  const label = document.createElement("strong");
  label.textContent = telegramLabel(value);
  copy.append(eyebrow, label);

  const arrow = document.createElement("span");
  arrow.className = "telegram-arrow material-symbols-rounded";
  arrow.setAttribute("aria-hidden", "true");
  arrow.textContent = "open_in_new";

  a.append(telegramIcon(), copy, arrow);
  return a;
}

function createTelegramInlineLink(value) {
  const url = telegramUrl(value);
  if (!url) return null;
  const a = document.createElement("a");
  a.className = "telegram-inline";
  activateTelegramLink(a, url);
  a.append(telegramIcon());
  const label = document.createElement("span");
  label.textContent = telegramLabel(value);
  a.append(label);
  return a;
}

function renderCellContent(container, value) {
  const text = String(value ?? "").trim();
  if (!text) { container.textContent = "—"; return; }
  if (/^https?:\/\//i.test(text)) {
    if (/\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(text)) {
      const img = document.createElement("img");
      img.className = "cell-image";
      img.src = text;
      img.alt = "";
      img.loading = "lazy";
      container.appendChild(img);
    } else {
      const a = document.createElement("a");
      a.className = "cell-link";
      a.href = text;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.innerHTML = `Open link <span class="material-symbols-rounded" aria-hidden="true">open_in_new</span>`;
      container.appendChild(a);
    }
    return;
  }
  container.textContent = text;
}

function shortHeader(label) {
  const text = String(label || "");
  const n = normalize(text);
  if (n.includes("which campus")) return "Campus";
  if (n.includes("roommate")) return "Roommate";
  if (n.includes("degree")) return "Degree";
  if (n.includes("program")) return "Program";
  if (isPolimiMailColumn({ label: text })) return "Polimi mail";
  if (n.includes("telegram")) return "Telegram";
  if (n.includes("describe yourself") || n === "note" || n.includes("about me")) return "About";
  if (n === "full name") return "Name";
  return text.length > 28 ? `${text.slice(0, 26)}…` : text;
}

function initials(name) {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "P";
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

const PREFS_KEY = "polimi-directory-preferences-v1";

function persistDirectoryPreferences() {
  if (!state.columns.length) return;
  try {
    const filters = Object.entries(state.filters).map(([index, values]) => ({
      label: state.columns[Number(index)]?.label || "",
      values: [...values]
    })).filter(item => item.label && item.values.length);
    localStorage.setItem(PREFS_KEY, JSON.stringify({
      query: state.query,
      view: state.view,
      filters,
      roommateMatchMode: state.roommateMatchMode,
      sortMode: state.sortMode
    }));
  } catch (_) {}
}

function restoreDirectoryPreferences() {
  state.query = "";
  state.filters = {};
  state.view = CONFIG.defaultView;
  state.roommateMatchMode = false;
  state.roommateReferenceRow = null;
  state.savedOnly = false;
  state.sortMode = "recent";

  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY) || "null");
    if (saved && typeof saved === "object") {
      state.query = String(saved.query || "").trim().toLowerCase();
      state.view = saved.view === "table" ? "table" : "cards";
      (Array.isArray(saved.filters) ? saved.filters : []).forEach(item => {
        const column = state.columns.find(col => normalize(col.label) === normalize(item.label));
        if (!column) return;
        const available = new Set(state.rows.map(row => displayValue(row, column)).filter(Boolean));
        const selected = new Set((Array.isArray(item.values) ? item.values : []).filter(value => available.has(value)));
        if (selected.size) state.filters[column.index] = selected;
      });
      if (["recent", "name", "program"].includes(saved.sortMode)) state.sortMode = saved.sortMode;
      if (saved.roommateMatchMode) {
        const reference = currentUserRow();
        if (reference) {
          state.roommateMatchMode = true;
          state.roommateReferenceRow = reference;
        }
      }
    }
  } catch (_) {}

  els.searchInput.value = state.query;
  els.searchClear.hidden = !state.query;
  els.cardViewBtn.classList.toggle("active", state.view === "cards");
  els.tableViewBtn.classList.toggle("active", state.view === "table");
  if (els.sortSelect) els.sortSelect.value = state.sortMode;
  state.preferencesRestored = true;
}

function quickFilterSpec() {
  const specs = [];
  const reference = currentUserRow();

  // Personalized shortcuts based on the verified user's own form submission.
  // "Classmates" means students in the same study program.
  if (reference) {
    const programCol = semanticColumn("program");
    const ownProgram = displayValue(reference, programCol);
    if (programCol && ownProgram) {
      specs.push({
        label: "Classmates",
        column: programCol,
        values: [ownProgram],
        icon: "school",
        title: `Same program: ${ownProgram}`
      });
    }

    const campusCol = semanticColumn("campus");
    const ownCampus = displayValue(reference, campusCol);
    if (campusCol && ownCampus) {
      specs.push({
        label: "Same campus",
        column: campusCol,
        values: [ownCampus],
        icon: "location_on",
        title: `Same campus: ${ownCampus}`
      });
    }
  }

  const roommateCol = semanticColumn("roommate");
  if (roommateCol) {
    const values = [...new Set(state.rows.map(row => displayValue(row, roommateCol)).filter(Boolean))]
      .filter(value => roommateIntent(value).score >= 42);
    if (values.length) specs.push({
      label: "Roommates",
      column: roommateCol,
      values,
      mode: "roommate",
      icon: "bed",
      title: "Rank roommate matches by gender, program, then campus"
    });
  }

  return specs;
}

function quickFilterActive(spec) {
  if (spec.mode === "roommate") return state.roommateMatchMode;
  const selected = state.filters[spec.column.index] || new Set();
  return selected.size === spec.values.length && spec.values.every(value => selected.has(value));
}

function renderQuickFilters() {
  if (!els.quickFilters || !state.sheetReady) return;
  els.quickFilters.innerHTML = "";
  const label = document.createElement("span");
  label.className = "quick-filter-label";
  label.textContent = "For you";
  els.quickFilters.appendChild(label);
  quickFilterSpec().forEach(spec => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `quick-filter-chip${quickFilterActive(spec) ? " active" : ""}`;
    button.innerHTML = `<span class="material-symbols-rounded" aria-hidden="true">${escapeHtml(spec.icon)}</span><strong>${escapeHtml(spec.label)}</strong>`;
    if (spec.title) button.title = spec.title;
    button.addEventListener("click", () => {
      if (spec.mode === "roommate") {
        delete state.filters[spec.column.index];
        toggleRoommateMatchMode();
        renderQuickFilters();
        return;
      }
      if (quickFilterActive(spec)) delete state.filters[spec.column.index];
      else state.filters[spec.column.index] = new Set(spec.values);
      state.page = 1;
      persistDirectoryPreferences();
      renderFilters();
      applyDataPipeline();
    });
    els.quickFilters.appendChild(button);
  });

  const more = document.createElement("button");
  more.type = "button";
  more.className = "quick-filter-chip quick-filter-more";
  more.innerHTML = `<span class="material-symbols-rounded" aria-hidden="true">tune</span><strong>More filters</strong>`;
  more.addEventListener("click", openFilterSheet);
  els.quickFilters.appendChild(more);
}

function isRecentStudent(row) {
  const column = semanticColumn("timestamp");
  if (!column) return false;
  const cell = row[column.index];
  let date = cell?.raw instanceof Date ? cell.raw : new Date(cell?.display || cell?.raw || "");
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return false;
  const age = Date.now() - date.getTime();
  return age >= 0 && age <= 7 * 24 * 60 * 60 * 1000;
}


const SHEET_CACHE_KEY = `polimi-sheet-cache-v3:${CONFIG.sheetId}:${CONFIG.sheetGid}`;
const SAVED_KEY = "polimi-saved-students-v1";
const ONBOARDING_KEY = "polimi-onboarding-seen-v1";

function serializeRaw(value) {
  if (value instanceof Date) return { __date: value.toISOString() };
  if (value === undefined) return null;
  return value;
}

function deserializeRaw(value) {
  if (value && typeof value === "object" && value.__date) {
    const date = new Date(value.__date);
    return Number.isNaN(date.getTime()) ? value.__date : date;
  }
  return value;
}

function saveSheetCache() {
  try {
    const payload = {
      version: 2,
      savedAt: Date.now(),
      columns: state.columns,
      rows: state.rows.map(row => row.map(cell => ({ display: cell.display, raw: serializeRaw(cell.raw) })))
    };
    localStorage.setItem(SHEET_CACHE_KEY, JSON.stringify(payload));
  } catch (_) {}
}

function hydrateSheetCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(SHEET_CACHE_KEY) || "null");
    if (!cached?.columns?.length || !Array.isArray(cached.rows)) return false;
    if (Date.now() - Number(cached.savedAt || 0) > CONFIG.cacheMaxAgeMs) return false;
    state.columns = cached.columns;
    state.rows = cached.rows.map(row => row.map(cell => ({ display: String(cell?.display ?? ""), raw: deserializeRaw(cell?.raw) })));
    buildProfileIndex();
    state.sheetReady = true;
    state.cachedDataLoaded = true;
    state.isOfflineCache = true;
    const rememberedEmail = state.authorizedEmail || rememberedVerifiedEmail();
    if (rememberedEmail && !state.preferencesRestored) unlockDirectory(rememberedEmail);
    else if (rememberedEmail) {
      state.authorized = true;
      state.authorizedEmail = rememberedEmail;
      refreshAuthorizedDirectory();
    }
    else if (!state.authorized) {
      setAccessBusy(false, "Check & enter");
      setAccessStatus("", "Directory ready from cache. We’re refreshing it in the background.");
    }
    return true;
  } catch (_) { return false; }
}

function renderSkeletonCards(count = 8) {
  if (!els.cardView) return;
  els.cardView.hidden = false;
  els.tableView.hidden = true;
  els.cardView.innerHTML = Array.from({ length: count }, () => `
    <article class="student-card skeleton-card" aria-hidden="true">
      <span class="skeleton-line skeleton-name"></span>
      <span class="skeleton-line skeleton-program"></span>
    </article>`).join("");
}

function timestampValue(row) {
  const column = semanticColumn("timestamp");
  if (!column) return 0;
  const cell = row[column.index];
  const date = cell?.raw instanceof Date ? cell.raw : new Date(cell?.display || cell?.raw || "");
  return date instanceof Date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
}

function sortRowsByMode(rows, mode) {
  const nameCol = semanticColumn("name");
  const programCol = semanticColumn("program");
  const copy = [...rows];
  if (mode === "name") return copy.sort((a, b) => displayValue(a, nameCol).localeCompare(displayValue(b, nameCol), undefined, { sensitivity: "base" }));
  if (mode === "program") return copy.sort((a, b) => displayValue(a, programCol).localeCompare(displayValue(b, programCol), undefined, { sensitivity: "base" }) || displayValue(a, nameCol).localeCompare(displayValue(b, nameCol)));
  return copy.sort((a, b) => timestampValue(b) - timestampValue(a) || displayValue(a, nameCol).localeCompare(displayValue(b, nameCol), undefined, { sensitivity: "base" }));
}

function loadSavedProfiles() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVED_KEY) || "[]");
    state.savedSlugs = new Set(Array.isArray(saved) ? saved.filter(slug => state.profileBySlug.has(slug)) : []);
  } catch (_) { state.savedSlugs = new Set(); }
  updateSavedUI();
}

function saveSavedProfiles() {
  try { localStorage.setItem(SAVED_KEY, JSON.stringify([...state.savedSlugs])); } catch (_) {}
  updateSavedUI();
}

function toggleSavedActiveProfile() {
  const slug = state.activeProfileSlug;
  if (!slug) return;
  if (state.savedSlugs.has(slug)) {
    state.savedSlugs.delete(slug);
    showToast("Removed from saved students");
  } else {
    state.savedSlugs.add(slug);
    showToast("Student saved");
  }
  saveSavedProfiles();
  updateProfileSaveButton();
  if (state.savedOnly) applyDataPipeline();
}

function updateProfileSaveButton() {
  if (!els.profileSave) return;
  const active = Boolean(state.activeProfileSlug && state.savedSlugs.has(state.activeProfileSlug));
  els.profileSave.classList.toggle("active", active);
  els.profileSave.setAttribute("aria-pressed", String(active));
  els.profileSave.setAttribute("aria-label", active ? "Remove student from saved profiles" : "Save student profile");
  let icon = els.profileSave.querySelector(".material-symbols-rounded");
  if (!icon) {
    icon = document.createElement("span");
    icon.className = "material-symbols-rounded";
    icon.setAttribute("aria-hidden", "true");
    els.profileSave.replaceChildren(icon);
  }
  icon.textContent = "favorite";
}

function toggleSavedMode() {
  state.page = 1;
  showAppView(state.savedOnly ? "students" : "saved");
}

function exitSavedMode() {
  if (!state.savedOnly) return;
  state.page = 1;
  showAppView("students");
}

function updateSavedUI() {
  const count = state.savedSlugs.size;
  if (els.savedCount) els.savedCount.textContent = String(count);
  if (els.savedTrigger) {
    els.savedTrigger.classList.toggle("active", state.savedOnly);
    els.savedTrigger.setAttribute("aria-pressed", String(state.savedOnly));
  }
  if (els.mobileSavedButton) {
    els.mobileSavedButton.classList.toggle("active", state.savedOnly);
    els.mobileSavedButton.setAttribute("aria-pressed", String(state.savedOnly));
  }
  if (els.mobileSavedBadge) {
    els.mobileSavedBadge.textContent = String(count);
    els.mobileSavedBadge.hidden = count === 0;
  }
  if (els.savedBanner) els.savedBanner.hidden = !state.savedOnly;
  updateMobileNavState();
}

function updateMobileNavState() {
  els.mobileRoommateButton?.classList.toggle("active", state.roommateMatchMode);
  updateAppNavigationState();
}

function updateEmptyStateCopy() {
  if (!els.emptyState) return;
  const title = els.emptyState.querySelector("h3");
  const text = els.emptyState.querySelector("p");
  const button = els.emptyState.querySelector("button");
  if (state.savedOnly) {
    if (title) title.textContent = state.savedSlugs.size ? "No saved students match these filters" : "No saved students yet";
    if (text) text.textContent = state.savedSlugs.size ? "Clear the current search or filters to see your saved profiles." : "Open a student profile and tap the heart to save it here.";
    if (button) button.textContent = state.savedSlugs.size ? "Clear search & filters" : "Show all students";
  } else if (state.roommateMatchMode) {
    if (title) title.textContent = "No potential roommates match this view";
    if (text) text.textContent = "Try clearing filters or switch back to the full student directory.";
    if (button) button.textContent = "Clear search & filters";
  } else {
    if (title) title.textContent = "No students match this view";
    if (text) text.textContent = "Try another search or clear your filters to see everyone again.";
    if (button) button.textContent = "Clear search & filters";
  }
}

function createMyProfileField(label, value, iconText, featured = false) {
  const item = document.createElement("article");
  item.className = `me-profile-field${featured ? " featured" : ""}`;
  const icon = document.createElement("span");
  icon.className = "me-profile-field-icon material-symbols-rounded";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = iconText;
  const copy = document.createElement("div");
  const key = document.createElement("span");
  key.textContent = label;
  const content = document.createElement("strong");
  content.textContent = value || "Not specified";
  copy.append(key, content);
  item.append(icon, copy);
  return item;
}

function createMyProfileContactLink(type, value) {
  const isTelegram = type === "telegram";
  const href = isTelegram ? telegramUrl(value) : mailtoUrl(value);
  if (!href) return null;

  const link = document.createElement("a");
  link.className = `me-profile-contact ${isTelegram ? "telegram" : "mail"}`;
  link.href = href;
  if (isTelegram) activateTelegramLink(link, href);

  const icon = document.createElement("span");
  icon.className = "me-profile-contact-icon";
  icon.append(isTelegram ? telegramIcon() : mailIcon());
  const copy = document.createElement("span");
  const label = document.createElement("small");
  label.textContent = isTelegram ? "Telegram" : "Polimi mail";
  const detail = document.createElement("strong");
  detail.textContent = isTelegram ? telegramLabel(value) : String(value).trim();
  copy.append(label, detail);
  const arrow = document.createElement("span");
  arrow.className = "material-symbols-rounded";
  arrow.setAttribute("aria-hidden", "true");
  arrow.textContent = isTelegram ? "open_in_new" : "arrow_forward";
  link.append(icon, copy, arrow);
  return link;
}

function appendMyProfileBadge(container, label, className, iconText = "") {
  const badge = document.createElement("span");
  badge.className = `me-page-badge ${className}`;
  if (iconText) {
    const icon = document.createElement("span");
    icon.className = "material-symbols-rounded";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = iconText;
    badge.appendChild(icon);
  }
  badge.appendChild(document.createTextNode(label));
  container.appendChild(badge);
}

function renderMyProfilePage() {
  if (!els.mePageBody) return;
  const row = currentUserRow();
  const accountEmail = state.authorizedEmail || rememberedVerifiedEmail();
  if (els.mePageAccountEmail) els.mePageAccountEmail.textContent = accountEmail || "Verified student";
  if (els.mePageShare) els.mePageShare.disabled = !row;
  els.mePageBody.replaceChildren();
  els.mePageBadges?.replaceChildren();
  els.mePage?.classList.remove("me-gender-female", "me-gender-male", "me-gender-other");

  if (!row) {
    if (els.mePageName) els.mePageName.textContent = "My profile";
    if (els.mePageSubtitle) els.mePageSubtitle.textContent = "We could not match this email to a current directory profile.";
    const empty = document.createElement("section");
    empty.className = "me-profile-empty";
    const title = document.createElement("h2");
    title.textContent = "Your profile needs an update";
    const text = document.createElement("p");
    text.textContent = "Submit the directory form again with the same verified email, then refresh this page.";
    empty.append(title, text);
    els.mePageBody.appendChild(empty);
    return;
  }

  const nameCol = semanticColumn("name");
  const genderCol = semanticColumn("gender");
  const programCol = semanticColumn("program");
  const campusCol = semanticColumn("campus");
  const degreeCol = semanticColumn("degree");
  const roommateCol = semanticColumn("roommate");
  const noteCol = semanticColumn("note");
  const telegramCol = semanticColumn("telegram");
  const polimiMailCol = semanticColumn("polimiMail");
  const telegramVisibilityCol = semanticColumn("telegramVisibility");
  const polimiMailVisibilityCol = semanticColumn("polimiMailVisibility");
  const coreIndexes = new Set([nameCol, genderCol, programCol, campusCol, degreeCol, roommateCol, noteCol, telegramCol, polimiMailCol]
    .filter(Boolean).map(column => column.index));

  const name = displayValue(row, nameCol) || "Polimi student";
  const gender = displayValue(row, genderCol);
  const genderTone = genderClass(gender);
  const program = displayValue(row, programCol) || "Program not specified";
  const campus = displayValue(row, campusCol) || "Not specified";
  const degree = displayValue(row, degreeCol) || "Not specified";
  const roommate = displayValue(row, roommateCol) || "Not specified";
  const note = displayValue(row, noteCol);
  const telegram = contactVisibilityAllows(displayValue(row, telegramVisibilityCol)) ? displayValue(row, telegramCol) : "";
  const polimiMail = contactVisibilityAllows(displayValue(row, polimiMailVisibilityCol)) ? displayValue(row, polimiMailCol) : "";

  els.mePage?.classList.add(`me-gender-${genderTone}`);
  if (els.mePageName) els.mePageName.textContent = name;
  if (els.mePageSubtitle) els.mePageSubtitle.textContent = [program, campus].filter(Boolean).join(" · ");
  if (els.mePageBadges) {
    appendMyProfileBadge(els.mePageBadges, "Directory member", "member", "verified_user");
    if (gender) appendMyProfileBadge(els.mePageBadges, gender, genderTone, "person");
    if (isCreatorRow(row)) appendMyProfileBadge(els.mePageBadges, "Community creator", "creator", "verified");
  }

  const overview = document.createElement("section");
  overview.className = "me-profile-grid";
  overview.append(
    createMyProfileField("Program", program, "school", true),
    createMyProfileField("Campus", campus, "location_on"),
    createMyProfileField("Degree", degree, "workspace_premium"),
    createMyProfileField("Roommate", roommate, "bed")
  );
  els.mePageBody.appendChild(overview);

  if (note) {
    const about = document.createElement("section");
    about.className = "me-profile-section me-profile-about";
    const heading = document.createElement("h2");
    heading.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">auto_awesome</span><span>About me</span>';
    const text = document.createElement("p");
    text.dir = "auto";
    appendProfileNote(text, note);
    about.append(heading, text);
    els.mePageBody.appendChild(about);
  }

  const contacts = [
    createMyProfileContactLink("telegram", telegram),
    createMyProfileContactLink("mail", polimiMail),
  ].filter(Boolean);
  if (contacts.length) {
    const contactSection = document.createElement("section");
    contactSection.className = "me-profile-section";
    const heading = document.createElement("h2");
    heading.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">contact_page</span><span>Contact details</span>';
    const grid = document.createElement("div");
    grid.className = "me-profile-contact-grid";
    contacts.forEach(link => grid.appendChild(link));
    contactSection.append(heading, grid);
    els.mePageBody.appendChild(contactSection);
  }

  const extras = visibleColumns().filter(column => !coreIndexes.has(column.index) && displayValue(row, column));
  if (extras.length) {
    const extraSection = document.createElement("section");
    extraSection.className = "me-profile-section";
    const heading = document.createElement("h2");
    heading.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">list_alt</span><span>More details</span>';
    const grid = document.createElement("div");
    grid.className = "me-profile-extra-grid";
    extras.forEach(column => {
      const item = document.createElement("article");
      const label = document.createElement("span");
      label.textContent = shortHeader(column.label);
      const value = document.createElement("strong");
      renderColumnContent(value, column, displayValue(row, column));
      item.append(label, value);
      grid.appendChild(item);
    });
    extraSection.append(heading, grid);
    els.mePageBody.appendChild(extraSection);
  }
}

function openMyProfile(options = {}) {
  showAppView("me", { historyMode: options.syncUrl === false ? "none" : "push" });
}

function updatePersonalizedHeader() {
  const row = currentUserRow();
  if (!row) return;
  const name = displayValue(row, semanticColumn("name")) || "Student";
  const first = name.split(/\s+/).filter(Boolean)[0] || "Student";
  const program = displayValue(row, semanticColumn("program"));
  const campus = displayValue(row, semanticColumn("campus"));
  if (els.directoryIntroTitle) els.directoryIntroTitle.textContent = `Welcome back, ${first}.`;
  if (els.directoryIntroText) els.directoryIntroText.textContent = [program, campus, "Discover classmates and new connections."].filter(Boolean).join(" · ");
  if (els.myProfileAvatar) els.myProfileAvatar.textContent = "person";
}

function toggleProfileMenu() {
  if (!els.profileMenu) return;
  const open = els.profileMenu.hidden;
  els.profileMenu.hidden = !open;
  els.profileMenuButton?.setAttribute("aria-expanded", String(open));
}

function closeProfileMenu() {
  if (!els.profileMenu) return;
  els.profileMenu.hidden = true;
  els.profileMenuButton?.setAttribute("aria-expanded", "false");
}

function updateProfileMenuForRow(row) {
  const own = row === currentUserRow();
  if (els.profileUpdateAction) els.profileUpdateAction.hidden = !own;
  if (els.profileReportAction) {
    const icon = document.createElement("span");
    icon.className = "material-symbols-rounded";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "flag";
    els.profileReportAction.replaceChildren(icon, document.createTextNode(` Report to ${CONFIG.creatorDisplayName}`));
  }
}

function isCreatorRow(row) {
  if (!row) return false;
  const name = normalize(displayValue(row, semanticColumn("name")));
  const creator = normalize(CONFIG.creatorMatchName);
  return Boolean(name && creator && (name === creator || name.startsWith(`${creator} `)));
}

function creatorRow() {
  return state.rows.find(row => isCreatorRow(row)) || null;
}

function creatorReportDestination(profileRow, slug) {
  const creator = creatorRow();
  if (!creator) return null;

  const creatorName = CONFIG.creatorDisplayName;
  const telegram = displayValue(creator, semanticColumn("telegram"));
  const polimiMail = displayValue(creator, semanticColumn("polimiMail"));
  const formEmail = displayValue(creator, semanticColumn("email"));
  const reportedName = displayValue(profileRow, semanticColumn("name")) || "Polimi student";
  const reportText = `Hi ${creatorName}, I want to report outdated or incorrect information on this Polimi Students profile:\n\n${profileUrl(slug)}\n\nProfile: ${reportedName}\n\nIssue: `;

  const telegramHref = telegramUrl(telegram);
  if (telegramHref) {
    if (/^https?:\/\//i.test(telegramHref)) {
      const separator = telegramHref.includes("?") ? "&" : "?";
      return { type: "telegram", href: `${telegramHref}${separator}text=${encodeURIComponent(reportText)}`, creatorName };
    }
    return { type: "telegram", href: telegramHref, creatorName };
  }

  const email = polimiMail || formEmail || CONFIG.reportEmail;
  if (email) {
    const subject = encodeURIComponent(`Polimi Students profile report: ${reportedName}`);
    const body = encodeURIComponent(reportText);
    return { type: "email", href: `mailto:${email}?subject=${subject}&body=${body}`, creatorName };
  }

  return { type: "profile", creator, creatorName };
}

function reportActiveProfile() {
  const slug = state.activeProfileSlug;
  const row = state.profileBySlug.get(slug);
  if (!row) return;

  const destination = creatorReportDestination(row, slug);
  closeProfileMenu();

  if (!destination) {
    showToast(`Creator contact is temporarily unavailable.`);
    return;
  }

  if (destination.type === "profile") {
    closeStudentProfile(false);
    window.setTimeout(() => openStudentProfile(destination.creator), 120);
    showToast(`Open ${destination.creatorName}'s profile to contact the creator.`);
    return;
  }

  showToast(`Opening ${destination.creatorName} for your report…`);
  window.location.href = destination.href;
}

function contactVisibilityAllows(value) {
  const n = normalize(value);
  if (!n) return true;
  if (n === "no" || n.includes("private") || n.includes("hide") || n.includes("dont") || n.includes("do not")) return false;
  return true;
}

function maybeShowWelcomeTour() {
  if (!els.welcomeTour || localStorage.getItem(ONBOARDING_KEY) === "1") return;
  window.setTimeout(() => {
    if (!state.authorized || els.profileSheet?.classList.contains("open")) return;
    els.welcomeTour.hidden = false;
    document.body.classList.add("tour-open");
  }, 500);
}

function dismissWelcomeTour() {
  localStorage.setItem(ONBOARDING_KEY, "1");
  if (els.welcomeTour) els.welcomeTour.hidden = true;
  document.body.classList.remove("tour-open");
}

function showToast(message, duration = 1800) {
  if (!els.appToast) return;
  els.appToast.textContent = message;
  els.appToast.hidden = false;
  els.appToast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => { els.appToast.classList.remove("show"); setTimeout(() => { els.appToast.hidden = true; }, 180); }, duration);
}

function installButtons() {
  return [els.installAppButton, els.accessInstallButton].filter(Boolean);
}

function isStandaloneMode() {
  return window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function installPlatform() {
  const userAgent = navigator.userAgent || "";
  const isiPadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  if (/iphone|ipad|ipod/i.test(userAgent) || isiPadOS) return "ios";
  if (/android/i.test(userAgent)) return "android";
  if (/safari/i.test(userAgent) && !/(?:chrome|chromium|crios|edg|opr|android)/i.test(userAgent)) return "safari";
  if (/(?:chrome|chromium|crios|edg|opr|samsungbrowser)/i.test(userAgent)) return "chromium";
  return "unsupported";
}

function hasInstallableOrigin() {
  if (window.location.protocol === "https:") return true;
  if (window.location.protocol !== "http:") return false;
  const host = window.location.hostname.toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".localhost");
}

function syncInstallButtons() {
  const standalone = isStandaloneMode();
  const platform = installPlatform();
  const manualInstall = platform === "ios" || platform === "android" || platform === "safari";
  const needsOriginHelp = !hasInstallableOrigin();
  const visible = !standalone && !state.appInstalled && Boolean(
    state.deferredInstallPrompt ||
    state.installPromptDismissed ||
    state.pwaRegistrationError ||
    manualInstall ||
    needsOriginHelp
  );

  let label = "Install app";
  if (needsOriginHelp || state.pwaRegistrationError) label = "Installation help";
  else if (!state.deferredInstallPrompt && platform === "ios") label = "Add to Home Screen";
  else if (!state.deferredInstallPrompt && platform === "safari") label = "Add to Dock";

  installButtons().forEach(button => {
    button.hidden = !visible;
    button.setAttribute("aria-label", label);
    button.title = label;
  });
  if (els.accessInstallLabel) els.accessInstallLabel.textContent = label;
}

function handleBeforeInstallPrompt(event) {
  event.preventDefault();
  state.deferredInstallPrompt = event;
  state.installPromptDismissed = false;
  state.appInstalled = false;
  syncInstallButtons();
}

function handleAppInstalled() {
  state.deferredInstallPrompt = null;
  state.installPromptDismissed = false;
  state.appInstalled = true;
  syncInstallButtons();
  showToast("Polimi Students installed");
}

async function registerAppServiceWorker() {
  if (!hasInstallableOrigin()) {
    state.pwaRegistrationError = window.location.protocol === "file:" ? "file-preview" : "insecure-origin";
    syncInstallButtons();
    return;
  }
  if (!("serviceWorker" in navigator)) {
    state.pwaRegistrationError = "unsupported-browser";
    syncInstallButtons();
    return;
  }

  try {
    await navigator.serviceWorker.register("./sw.js", { scope: "./" });
    await navigator.serviceWorker.ready;
    state.pwaRegistrationError = "";
  } catch (error) {
    state.pwaRegistrationError = "registration-failed";
    console.warn("Polimi Students could not initialize offline installation.", error);
  }
  syncInstallButtons();
}

function setupPWA() {
  syncInstallButtons();
  registerAppServiceWorker();
  window.matchMedia?.("(display-mode: standalone)")?.addEventListener?.("change", syncInstallButtons);
}

async function installApp() {
  if (isStandaloneMode() || state.appInstalled) {
    syncInstallButtons();
    showToast("Polimi Students is already installed");
    return;
  }

  if (!hasInstallableOrigin()) {
    showToast("Installation cannot work from a file preview. Open the app over HTTPS or localhost first.", 5200);
    return;
  }

  if (state.deferredInstallPrompt) {
    const promptEvent = state.deferredInstallPrompt;
    state.deferredInstallPrompt = null;
    try {
      const promptResult = await promptEvent.prompt();
      const choice = promptResult?.outcome ? promptResult : await promptEvent.userChoice;
      if (choice?.outcome === "accepted") {
        state.appInstalled = true;
        state.installPromptDismissed = false;
        showToast("Finishing installation...");
      } else {
        state.installPromptDismissed = true;
        showToast("Installation was cancelled. You can still install it from your browser menu.", 4200);
      }
    } catch (error) {
      state.installPromptDismissed = true;
      showToast("The browser could not open the install prompt. Try its Install app menu instead.", 4600);
    }
    syncInstallButtons();
    return;
  }

  const platform = installPlatform();
  if (state.pwaRegistrationError === "registration-failed") {
    showToast("Installation setup did not finish. Reload the page once, then try again.", 4600);
  } else if (state.pwaRegistrationError === "unsupported-browser" || platform === "unsupported") {
    showToast("This browser does not offer app installation. Try Chrome, Edge, Safari, or an Android browser.", 5200);
  } else if (platform === "ios") {
    showToast("Tap Share in your browser, then choose Add to Home Screen.", 5200);
  } else if (platform === "safari") {
    showToast("In Safari, open File and choose Add to Dock.", 4600);
  } else if (platform === "android") {
    showToast("Open the browser menu and choose Install app or Add to Home screen.", 5200);
  } else {
    showToast("Open the browser menu and choose Install Polimi Students.", 4600);
  }
}

function setupDragToClose(panel, handle, closeFn) {
  if (!panel || !handle || !window.PointerEvent) return;
  let startY = 0, dragging = false;
  handle.style.touchAction = "none";
  handle.addEventListener("pointerdown", event => {
    if (window.innerWidth > 760) return;
    dragging = true; startY = event.clientY; panel.setPointerCapture?.(event.pointerId); panel.classList.add("dragging");
  });
  handle.addEventListener("pointermove", event => {
    if (!dragging) return;
    const dy = Math.max(0, event.clientY - startY);
    panel.style.transform = `translateY(${dy}px)`;
  });
  const end = event => {
    if (!dragging) return;
    dragging = false;
    const dy = Math.max(0, event.clientY - startY);
    panel.classList.remove("dragging");
    panel.style.transform = "";
    if (dy > 90) closeFn();
  };
  handle.addEventListener("pointerup", end);
  handle.addEventListener("pointercancel", end);
}

function setupSheetGestures() {
  setupDragToClose(els.filterSheet?.querySelector(".sheet-panel"), els.filterSheet?.querySelector(".sheet-handle"), closeFilterSheet);
  setupDragToClose(els.profilePanel, els.profileSheet?.querySelector(".profile-handle"), closeStudentProfile);
}

function cardAccentClass(value) {
  const text = String(value || "Polimi");
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  return `card-accent-${Math.abs(hash) % 6}`;
}

function genderClass(value) {
  const n = normalize(value);
  if (n.includes("female") || n.includes("woman")) return "female";
  if (n.includes("male") || n.includes("man")) return "male";
  return "other";
}

function roommateClass(value) {
  const n = normalize(value);
  if (n === "no" || n.includes("not")) return "no";
  if (n.includes("maybe") || n.includes("possibly") || n.includes("not sure")) return "maybe";
  return "yes";
}

function formatNumber(value) {
  return new Intl.NumberFormat().format(value);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

function debounce(fn, wait) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), wait); };
}

window.addEventListener("resize", debounce(renderRows, 120));

document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  els.protectedApp.hidden = true;
  els.accessGate.hidden = false;
  setupTheme();
  setupEvents();
  setupPWA();
  setupSheetGestures();
  stageRememberedAccess();
  setView(CONFIG.defaultView);
  loadSheet();
});
