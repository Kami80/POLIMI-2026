const CONFIG = {
  sheetId: "1-OQdEoogFykiQuKBvreFRFFujNtr7kuQBTma6aINgOE",
  sheetGid: "0",
  rowsPerPage: 30,
  slicers: [
    { key: "program", label: "Program", aliases: ["program name", "programme name", "program", "programme"] },
    { key: "gender", label: "Gender", aliases: ["gender", "sex"] },
    { key: "campus", label: "Campus", aliases: ["which campus are you primarily attending", "primary campus", "campus"] },
    { key: "roommate", label: "Roommate", aliases: ["do you want a roommate", "want roommate", "roommate", "looking for roommate"] },
  ],
  fields: {
    name: ["full name", "name"],
    gender: ["gender", "sex"],
    program: ["program name", "programme name", "program", "programme"],
    campus: ["which campus are you primarily attending", "primary campus", "campus"],
    degree: ["current degree level", "degree level", "degree"],
    roommate: ["do you want a roommate", "want roommate", "roommate", "looking for roommate"],
    about: ["maybe a note to describe yourself", "note to describe yourself", "describe yourself", "about me", "about"],
    telegram: ["telegram id", "telegram", "telegram username", "telegram account"],
  },
  hiddenHeaders: ["timestamp", "email address", "email", "e-mail"],
};

const state = {
  columns: [],
  rows: [],
  filteredRows: [],
  filters: {},
  query: "",
  sort: { index: null, direction: "asc" },
  page: 1,
  view: window.innerWidth <= 720 ? "cards" : "cards",
  fields: {},
};

const $ = id => document.getElementById(id);
const els = {};

function cacheElements() {
  [
    "connectionStatus", "themeToggle", "themeIcon", "searchInput", "searchClear",
    "filterTrigger", "filterCount", "desktopFilters", "activeFilterChips", "clearFilters",
    "resultText", "cardView", "tableView", "tableHead", "tableBody", "cardViewBtn", "tableViewBtn",
    "pagination", "prevPage", "nextPage", "pageInfo", "filterSheet", "filterBackdrop", "filterClose",
    "mobileFilters", "sheetReset", "sheetApply", "mobileFilterButton", "mobileFilterBadge",
    "refreshButton", "updatedText"
  ].forEach(id => els[id] = $(id));
}

function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function setupTheme() {
  const saved = localStorage.getItem("polimi-students-theme");
  const preferred = window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  applyTheme(saved || preferred);
  els.themeToggle.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(next);
    localStorage.setItem("polimi-students-theme", next);
  });
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  els.themeIcon.textContent = theme === "dark" ? "☀" : "☾";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#0c111b" : "#f7f8fb");
}

function setupEvents() {
  els.searchInput.addEventListener("input", debounce(e => {
    state.query = e.target.value.trim().toLowerCase();
    state.page = 1;
    els.searchClear.hidden = !state.query;
    applyPipeline();
  }, 100));
  els.searchClear.addEventListener("click", () => {
    state.query = "";
    state.page = 1;
    els.searchInput.value = "";
    els.searchClear.hidden = true;
    applyPipeline();
    els.searchInput.focus();
  });

  els.cardViewBtn.addEventListener("click", () => setView("cards"));
  els.tableViewBtn.addEventListener("click", () => setView("table"));
  els.clearFilters.addEventListener("click", resetFilters);
  els.prevPage.addEventListener("click", () => changePage(-1));
  els.nextPage.addEventListener("click", () => changePage(1));
  els.refreshButton.addEventListener("click", loadSheet);

  [els.filterTrigger, els.mobileFilterButton].forEach(button => button.addEventListener("click", openFilterSheet));
  [els.filterBackdrop, els.filterClose, els.sheetApply].forEach(button => button.addEventListener("click", closeFilterSheet));
  els.sheetReset.addEventListener("click", resetFilters);

  document.addEventListener("click", event => {
    if (!event.target.closest(".filter-popover")) closeDesktopPopovers();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") { closeDesktopPopovers(); closeFilterSheet(); }
    if (event.key === "/" && !/INPUT|TEXTAREA/.test(document.activeElement?.tagName || "")) {
      event.preventDefault();
      els.searchInput.focus();
    }
  });

  window.addEventListener("resize", debounce(() => {
    if (window.innerWidth <= 720 && state.view === "table") setView("cards");
  }, 150));
}

