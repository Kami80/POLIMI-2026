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
  slicers: [
    { key: "program", label: "Program name", aliases: ["program name", "programme name", "study program", "study programme", "program", "programme"] },
    { key: "gender", label: "Gender", aliases: ["gender", "sex"] },
    { key: "campus", label: "Campus", aliases: ["which campus are you primarily attending", "primary campus", "campus"] },
    { key: "roommate", label: "Want roommate", aliases: ["do you want a roommate", "want roommate", "roommate", "looking for roommate"] },
  ],
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
    "tableViewBtn", "cardViewBtn", "clearFilters", "resultText",
    "tableView", "tableHead", "tableBody", "cardView",
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
  els.refreshButton.addEventListener("click", loadSheet);

  document.addEventListener("keydown", event => {
    if (event.key === "/" && document.activeElement?.tagName !== "INPUT") {
      event.preventDefault();
      els.searchInput.focus();
    }
    if (event.key === "Escape") {
      els.filterRow.querySelectorAll("details.slicer[open]").forEach(item => item.open = false);
    }
  });

  document.addEventListener("click", event => {
    if (!els.filterRow.contains(event.target)) {
      els.filterRow.querySelectorAll("details.slicer[open]").forEach(item => item.open = false);
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
  els.resultText.textContent = "Could not load the sheet. Check sharing settings, then use Refresh data.";
  els.statRows.textContent = "—";
  els.statColumns.textContent = "—";
  els.statVisible.textContent = "—";
  els.statUpdated.textContent = "—";
  setStatus("error", "Offline");
  showState("idle");
}

function normalizeHeader(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function findSlicerColumn(definition) {
  const aliases = definition.aliases.map(normalizeHeader);

  // Prefer an exact header/alias match first.
  let column = state.columns.find(item => aliases.includes(normalizeHeader(item.label)));
  if (column) return column;

  // Then use a careful contains match so question-style headers still work.
  column = state.columns.find(item => {
    const header = normalizeHeader(item.label);
    return aliases.some(alias => header.includes(alias) || alias.includes(header));
  });

  // Final keyword fallbacks for long Google Form question headers.
  if (!column) {
    const keyword = { program: "program", gender: "gender", campus: "campus", roommate: "roommate" }[definition.key];
    if (keyword) column = state.columns.find(item => normalizeHeader(item.label).includes(keyword));
  }

  return column || null;
}

function getSlicerColumns() {
  return CONFIG.slicers
    .map(definition => {
      const column = findSlicerColumn(definition);
      if (!column) return null;

      const counts = new Map();
      state.rows.forEach(row => {
        const value = String(row[column.index]?.display ?? "").trim();
        if (!value) return;
        counts.set(value, (counts.get(value) || 0) + 1);
      });

      const unique = [...counts.keys()].sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
      );

      return { definition, column, unique, counts };
    })
    .filter(Boolean);
}

function renderFilters() {
  els.filterRow.innerHTML = "";
  const slicers = getSlicerColumns();

  if (!slicers.length) {
    const note = document.createElement("div");
    note.className = "filter-placeholder";
    note.textContent = "Slicer columns could not be detected in this sheet.";
    els.filterRow.appendChild(note);
    return;
  }

  const heading = document.createElement("div");
  heading.className = "slicer-heading";
  heading.innerHTML = `<span class="slicer-heading-icon">☷</span><span><strong>Slicers</strong><small>Choose one or more values</small></span>`;
  els.filterRow.appendChild(heading);

  slicers.forEach(({ definition, column, unique, counts }) => {
    const details = document.createElement("details");
    details.className = "slicer";
    details.dataset.columnIndex = String(column.index);
    details.addEventListener("toggle", () => {
      if (!details.open) return;
      els.filterRow.querySelectorAll("details.slicer[open]").forEach(other => {
        if (other !== details) other.open = false;
      });
    });

    const summary = document.createElement("summary");
    summary.className = "slicer-summary";

    const summaryMain = document.createElement("span");
    summaryMain.className = "slicer-summary-main";
    const title = document.createElement("span");
    title.className = "slicer-title";
    title.textContent = definition.label;
    const selection = document.createElement("span");
    selection.className = "slicer-selection";
    selection.dataset.slicerSelection = String(column.index);
    summaryMain.append(title, selection);

    const chevron = document.createElement("span");
    chevron.className = "slicer-chevron";
    chevron.textContent = "⌄";
    summary.append(summaryMain, chevron);
    details.appendChild(summary);

    const panel = document.createElement("div");
    panel.className = "slicer-panel";

    const panelHead = document.createElement("div");
    panelHead.className = "slicer-panel-head";
    const panelTitle = document.createElement("span");
    panelTitle.textContent = definition.label;
    const clear = document.createElement("button");
    clear.className = "slicer-clear";
    clear.type = "button";
    clear.textContent = "Clear";
    clear.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      delete state.filters[column.index];
      panel.querySelectorAll('input[type="checkbox"][data-value]').forEach(input => {
        input.checked = false;
      });
      const allInput = panel.querySelector('input[data-all="true"]');
      if (allInput) allInput.checked = true;
      updateSlicerSummary(column.index);
      state.page = 1;
      applyDataPipeline();
    });
    panelHead.append(panelTitle, clear);
    panel.appendChild(panelHead);

    const optionList = document.createElement("div");
    optionList.className = "slicer-options";

    const allLabel = document.createElement("label");
    allLabel.className = "slicer-option slicer-option-all";
    const allInput = document.createElement("input");
    allInput.type = "checkbox";
    allInput.dataset.all = "true";
    allInput.checked = !(state.filters[column.index]?.length);
    const allBox = document.createElement("span");
    allBox.className = "custom-checkbox";
    const allText = document.createElement("span");
    allText.className = "slicer-option-text";
    allText.textContent = "All";
    const allCount = document.createElement("span");
    allCount.className = "slicer-option-count";
    allCount.textContent = formatNumber(state.rows.length);
    allLabel.append(allInput, allBox, allText, allCount);
    optionList.appendChild(allLabel);

    allInput.addEventListener("change", () => {
      if (!allInput.checked) {
        allInput.checked = true;
        return;
      }
      delete state.filters[column.index];
      optionList.querySelectorAll('input[type="checkbox"][data-value]').forEach(input => {
        input.checked = false;
      });
      updateSlicerSummary(column.index);
      state.page = 1;
      applyDataPipeline();
    });

    unique.forEach(value => {
      const label = document.createElement("label");
      label.className = "slicer-option";

      const input = document.createElement("input");
      input.type = "checkbox";
      input.dataset.value = value;
      input.checked = (state.filters[column.index] || []).includes(value);

      const box = document.createElement("span");
      box.className = "custom-checkbox";
      const text = document.createElement("span");
      text.className = "slicer-option-text";
      text.textContent = value;
      text.title = value;
      const count = document.createElement("span");
      count.className = "slicer-option-count";
      count.textContent = formatNumber(counts.get(value) || 0);

      label.append(input, box, text, count);
      optionList.appendChild(label);

      input.addEventListener("change", () => {
        const selected = [...optionList.querySelectorAll('input[type="checkbox"][data-value]:checked')]
          .map(item => item.dataset.value);

        if (selected.length) state.filters[column.index] = selected;
        else delete state.filters[column.index];

        allInput.checked = selected.length === 0;
        updateSlicerSummary(column.index);
        state.page = 1;
        applyDataPipeline();
      });
    });

    panel.appendChild(optionList);
    details.appendChild(panel);
    els.filterRow.appendChild(details);

    updateSlicerSummary(column.index);
  });
}

