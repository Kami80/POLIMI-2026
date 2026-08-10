const CONFIG = {
  sheetId: "1-OQdEoogFykiQuKBvreFRFFujNtr7kuQBTma6aINgOE",
  sheetGid: "0",
  rowsPerPage: 24,
  defaultView: "cards",
  formUrl: "https://docs.google.com/forms/d/e/1FAIpQLScaMc4FaCOXqVHRq0NsBdv4FXi6NoKjLQoZ2wQY26TVA8gqnQ/viewform?usp=dialog",
  hiddenColumns: ["timestamp", "email address", "email", "e-mail", "e mail"],
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
  }
};

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
};

const els = {};

function cacheElements() {
  [
    "accessGate", "protectedApp", "accessForm", "accessEmail", "accessSubmit", "accessSubmitLabel", "accessStatus", "accessNotFound", "changeEmailButton",
    "connectionStatus", "themeToggle", "themeIcon",
    "searchInput", "searchClear", "filterTrigger", "filterCount", "desktopFilters", "mobileFilters",
    "activeFilterChips", "clearFilters", "resultText", "cardView", "tableView", "tableHead", "tableBody",
    "cardViewBtn", "tableViewBtn", "pagination", "prevPage", "nextPage", "pageInfo", "filterSheet", "filterBackdrop",
    "filterClose", "sheetReset", "sheetApply", "mobileFilterButton", "mobileFilterBadge", "refreshButton", "updatedText",
    "profileSheet", "profileBackdrop", "profilePanel", "profileClose", "profileShare", "profileShareLabel", "profileBody", "profileActions",
    "roommateMatchButton", "roommateMatchButtonLabel", "mobileRoommateButton", "roommateMatchBanner", "roommateMatchTitle", "roommateMatchText", "roommateMatchReset"
  ].forEach(id => els[id] = document.getElementById(id));
}

function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
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
  els.themeIcon.textContent = theme === "dark" ? "☀" : "☾";
}

function setupEvents() {
  els.accessForm.addEventListener("submit", event => {
    event.preventDefault();
    requestAccess(els.accessEmail.value);
  });

  els.accessEmail.addEventListener("input", () => {
    els.accessNotFound.hidden = true;
    if (state.sheetReady) setAccessStatus("", "Use the same email you submitted in the form.");
  });

  els.changeEmailButton?.addEventListener("click", lockDirectory);

  els.searchInput.addEventListener("input", debounce(event => {
    state.query = event.target.value.trim().toLowerCase();
    state.page = 1;
    els.searchClear.hidden = !state.query;
    applyDataPipeline();
  }, 100));

  els.searchClear.addEventListener("click", () => {
    state.query = "";
    state.page = 1;
    els.searchInput.value = "";
    els.searchClear.hidden = true;
    applyDataPipeline();
    els.searchInput.focus();
  });

  [els.cardViewBtn, els.tableViewBtn].forEach(button => button.addEventListener("click", () => setView(button.dataset.view)));
  els.clearFilters.addEventListener("click", resetAllFilters);
  els.prevPage.addEventListener("click", () => changePage(-1));
  els.nextPage.addEventListener("click", () => changePage(1));
  els.refreshButton?.addEventListener("click", loadSheet);

  [els.roommateMatchButton, els.mobileRoommateButton].filter(Boolean).forEach(button => button.addEventListener("click", toggleRoommateMatchMode));
  els.roommateMatchReset?.addEventListener("click", exitRoommateMatchMode);

  [els.filterTrigger, els.mobileFilterButton].forEach(button => button.addEventListener("click", openFilterSheet));
  [els.filterBackdrop, els.filterClose].forEach(button => button.addEventListener("click", closeFilterSheet));
  els.sheetApply.addEventListener("click", applyDraftFilters);
  els.sheetReset.addEventListener("click", () => {
    state.draftFilters = {};
    renderMobileFilters();
    updateSheetApplyLabel();
  });

  [els.profileBackdrop, els.profileClose].forEach(button => button?.addEventListener("click", () => closeStudentProfile()));
  els.profileShare?.addEventListener("click", shareActiveProfile);

  window.addEventListener("popstate", () => {
    if (!state.authorized) return;
    const slug = new URL(window.location.href).searchParams.get("student");
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
    localStorage.setItem("polimi-verified-email", email);
    unlockDirectory(email);
    return;
  }

  localStorage.removeItem("polimi-verified-email");
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

function unlockDirectory(email) {
  state.authorized = true;
  state.authorizedEmail = normalizeEmail(email);
  state.pendingEmail = "";

  els.accessGate.hidden = true;
  els.protectedApp.hidden = false;
  document.body.classList.add("directory-unlocked");

  state.query = "";
  state.filters = {};
  state.sort = { index: null, direction: "asc" };
  state.page = 1;
  state.roommateMatchMode = false;
  state.roommateReferenceRow = null;
  state.roommateMatchMeta = new WeakMap();
  els.searchInput.value = "";
  els.searchClear.hidden = true;

  renderFilters();
  updateRoommateMatchUI();
  applyDataPipeline();
  setStatus("online", "Live");
  setAccessBusy(false, "Check & enter");

  const now = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(new Date());
  els.updatedText.textContent = `Updated ${now}`;
  requestAnimationFrame(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
    openProfileFromUrl();
  });
}

function lockDirectory() {
  localStorage.removeItem("polimi-verified-email");
  state.authorized = false;
  state.authorizedEmail = "";
  state.pendingEmail = "";
  state.roommateMatchMode = false;
  state.roommateReferenceRow = null;
  state.roommateMatchMeta = new WeakMap();
  closeFilterSheet();
  closeStudentProfile({ syncUrl: false });
  els.protectedApp.hidden = true;
  els.accessGate.hidden = false;
  document.body.classList.remove("directory-unlocked");
  els.accessEmail.value = "";
  els.accessNotFound.hidden = true;
  setAccessBusy(false, "Check & enter");
  setAccessStatus("", "Use the same email you submitted in the form.");
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
  renderRows();
}

function loadSheet() {
  state.sheetReady = false;
  setStatus("", "Connecting");
  if (!state.authorized) {
    setAccessBusy(true, "Loading directory…");
    setAccessStatus("loading", "Checking the latest form responses…");
  }
  els.resultText.textContent = "Loading students…";
  els.cardView.hidden = true;
  els.tableView.hidden = true;
  els.pagination.hidden = true;

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
    setStatus("online", "Ready");

    const rememberedEmail = state.authorizedEmail || state.pendingEmail || localStorage.getItem("polimi-verified-email") || "";
    if (rememberedEmail) {
      requestAccess(rememberedEmail, { silent: true });
    } else {
      setAccessBusy(false, "Check & enter");
      setAccessStatus("", "Directory ready. Enter the same email you submitted in the form.");
      requestAnimationFrame(() => els.accessEmail.focus());
    }
  } catch (error) {
    showError(error.message || "Could not read the sheet.");
  }
}

