/*
  Polimi Students 2026/2027
  ---------------------------
  Change the CONFIG values below to personalize the site.
  The supplied spreadsheet is already connected.
*/

const CONFIG = {
  sheetId: "1-OQdEoogFykiQuKBvreFRFFujNtr7kuQBTma6aINgOE",
  sheetGid: "0",
  siteTitle: "Polimi Students\n2026/2027",
  siteSubtitle: "A calm, searchable and responsive view of your Google Sheet — always synced with the source.",
  brandName: "Polimi Students 2026/2027",
  rowsPerPage: 24,
  defaultView: "table",
  maxAutoFilters: 4,
  maxFilterOptions: 18,
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
};

const els = {};

function cacheElements() {
  [
    "brandText", "siteTitle", "siteSubtitle", "connectionStatus", "themeToggle", "themeIcon",
    "statRows", "statColumns", "statVisible", "statUpdated", "searchInput", "filterRow",
    "tableViewBtn", "cardViewBtn", "clearFilters", "resultText", "loadingState", "errorState",
    "errorMessage", "retryButton", "emptyState", "tableView", "tableHead", "tableBody", "cardView",
    "pagination", "prevPage", "nextPage", "pageInfo", "refreshButton"
  ].forEach(id => els[id] = document.getElementById(id));
}

function setupBranding() {
  els.brandText.textContent = CONFIG.brandName;
  els.siteTitle.innerHTML = escapeHtml(CONFIG.siteTitle).replace("\n", "<br>").replace("2026/2027", "<em>2026/2027</em>");
  els.siteSubtitle.textContent = CONFIG.siteSubtitle;
  document.title = CONFIG.brandName;
}

function setupTheme() {
  const stored = localStorage.getItem("cozy-sheet-theme");
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  const theme = stored || (prefersDark ? "dark" : "light");
  applyTheme(theme);

  els.themeToggle.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(next);
    localStorage.setItem("cozy-sheet-theme", next);
  });
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  els.themeIcon.textContent = theme === "dark" ? "☀" : "☾";
  els.themeToggle.setAttribute("aria-label", theme === "dark" ? "Use light mode" : "Use dark mode");
}

function setupEvents() {
  els.searchInput.addEventListener("input", debounce(event => {
    state.query = event.target.value.trim().toLowerCase();
    state.page = 1;
    applyDataPipeline();
  }, 120));

  [els.tableViewBtn, els.cardViewBtn].forEach(button => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });

  els.clearFilters.addEventListener("click", () => {
    state.query = "";
    state.filters = {};
    state.page = 1;
    els.searchInput.value = "";
    renderFilters();
    applyDataPipeline();
  });

  els.prevPage.addEventListener("click", () => changePage(-1));
  els.nextPage.addEventListener("click", () => changePage(1));
  els.retryButton.addEventListener("click", loadSheet);
  els.refreshButton.addEventListener("click", loadSheet);

  document.addEventListener("keydown", event => {
    if (event.key === "/" && document.activeElement?.tagName !== "INPUT") {
      event.preventDefault();
      els.searchInput.focus();
    }
  });
}

function setView(view) {
  state.view = view;
  els.tableViewBtn.classList.toggle("active", view === "table");
  els.cardViewBtn.classList.toggle("active", view === "cards");
  renderRows();
}

function setStatus(type, text) {
  els.connectionStatus.className = `status-pill ${type || ""}`.trim();
  els.connectionStatus.querySelector("span:last-child").textContent = text;
}

function showState(kind) {
  els.loadingState.hidden = kind !== "loading";
  els.errorState.hidden = kind !== "error";
  els.emptyState.hidden = kind !== "empty";
  const showData = kind === "data";
  els.tableView.hidden = !showData || state.view !== "table";
  els.cardView.hidden = !showData || state.view !== "cards";
}

function loadSheet() {
  showState("loading");
  setStatus("", "Connecting…");
  els.resultText.textContent = "Loading your sheet…";
  els.pagination.hidden = true;

  if (!window.google?.charts) {
    showError("The Google data loader could not start. Check your internet connection or content-blocking settings.");
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
    const details = [response.getMessage(), response.getDetailedMessage()].filter(Boolean).join(" — ");
    showError(details || "Google Sheets returned an error.");
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

    state.rows = Array.from({ length: rowCount }, (_, rowIndex) => {
      return state.columns.map(column => {
        const raw = data.getValue(rowIndex, column.index);
        const formatted = data.getFormattedValue(rowIndex, column.index);
        return {
          raw,
          display: formatted ?? (raw == null ? "" : String(raw)),
        };
      });
    }).filter(row => row.some(cell => String(cell.display).trim() !== ""));

    state.query = "";
    state.filters = {};
    state.sort = { index: null, direction: "asc" };
    state.page = 1;
    els.searchInput.value = "";

    els.statRows.textContent = formatNumber(state.rows.length);
    els.statColumns.textContent = formatNumber(state.columns.length);
    els.statUpdated.textContent = new Intl.DateTimeFormat(undefined, {
      hour: "2-digit", minute: "2-digit"
    }).format(new Date());

    renderFilters();
    applyDataPipeline();
    setStatus("online", "Live");
  } catch (error) {
    showError(error.message || "The sheet loaded, but the data could not be read.");
  }
}