function updateSlicerSummary(columnIndex) {
  const selectionEl = els.filterRow.querySelector(`[data-slicer-selection="${columnIndex}"]`);
  if (!selectionEl) return;

  const selected = state.filters[columnIndex] || [];
  if (!selected.length) {
    selectionEl.textContent = "All";
    selectionEl.classList.remove("active");
  } else if (selected.length === 1) {
    selectionEl.textContent = selected[0];
    selectionEl.classList.add("active");
  } else {
    selectionEl.textContent = `${selected.length} selected`;
    selectionEl.classList.add("active");
  }
}

function applyDataPipeline() {
  const query = state.query;
  const filterEntries = Object.entries(state.filters);

  let rows = state.rows.filter(row => {
    const matchesSearch = !query || row.some(cell => String(cell.display).toLowerCase().includes(query));
    if (!matchesSearch) return false;

    return filterEntries.every(([columnIndex, selectedValues]) => {
      const value = String(row[Number(columnIndex)]?.display ?? "").trim();
      return Array.isArray(selectedValues) && selectedValues.includes(value);
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
  if (!state.rows.length) {
    showState("idle");
    els.tableBody.innerHTML = "";
    els.cardView.innerHTML = "";
    els.pagination.hidden = true;
    return;
  }

  // Keep the selected data view visible even when filters/search return zero rows.
  // The compact result count already communicates the empty result, so no large
  // placeholder panel is needed.
  showState("data");
  renderTableHead();

  if (!state.filteredRows.length) {
    els.tableBody.innerHTML = "";
    els.cardView.innerHTML = "";
    els.pagination.hidden = true;
    return;
  }

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