function setStatus(kind, text) {
  els.connectionStatus.className = `live-state ${kind || ""}`.trim();
  const label = els.connectionStatus.querySelector("span");
  if (label) label.textContent = text;
}

function setView(view) {
  if (window.innerWidth <= 720) view = "cards";
  state.view = view;
  els.cardViewBtn.classList.toggle("active", view === "cards");
  els.tableViewBtn.classList.toggle("active", view === "table");
  renderPage();
}

function loadSheet() {
  setStatus("", "Connecting");
  els.resultText.textContent = "Loading students…";
  els.cardView.hidden = true;
  els.tableView.hidden = true;
  els.pagination.hidden = true;

  if (!window.google?.charts) {
    showError("Google data loader could not start.");
    return;
  }

  if (!window.google.visualization) {
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
  query.send(handleResponse);
}

function handleResponse(response) {
  if (response.isError()) {
    showError(response.getMessage() || "Google Sheets returned an error.");
    return;
  }

  try {
    const data = response.getDataTable();
    state.columns = Array.from({ length: data.getNumberOfColumns() }, (_, index) => ({
      index,
      label: String(data.getColumnLabel(index) || `Column ${index + 1}`).trim(),
      type: data.getColumnType(index) || "string",
    }));

    state.rows = Array.from({ length: data.getNumberOfRows() }, (_, rowIndex) =>
      state.columns.map(column => ({
        raw: data.getValue(rowIndex, column.index),
        display: data.getFormattedValue(rowIndex, column.index) ?? "",
      }))
    ).filter(row => row.some(cell => String(cell.display).trim()));

    state.fields = Object.fromEntries(Object.entries(CONFIG.fields).map(([key, aliases]) => [key, findColumn(aliases)]));
    state.filters = {};
    state.query = "";
    state.sort = { index: null, direction: "asc" };
    state.page = 1;
    els.searchInput.value = "";
    els.searchClear.hidden = true;

    renderFilters();
    applyPipeline();
    setStatus("online", "Live");
    els.updatedText.textContent = `Updated ${new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(new Date())}`;
  } catch (error) {
    showError(error.message || "Could not read the sheet.");
  }
}

function showError(message) {
  console.error(message);
  setStatus("error", "Offline");
  els.resultText.textContent = "Could not load the directory. Check the Google Sheet sharing settings and refresh.";
  els.cardView.hidden = false;
  els.cardView.innerHTML = '<div class="empty-inline">The student list is temporarily unavailable.</div>';
}

function findColumn(aliases) {
  const targets = aliases.map(normalize);
  let col = state.columns.find(c => targets.includes(normalize(c.label)));
  if (col) return col;
  return state.columns.find(c => {
    const h = normalize(c.label);
    return targets.some(a => h.includes(a) || a.includes(h));
  }) || null;
}

function getCell(row, column) {
  return column ? String(row[column.index]?.display ?? "").trim() : "";
}

function publicColumns() {
  return state.columns.filter(column => !CONFIG.hiddenHeaders.some(hidden => {
    const h = normalize(column.label);
    const x = normalize(hidden);
    return h === x || h.includes(x);
  }));
}

function slicerData() {
  return CONFIG.slicers.map(def => {
    const column = findColumn(def.aliases);
    if (!column) return null;
    const counts = new Map();
    state.rows.forEach(row => {
      const value = getCell(row, column);
      if (value) counts.set(value, (counts.get(value) || 0) + 1);
    });
    return {
      def,
      column,
      values: [...counts.keys()].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })),
      counts,
    };
  }).filter(Boolean);
}

function selectedValues(columnIndex) {
  return state.filters[columnIndex] || new Set();
}

function updateFilterValue(columnIndex, value, checked) {
  const current = new Set(selectedValues(columnIndex));
  if (checked) current.add(value); else current.delete(value);
  if (current.size) state.filters[columnIndex] = current; else delete state.filters[columnIndex];
  state.page = 1;
  syncFilters();
  applyPipeline();
}