function showError(message) {
  console.error("Sheet error:", message);
  els.errorMessage.textContent = `${message} Make sure the spreadsheet is shared as “Anyone with the link · Viewer”.`;
  els.resultText.textContent = "Data unavailable";
  els.statRows.textContent = "—";
  els.statColumns.textContent = "—";
  els.statVisible.textContent = "—";
  els.statUpdated.textContent = "—";
  setStatus("error", "Offline");
  showState("error");
}

function getAutoFilterColumns() {
  return state.columns
    .map(column => {
      const values = state.rows
        .map(row => String(row[column.index]?.display ?? "").trim())
        .filter(Boolean);
      const unique = [...new Set(values)];
      const ratio = values.length ? unique.length / values.length : 1;
      return { column, unique, ratio };
    })
    .filter(item => item.unique.length >= 2 && item.unique.length <= CONFIG.maxFilterOptions && item.ratio <= 0.65)
    .sort((a, b) => a.unique.length - b.unique.length)
    .slice(0, CONFIG.maxAutoFilters);
}

function renderFilters() {
  els.filterRow.innerHTML = "";
  const filterColumns = getAutoFilterColumns();

  if (!filterColumns.length) {
    const note = document.createElement("div");
    note.className = "filter-placeholder";
    note.textContent = "Search is ready. Categorical filters will appear automatically when suitable columns are found.";
    els.filterRow.appendChild(note);
    return;
  }

  filterColumns.forEach(({ column, unique }) => {
    const wrap = document.createElement("div");
    wrap.className = "filter-select-wrap";

    const select = document.createElement("select");
    select.className = "filter-select";
    select.setAttribute("aria-label", `Filter by ${column.label}`);

    const all = document.createElement("option");
    all.value = "";
    all.textContent = `${column.label}: All`;
    select.appendChild(all);

    unique
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }))
      .forEach(value => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
      });

    select.value = state.filters[column.index] || "";
    select.addEventListener("change", event => {
      const value = event.target.value;
      if (value) state.filters[column.index] = value;
      else delete state.filters[column.index];
      state.page = 1;
      applyDataPipeline();
    });

    wrap.appendChild(select);
    els.filterRow.appendChild(wrap);
  });
}

function applyDataPipeline() {
  const query = state.query;
  const filterEntries = Object.entries(state.filters);

  let rows = state.rows.filter(row => {
    const matchesSearch = !query || row.some(cell => String(cell.display).toLowerCase().includes(query));
    if (!matchesSearch) return false;

    return filterEntries.every(([columnIndex, expected]) => {
      return String(row[Number(columnIndex)]?.display ?? "").trim() === expected;
    });
  });

  if (state.sort.index !== null) {
    const { index, direction } = state.sort;
    const factor = direction === "asc" ? 1 : -1;
    rows = [...rows].sort((a, b) => compareCells(a[index], b[index]) * factor);
  }

  state.filteredRows = rows;
  const maxPage = Math.max(1, Math.ceil(rows.length / CONFIG.rowsPerPage));
  if (state.page > maxPage) state.page = maxPage;

  els.statVisible.textContent = formatNumber(rows.length);
  els.clearFilters.hidden = !(state.query || filterEntries.length);
  els.resultText.textContent = buildResultText(rows.length);

  renderRows();
}