function showError(message) {
  console.error(message);
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
  const groups = new Map();

  state.rows.forEach((row, index) => {
    const name = displayValue(row, nameCol) || `Student ${index + 1}`;
    const base = slugifyProfileName(name);
    if (!groups.has(base)) groups.set(base, []);
    groups.get(base).push({ row, index, name });
  });

  groups.forEach((items, base) => {
    items.forEach(({ row, index }, position) => {
      let slug = base;
      if (position > 0) {
        const identity = displayValue(row, polimiMailCol) || displayValue(row, telegramCol) || displayValue(row, emailCol) || `${base}-${index}`;
        slug = `${base}-${stableHash(identity)}`;
      }
      while (state.profileBySlug.has(slug)) slug = `${base}-${position + 2}`;
      state.profileBySlug.set(slug, row);
      state.slugByRow.set(row, slug);
    });
  });
}

function studentSlug(row) {
  return state.slugByRow.get(row) || "student";
}

function profileUrl(slug) {
  const url = new URL(window.location.href);
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
  const slug = studentSlug(row);
  state.activeProfileSlug = slug;
  renderStudentProfile(row);
  els.profileSheet.classList.add("open");
  els.profileSheet.setAttribute("aria-hidden", "false");
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
  syncBodyLock();

  if (syncUrl) {
    const url = new URL(window.location.href);
    if (url.searchParams.has("student")) {
      url.searchParams.delete("student");
      history.replaceState({}, "", url.toString());
    }
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
  const coreIndexes = new Set([nameCol, genderCol, programCol, campusCol, degreeCol, roommateCol, noteCol, telegramCol, polimiMailCol].filter(Boolean).map(column => column.index));

  const name = displayValue(row, nameCol) || "Polimi student";
  const gender = displayValue(row, genderCol);
  const program = displayValue(row, programCol) || "Program not specified";
  const campus = displayValue(row, campusCol) || "Not specified";
  const degree = displayValue(row, degreeCol) || "Not specified";
  const roommate = displayValue(row, roommateCol) || "Not specified";
  const note = displayValue(row, noteCol);
  const telegram = displayValue(row, telegramCol);
  const polimiMail = displayValue(row, polimiMailCol);

  els.profileBody.innerHTML = "";
  const hero = document.createElement("section");
  hero.className = "profile-hero";
  const avatar = document.createElement("div");
  avatar.className = "profile-avatar";
  avatar.textContent = initials(name);
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
  if (mailtoUrl(polimiMail)) {
    const mailBadge = document.createElement("span");
    mailBadge.className = "polimi-mail-badge profile-polimi-badge";
    mailBadge.textContent = "✓ Polimi mail";
    mailBadge.title = "Polimi mail provided";
    badges.appendChild(mailBadge);
  }
  copy.append(kicker, title, badges);
  hero.append(avatar, copy);

  const programCard = document.createElement("section");
  programCard.className = "profile-program";
  programCard.innerHTML = `<span>Program</span><strong>${escapeHtml(program)}</strong>`;

  const detailGrid = document.createElement("section");
  detailGrid.className = "profile-detail-grid";
  detailGrid.append(
    createProfileDetail("Campus", campus, "⌖"),
    createProfileDetail("Degree", degree, "◇"),
    createProfileDetail("Roommate", roommate, "⌂")
  );

  els.profileBody.append(hero, programCard, detailGrid);

  if (note) {
    const about = document.createElement("section");
    about.className = "profile-about";
    const heading = document.createElement("div");
    heading.className = "profile-section-title";
    heading.innerHTML = `<span>✦</span><strong>About me</strong>`;
    const text = document.createElement("p");
    text.textContent = note;
    about.append(heading, text);
    els.profileBody.appendChild(about);
  }

  const extras = visibleColumns().filter(column => !coreIndexes.has(column.index) && displayValue(row, column));
  if (extras.length) {
    const extraSection = document.createElement("section");
    extraSection.className = "profile-extra-section";
    const heading = document.createElement("div");
    heading.className = "profile-section-title";
    heading.innerHTML = `<span>＋</span><strong>More details</strong>`;
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
  els.profileActions.hidden = els.profileActions.childElementCount === 0;
  els.profileShareLabel.textContent = "Share";
}

function createProfileDetail(label, value, iconText) {
  const item = document.createElement("div");
  item.className = "profile-detail";
  const icon = document.createElement("span");
  icon.className = "profile-detail-icon";
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

function createProfileContactButton(type, value) {
  const isTelegram = type === "telegram";
  const href = isTelegram ? telegramUrl(value) : mailtoUrl(value);
  if (!href) return null;
  const a = document.createElement("a");
  a.className = `profile-contact-btn ${isTelegram ? "telegram" : "mail"}`;
  a.href = href;
  if (isTelegram) {
    a.target = "_blank";
    a.rel = "noopener noreferrer";
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

async function shareActiveProfile() {
  const slug = state.activeProfileSlug;
  const row = state.profileBySlug.get(slug);
  if (!slug || !row) return;
  const name = displayValue(row, semanticColumn("name")) || "Polimi student";
  const url = profileUrl(slug);
  try {
    if (navigator.share) {
      await navigator.share({ title: `${name} · Polimi Students`, text: `View ${name}'s Polimi Students profile.`, url });
      return;
    }
    await navigator.clipboard.writeText(url);
    flashShareLabel("Copied");
  } catch (error) {
    if (error?.name === "AbortError") return;
    try {
      const input = document.createElement("textarea");
      input.value = url;
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
      flashShareLabel("Copied");
    } catch (_) {
      flashShareLabel("Copy link");
    }
  }
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

  const sameCampus = valuesOverlap(displayValue(referenceRow, campusCol), displayValue(candidateRow, campusCol));
  const sameProgram = valuesOverlap(displayValue(referenceRow, programCol), displayValue(candidateRow, programCol));
  const sameGender = valuesOverlap(displayValue(referenceRow, genderCol), displayValue(candidateRow, genderCol));
  const sameDegree = valuesOverlap(displayValue(referenceRow, degreeCol), displayValue(candidateRow, degreeCol));

  if (sameCampus) { score += 30; reasons.push("Same campus"); }
  if (sameProgram) { score += 25; reasons.push("Same program"); }
  // Gender is intentionally only a light tie-breaker because the form currently
  // stores gender, not an explicit roommate-gender preference.
  if (sameGender) { score += 8; reasons.push("Same gender"); }
  if (sameDegree) { score += 5; reasons.push("Same degree level"); }

  return { eligible: true, score, reasons, sameCampus, sameProgram, sameGender, sameDegree };
}

function roommateMatchTier(meta) {
  if (!meta) return "Match";
  if (meta.score >= 108) return "Best match";
  if (meta.score >= 88) return "Great match";
  if (meta.score >= 65) return "Good match";
  return "Potential";
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
  state.roommateMatchMode = true;
  state.roommateReferenceRow = reference;
  state.roommateMatchMeta = new WeakMap();
  state.page = 1;
  state.sort = { index: null, direction: "asc" };
  updateRoommateMatchUI();
  applyDataPipeline();
  document.querySelector(".results-bar")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function exitRoommateMatchMode() {
  state.roommateMatchMode = false;
  state.roommateReferenceRow = null;
  state.roommateMatchMeta = new WeakMap();
  state.page = 1;
  updateRoommateMatchUI();
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

  if (active && state.roommateReferenceRow) {
    const name = displayValue(state.roommateReferenceRow, semanticColumn("name")) || "your profile";
    const campus = displayValue(state.roommateReferenceRow, semanticColumn("campus"));
    const program = displayValue(state.roommateReferenceRow, semanticColumn("program"));
    if (els.roommateMatchTitle) els.roommateMatchTitle.textContent = `Best roommate matches for ${name}`;
    const details = [campus && `campus: ${campus}`, program && `program: ${program}`].filter(Boolean).join(" · ");
    if (els.roommateMatchText) els.roommateMatchText.textContent = `People who want a roommate are ranked first${details ? `, then matched by ${details}` : ""}. Gender is only a light tie-breaker.`;
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
    summary.innerHTML = `<span class="filter-summary-copy"><small>${escapeHtml(definition.label)}</small><strong>${escapeHtml(selectionText)}</strong></span><span class="filter-chevron">⌄</span>`;
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
    meta.textContent = selected.size ? `${selected.size} selected` : "All";
    summaryCopy.append(title, meta);
    const chevron = document.createElement("span");
    chevron.className = "mobile-filter-chevron";
    chevron.textContent = "⌄";
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
        meta.textContent = now.size ? `${now.size} selected` : "All";
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

    group.append(summary, options);
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
  if (rerender) renderFilters();
  applyDataPipeline();
  updateFilterBadges();
}

function resetAllFilters() {
  state.query = "";
  state.filters = {};
  state.page = 1;
  els.searchInput.value = "";
  els.searchClear.hidden = true;
  renderFilters();
  applyDataPipeline();
}

function activeFilterCount() {
  return Object.values(state.filters).reduce((sum, set) => sum + set.size, 0);
}

function updateFilterBadges() {
  const count = activeFilterCount();
  [els.filterCount, els.mobileFilterBadge].forEach(el => {
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
  updateFilterBadges();
}

function applyDataPipeline() {
  const query = state.query;
  const filterEntries = Object.entries(state.filters);

  let rows = state.rows.filter(row => {
    if (query) {
      const haystack = visibleColumns().map(column => displayValue(row, column).toLowerCase()).join(" ");
      if (!haystack.includes(query)) return false;
    }
    return filterEntries.every(([index, selected]) => selected.has(displayValue(row, state.columns[Number(index)])));
  });

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
    ranked.sort((a, b) => b.meta.score - a.meta.score || String(displayValue(a.row, semanticColumn("name"))).localeCompare(String(displayValue(b.row, semanticColumn("name")))));
    rows = ranked.map(item => item.row);
  } else if (state.sort.index !== null) {
    const index = state.sort.index;
    const direction = state.sort.direction === "asc" ? 1 : -1;
    rows = [...rows].sort((a, b) => compareCells(a[index], b[index]) * direction);
  }

  state.filteredRows = rows;
  const maxPage = Math.max(1, Math.ceil(rows.length / CONFIG.rowsPerPage));
  state.page = Math.min(state.page, maxPage);
  els.resultText.textContent = state.roommateMatchMode
    ? `${formatNumber(rows.length)} ${rows.length === 1 ? "roommate match" : "roommate matches"}`
    : `${formatNumber(rows.length)} ${rows.length === 1 ? "student" : "students"}${state.rows.length !== rows.length ? ` of ${formatNumber(state.rows.length)}` : ""}`;
  renderActiveFilters();
  renderRows();
}

function renderRows() {
  const isMobile = window.matchMedia("(max-width: 720px)").matches;
  const effectiveView = isMobile ? "cards" : state.view;
  els.cardView.hidden = effectiveView !== "cards";
  els.tableView.hidden = effectiveView !== "table";

  const start = (state.page - 1) * CONFIG.rowsPerPage;
  const pageRows = state.filteredRows.slice(start, start + CONFIG.rowsPerPage);

  renderCards(pageRows, start);
  if (!isMobile) renderTable(pageRows);
  renderPagination();
}

function renderCards(rows, start) {
  els.cardView.innerHTML = "";
  const fragment = document.createDocumentFragment();
  const nameCol = semanticColumn("name");
  const programCol = semanticColumn("program");

  rows.forEach((row, offset) => {
    const name = displayValue(row, nameCol) || `Student ${start + offset + 1}`;
    const program = displayValue(row, programCol) || "Program not specified";
    const slug = studentSlug(row);

    const card = document.createElement("article");
    card.className = `student-card student-card-v2 student-card-simple ${cardAccentClass(program || name)}`;
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `Open ${name}'s student profile`);
    card.dataset.studentSlug = slug;

    const open = () => openStudentProfile(row);
    card.addEventListener("click", open);
    card.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    });

    const content = document.createElement("div");
    content.className = "student-card-content student-card-simple-content";

    const titleRow = document.createElement("div");
    titleRow.className = "student-card-title-row";

    const title = document.createElement("h3");
    title.className = "student-name";
    title.textContent = name;
    titleRow.appendChild(title);

    const programLine = document.createElement("div");
    programLine.className = "student-card-program student-card-program-simple";
    programLine.textContent = program;

    content.append(titleRow, programLine);

    const arrow = document.createElement("span");
    arrow.className = "student-card-chevron student-card-simple-chevron";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "›";

    card.append(content, arrow);
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
    th.innerHTML = `${escapeHtml(shortHeader(column.label))}<span class="sort-indicator">${state.sort.index === column.index ? (state.sort.direction === "asc" ? "↑" : "↓") : "↕"}</span>`;
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
  applyDataPipeline();
}

function renderPagination() {
  const pages = Math.ceil(state.filteredRows.length / CONFIG.rowsPerPage);
  els.pagination.hidden = pages <= 1;
  els.pageInfo.textContent = `${state.page} / ${Math.max(1, pages)}`;
  els.prevPage.disabled = state.page <= 1;
  els.nextPage.disabled = state.page >= pages;
}

function changePage(direction) {
  const pages = Math.max(1, Math.ceil(state.filteredRows.length / CONFIG.rowsPerPage));
  state.page = Math.max(1, Math.min(pages, state.page + direction));
  renderRows();
  document.querySelector(".explore-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
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
  span.className = "mail-icon";
  span.setAttribute("aria-hidden", "true");
  span.innerHTML = `<svg viewBox="0 0 24 24" focusable="false"><path d="M3.75 5.75h16.5a1.5 1.5 0 0 1 1.5 1.5v9.5a1.5 1.5 0 0 1-1.5 1.5H3.75a1.5 1.5 0 0 1-1.5-1.5v-9.5a1.5 1.5 0 0 1 1.5-1.5Zm.12 1.5L12 13.18l8.13-5.93H3.87Zm16.38 9.5V9.1l-7.37 5.38a1.5 1.5 0 0 1-1.76 0L3.75 9.1v7.65h16.5Z" fill="currentColor"/></svg>`;
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
  arrow.className = "mail-arrow";
  arrow.textContent = "↗";

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
  span.className = "telegram-icon";
  span.setAttribute("aria-hidden", "true");
  span.innerHTML = `<svg viewBox="0 0 24 24" focusable="false"><path d="M21.5 3.2 18.3 20c-.24 1.18-.88 1.47-1.78.91l-4.88-3.6-2.35 2.27c-.26.26-.48.48-.98.48l.35-4.97 9.05-8.18c.39-.35-.09-.55-.61-.2L5.92 13.75l-4.82-1.5c-1.05-.33-1.07-1.05.22-1.55L20.16 3.44c.87-.32 1.63.2 1.34-.24Z" fill="currentColor"/></svg>`;
  return span;
}

function createTelegramAction(value) {
  const url = telegramUrl(value);
  if (!url) return null;
  const a = document.createElement("a");
  a.className = "telegram-action";
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.setAttribute("aria-label", `Open ${telegramLabel(value)} on Telegram`);

  const copy = document.createElement("span");
  copy.className = "telegram-copy";
  const eyebrow = document.createElement("small");
  eyebrow.textContent = "Telegram";
  const label = document.createElement("strong");
  label.textContent = telegramLabel(value);
  copy.append(eyebrow, label);

  const arrow = document.createElement("span");
  arrow.className = "telegram-arrow";
  arrow.textContent = "↗";

  a.append(telegramIcon(), copy, arrow);
  return a;
}

function createTelegramInlineLink(value) {
  const url = telegramUrl(value);
  if (!url) return null;
  const a = document.createElement("a");
  a.className = "telegram-inline";
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
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
      a.textContent = "Open link ↗";
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
  setView(CONFIG.defaultView);
  loadSheet();
});