function renderFilters() {
  const groups = slicerData();
  els.desktopFilters.innerHTML = "";
  els.mobileFilters.innerHTML = "";

  groups.forEach(({ def, column, values, counts }) => {
    const pop = document.createElement("div");
    pop.className = "filter-popover";
    pop.dataset.column = column.index;

    const summary = document.createElement("button");
    summary.type = "button";
    summary.className = "filter-summary";
    summary.innerHTML = `<span><small>${escapeHtml(def.label)}</small><strong data-summary="${column.index}">All</strong></span><span>⌄</span>`;
    summary.addEventListener("click", event => {
      event.stopPropagation();
      const opening = !pop.classList.contains("open");
      closeDesktopPopovers();
      pop.classList.toggle("open", opening);
    });

    const menu = document.createElement("div");
    menu.className = "filter-menu";
    menu.hidden = true;
    menu.innerHTML = `<div class="filter-menu-head"><strong>${escapeHtml(def.label)}</strong><button type="button">Clear</button></div>`;
    pop.addEventListener("click", () => { menu.hidden = !pop.classList.contains("open"); });
    summary.addEventListener("click", () => { menu.hidden = !pop.classList.contains("open"); });
    menu.querySelector("button").addEventListener("click", event => {
      event.stopPropagation();
      delete state.filters[column.index];
      state.page = 1;
      syncFilters();
      applyPipeline();
    });

    values.forEach(value => {
      const label = document.createElement("label");
      label.className = "check-option";
      label.innerHTML = `<input type="checkbox" data-col="${column.index}" data-value="${escapeHtml(value)}"><span>${escapeHtml(value)}</span><small>${counts.get(value)}</small>`;
      label.querySelector("input").addEventListener("change", e => updateFilterValue(column.index, value, e.target.checked));
      menu.appendChild(label);
    });
    pop.append(summary, menu);
    els.desktopFilters.appendChild(pop);

    const mobile = document.createElement("section");
    mobile.className = "mobile-filter-group";
    mobile.innerHTML = `<h3>${escapeHtml(def.label)}</h3><div class="mobile-options"></div>`;
    const options = mobile.querySelector(".mobile-options");
    values.forEach(value => {
      const label = document.createElement("label");
      label.className = "mobile-check";
      label.innerHTML = `<input type="checkbox" data-col="${column.index}" data-value="${escapeHtml(value)}"><span>${escapeHtml(value)}</span>`;
      label.querySelector("input").addEventListener("change", e => updateFilterValue(column.index, value, e.target.checked));
      options.appendChild(label);
    });
    els.mobileFilters.appendChild(mobile);
  });

  syncFilters();
}

function closeDesktopPopovers() {
  document.querySelectorAll(".filter-popover.open").forEach(pop => {
    pop.classList.remove("open");
    const menu = pop.querySelector(".filter-menu");
    if (menu) menu.hidden = true;
  });
}

function syncFilters() {
  document.querySelectorAll('input[type="checkbox"][data-col]').forEach(input => {
    input.checked = selectedValues(Number(input.dataset.col)).has(input.dataset.value);
  });

  document.querySelectorAll("[data-summary]").forEach(summary => {
    const set = selectedValues(Number(summary.dataset.summary));
    summary.textContent = set.size ? (set.size === 1 ? [...set][0] : `${set.size} selected`) : "All";
  });

  renderActiveChips();
  updateFilterBadges();
}

function activeFilterCount() {
  return Object.values(state.filters).reduce((sum, set) => sum + set.size, 0);
}

function updateFilterBadges() {
  const count = activeFilterCount();
  [els.filterCount, els.mobileFilterBadge].forEach(el => {
    el.textContent = count;
    el.hidden = !count;
  });
}

function renderActiveChips() {
  els.activeFilterChips.innerHTML = "";
  let any = false;
  Object.entries(state.filters).forEach(([index, values]) => {
    const column = state.columns[Number(index)];
    values.forEach(value => {
      any = true;
      const chip = document.createElement("span");
      chip.className = "active-chip";
      chip.innerHTML = `<span>${escapeHtml(value)}</span><button type="button" aria-label="Remove ${escapeHtml(value)}">×</button>`;
      chip.querySelector("button").addEventListener("click", () => updateFilterValue(Number(index), value, false));
      chip.title = column?.label || "Filter";
      els.activeFilterChips.appendChild(chip);
    });
  });
  els.clearFilters.hidden = !any && !state.query;
}