function compareCells(a, b) {
  const aRaw = a?.raw;
  const bRaw = b?.raw;

  if (aRaw instanceof Date && bRaw instanceof Date) return aRaw - bRaw;
  if (typeof aRaw === "number" && typeof bRaw === "number") return aRaw - bRaw;

  return String(a?.display ?? "").localeCompare(String(b?.display ?? ""), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function buildResultText(count) {
  if (!state.rows.length) return "The sheet is connected, but it has no data rows yet.";
  const noun = count === 1 ? "record" : "records";
  if (count === state.rows.length && !state.query && !Object.keys(state.filters).length) {
    return `${formatNumber(count)} ${noun} · click any column heading to sort`;
  }
  return `${formatNumber(count)} ${noun} match your current view`;
}

function renderRows() {
  if (!state.rows.length || !state.filteredRows.length) {
    showState(state.rows.length ? "empty" : "empty");
    els.pagination.hidden = true;
    return;
  }

  showState("data");
  renderTableHead();

  const start = (state.page - 1) * CONFIG.rowsPerPage;
  const end = start + CONFIG.rowsPerPage;
  const pageRows = state.filteredRows.slice(start, end);

  if (state.view === "table") renderTable(pageRows, start);
  else renderCards(pageRows, start);

  renderPagination();
}

function renderTableHead() {
  els.tableHead.innerHTML = "";
  const tr = document.createElement("tr");

  state.columns.forEach(column => {
    const th = document.createElement("th");
    const isSorted = state.sort.index === column.index;
    th.classList.toggle("sorted", isSorted);
    th.innerHTML = `<span>${escapeHtml(column.label)}</span><span class="sort-indicator">${isSorted ? (state.sort.direction === "asc" ? "↑" : "↓") : "↕"}</span>`;
    th.addEventListener("click", () => sortByColumn(column.index));
    tr.appendChild(th);
  });

  els.tableHead.appendChild(tr);
}

function renderTable(rows) {
  els.tableBody.innerHTML = "";
  const fragment = document.createDocumentFragment();

  rows.forEach(row => {
    const tr = document.createElement("tr");
    row.forEach(cell => {
      const td = document.createElement("td");
      td.dir = "auto";
      renderCellContent(td, cell.display);
      tr.appendChild(td);
    });
    fragment.appendChild(tr);
  });

  els.tableBody.appendChild(fragment);
}

function renderCards(rows, offset) {
  els.cardView.innerHTML = "";
  const fragment = document.createDocumentFragment();

  rows.forEach((row, rowIndex) => {
    const card = document.createElement("article");
    card.className = "record-card";

    const index = document.createElement("span");
    index.className = "record-index";
    index.textContent = `#${offset + rowIndex + 1}`;
    card.appendChild(index);

    const title = document.createElement("h3");
    title.className = "record-title";
    title.dir = "auto";
    const titleValue = firstUsefulCell(row)?.display || `Record ${offset + rowIndex + 1}`;
    title.textContent = titleValue;
    card.appendChild(title);

    const dl = document.createElement("dl");
    dl.className = "record-fields";

    state.columns.forEach((column, colIndex) => {
      const value = row[colIndex]?.display;
      if (!String(value ?? "").trim()) return;

      const group = document.createElement("div");
      group.className = "record-field";
      const dt = document.createElement("dt");
      dt.textContent = column.label;
      const dd = document.createElement("dd");
      dd.dir = "auto";
      renderCellContent(dd, value);
      group.append(dt, dd);
      dl.appendChild(group);
    });

    card.appendChild(dl);
    fragment.appendChild(card);
  });

  els.cardView.appendChild(fragment);
}

function firstUsefulCell(row) {
  return row.find(cell => String(cell?.display ?? "").trim()) || null;
}

function renderCellContent(container, value) {
  const text = String(value ?? "").trim();
  if (!text) {
    const span = document.createElement("span");
    span.className = "cell-muted";
    span.textContent = "—";
    container.appendChild(span);
    return;
  }

  if (isImageUrl(text)) {
    const img = document.createElement("img");
    img.className = "cell-image";
    img.src = text;
    img.alt = "Sheet image";
    img.loading = "lazy";
    img.referrerPolicy = "no-referrer";
    img.addEventListener("error", () => {
      img.replaceWith(document.createTextNode(text));
    });
    container.appendChild(img);
    return;
  }

  if (isUrl(text)) {
    const a = document.createElement("a");
    a.className = "cell-link";
    a.href = text;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = tidyUrl(text);
    container.appendChild(a);
    return;
  }

  if (isEmail(text)) {
    const a = document.createElement("a");
    a.className = "cell-link";
    a.href = `mailto:${text}`;
    a.textContent = text;
    container.appendChild(a);
    return;
  }

  container.textContent = text;
}

function sortByColumn(index) {
  if (state.sort.index === index) {
    state.sort.direction = state.sort.direction === "asc" ? "desc" : "asc";
  } else {
    state.sort.index = index;
    state.sort.direction = "asc";
  }
  state.page = 1;
  applyDataPipeline();
}

function renderPagination() {
  const totalPages = Math.max(1, Math.ceil(state.filteredRows.length / CONFIG.rowsPerPage));
  els.pagination.hidden = totalPages <= 1;
  els.prevPage.disabled = state.page <= 1;
  els.nextPage.disabled = state.page >= totalPages;
  els.pageInfo.textContent = `Page ${state.page} of ${totalPages}`;
}

function changePage(delta) {
  const totalPages = Math.max(1, Math.ceil(state.filteredRows.length / CONFIG.rowsPerPage));
  state.page = Math.min(totalPages, Math.max(1, state.page + delta));
  renderRows();
  document.querySelector(".result-meta")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function isUrl(value) {
  return /^https?:\/\/[^\s]+$/i.test(value);
}

function isImageUrl(value) {
  return isUrl(value) && /\.(png|jpe?g|webp|gif|avif)(\?.*)?$/i.test(value);
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function tidyUrl(value) {
  try {
    const url = new URL(value);
    return `${url.hostname.replace(/^www\./, "")}${url.pathname === "/" ? "" : url.pathname}`;
  } catch {
    return value;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatNumber(value) {
  return new Intl.NumberFormat().format(value);
}

function debounce(fn, delay = 150) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

function init() {
  cacheElements();
  setupBranding();
  setupTheme();
  setupEvents();
  setView(CONFIG.defaultView);
  loadSheet();
}

document.addEventListener("DOMContentLoaded", init);