function resetFilters() {
  state.filters = {};
  state.query = "";
  state.page = 1;
  els.searchInput.value = "";
  els.searchClear.hidden = true;
  syncFilters();
  applyPipeline();
}

function openFilterSheet() {
  closeDesktopPopovers();
  els.filterSheet.classList.add("open");
  els.filterSheet.setAttribute("aria-hidden", "false");
  els.filterTrigger.setAttribute("aria-expanded", "true");
  document.body.style.overflow = "hidden";
}

function closeFilterSheet() {
  els.filterSheet.classList.remove("open");
  els.filterSheet.setAttribute("aria-hidden", "true");
  els.filterTrigger.setAttribute("aria-expanded", "false");
  document.body.style.overflow = "";
}

function applyPipeline() {
  let rows = [...state.rows];

  if (state.query) {
    rows = rows.filter(row => publicColumns().some(column => getCell(row, column).toLowerCase().includes(state.query)));
  }

  Object.entries(state.filters).forEach(([index, values]) => {
    rows = rows.filter(row => values.has(getCell(row, { index: Number(index) })));
  });

  if (state.sort.index !== null) {
    const { index, direction } = state.sort;
    rows.sort((a, b) => {
      const av = String(a[index]?.display ?? "");
      const bv = String(b[index]?.display ?? "");
      const cmp = av.localeCompare(bv, undefined, { numeric: true, sensitivity: "base" });
      return direction === "asc" ? cmp : -cmp;
    });
  }

  state.filteredRows = rows;
  const pages = Math.max(1, Math.ceil(rows.length / CONFIG.rowsPerPage));
  if (state.page > pages) state.page = pages;
  els.resultText.textContent = `${rows.length} ${rows.length === 1 ? "student" : "students"}`;
  renderActiveChips();
  renderPage();
}

function currentRows() {
  const start = (state.page - 1) * CONFIG.rowsPerPage;
  return state.filteredRows.slice(start, start + CONFIG.rowsPerPage);
}

function renderPage() {
  const rows = currentRows();
  const hasRows = rows.length > 0;
  els.cardView.hidden = state.view !== "cards";
  els.tableView.hidden = state.view !== "table" || window.innerWidth <= 720;

  if (state.view === "cards" || window.innerWidth <= 720) renderCards(rows);
  else renderTable(rows);

  const pages = Math.max(1, Math.ceil(state.filteredRows.length / CONFIG.rowsPerPage));
  els.pagination.hidden = !hasRows || pages <= 1;
  els.pageInfo.textContent = `${state.page} / ${pages}`;
  els.prevPage.disabled = state.page <= 1;
  els.nextPage.disabled = state.page >= pages;
}

function initials(name) {
  const parts = String(name || "Student").trim().split(/\s+/).filter(Boolean);
  return (parts.slice(0, 2).map(p => p[0]).join("") || "S").toUpperCase();
}

function roommateClass(value) {
  const v = normalize(value);
  if (/^yes\b|looking|need|want/.test(v)) return "yes";
  if (/maybe|possibly|not sure/.test(v)) return "maybe";
  return "";
}

function telegramInfo(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  if (/^https?:\/\/(t\.me|telegram\.me)\//i.test(raw)) {
    return { href: raw, label: raw.replace(/^https?:\/\/(t\.me|telegram\.me)\//i, "@").replace(/\/$/, "") };
  }
  if (/^(t\.me|telegram\.me)\//i.test(raw)) {
    const clean = raw.replace(/^(t\.me|telegram\.me)\//i, "").replace(/^@/, "").replace(/\/$/, "");
    return { href: `https://t.me/${encodeURIComponent(clean)}`, label: `@${clean}` };
  }
  const username = raw.replace(/^@/, "").trim();
  if (/^[a-zA-Z][a-zA-Z0-9_]{3,31}$/.test(username)) {
    return { href: `https://t.me/${encodeURIComponent(username)}`, label: `@${username}` };
  }
  if (/^\d{5,}$/.test(raw)) return { href: `tg://user?id=${raw}`, label: "Open Telegram" };
  return null;
}

function telegramIcon() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.7 3.3 2.9 10.2c-1.2.5-1.2 1.2-.2 1.5l4.6 1.4 1.7 5.2c.2.6.1.8.8.8.5 0 .8-.2 1-.4l2.3-2.2 4.8 3.5c.9.5 1.5.3 1.7-.8l3-14.1c.3-1.4-.5-2-1.9-1.5ZM8 12.8l9.9-6.2c.5-.3.9-.1.5.2l-8.2 7.4-.3 3.2-1.9-4.6Z"/></svg>';
}

function renderCards(rows) {
  els.cardView.innerHTML = "";
  if (!rows.length) return;

  const f = state.fields;
  rows.forEach(row => {
    const name = getCell(row, f.name) || "Polimi Student";
    const gender = getCell(row, f.gender);
    const program = getCell(row, f.program);
    const campus = getCell(row, f.campus);
    const degree = getCell(row, f.degree);
    const roommate = getCell(row, f.roommate);
    const about = getCell(row, f.about);
    const telegram = telegramInfo(getCell(row, f.telegram));

    const card = document.createElement("article");
    card.className = "student-card";
    const gClass = normalize(gender).includes("female") ? "female" : normalize(gender).includes("male") ? "male" : "";

    card.innerHTML = `
      <div class="card-top">
        <div class="identity">
          <div class="name-line">
            <h3>${escapeHtml(name)}</h3>
            ${gender ? `<span class="gender-badge ${gClass}">${escapeHtml(gender)}</span>` : ""}
          </div>
          ${program ? `<div class="program">${escapeHtml(program)}</div>` : ""}
        </div>
        <div class="avatar" aria-hidden="true">${escapeHtml(initials(name))}</div>
      </div>
      <div class="meta-row">
        ${campus ? `<span class="meta-pill"><b>Campus</b> ${escapeHtml(campus)}</span>` : ""}
        ${degree ? `<span class="meta-pill"><b>Degree</b> ${escapeHtml(degree)}</span>` : ""}
        ${roommate ? `<span class="meta-pill roommate ${roommateClass(roommate)}"><b>Roommate</b> ${escapeHtml(roommate)}</span>` : ""}
      </div>
      ${about ? `<div class="about-block"><span>About</span><p>${escapeHtml(about)}</p></div>` : ""}
      ${telegram ? `<div class="card-actions"><a class="telegram-link" href="${escapeHtml(telegram.href)}" target="_blank" rel="noopener noreferrer">${telegramIcon()}<span>Telegram · ${escapeHtml(telegram.label)}</span></a></div>` : ""}
    `;
    els.cardView.appendChild(card);
  });
}

function renderTable(rows) {
  const columns = publicColumns();
  els.tableHead.innerHTML = "";
  els.tableBody.innerHTML = "";

  const tr = document.createElement("tr");
  columns.forEach(column => {
    const th = document.createElement("th");
    th.textContent = column.label;
    th.addEventListener("click", () => {
      if (state.sort.index === column.index) state.sort.direction = state.sort.direction === "asc" ? "desc" : "asc";
      else state.sort = { index: column.index, direction: "asc" };
      applyPipeline();
    });
    tr.appendChild(th);
  });
  els.tableHead.appendChild(tr);

  rows.forEach(row => {
    const tr = document.createElement("tr");
    columns.forEach(column => {
      const td = document.createElement("td");
      const value = getCell(row, column);
      if (column.index === state.fields.name?.index) td.innerHTML = `<span class="table-name">${escapeHtml(value)}</span>`;
      else if (column.index === state.fields.telegram?.index) {
        const tg = telegramInfo(value);
        td.innerHTML = tg ? `<a class="table-telegram" href="${escapeHtml(tg.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(tg.label)}</a>` : "";
      } else td.textContent = value;
      tr.appendChild(td);
    });
    els.tableBody.appendChild(tr);
  });
}

function changePage(delta) {
  const pages = Math.max(1, Math.ceil(state.filteredRows.length / CONFIG.rowsPerPage));
  state.page = Math.min(pages, Math.max(1, state.page + delta));
  renderPage();
  document.querySelector(".directory")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function debounce(fn, wait) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
}

document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  setupTheme();
  setupEvents();
  setView(state.view);
  loadSheet();
});
