const CONFIG = {
  sheetId: "1-OQdEoogFykiQuKBvreFRFFujNtr7kuQBTma6aINgOE",
  sheetGid: "0",
  rowsPerPage: 24,
  defaultView: "cards",
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
};

const els = {};

function cacheElements() {
  [
    "connectionStatus", "themeToggle", "themeIcon", "statRows", "statVisible", "statPrograms", "statCampuses",
    "searchInput", "searchClear", "filterTrigger", "filterCount", "desktopFilters", "mobileFilters",
    "activeFilterChips", "clearFilters", "resultText", "cardView", "tableView", "tableHead", "tableBody",
    "cardViewBtn", "tableViewBtn", "pagination", "prevPage", "nextPage", "pageInfo", "filterSheet", "filterBackdrop",
    "filterClose", "sheetReset", "sheetApply", "mobileFilterButton", "mobileFilterBadge", "refreshButton", "updatedText"
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

function isHiddenColumn(column) {
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
  const preferredKeys = ["name", "gender", "program", "campus", "degree", "roommate"];
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
  els.refreshButton.addEventListener("click", loadSheet);

  [els.filterTrigger, els.mobileFilterButton].forEach(button => button.addEventListener("click", openFilterSheet));
  [els.filterBackdrop, els.filterClose, els.sheetApply].forEach(button => button.addEventListener("click", () => {
    renderDesktopFilters();
    renderActiveFilters();
    closeFilterSheet();
  }));
  els.sheetReset.addEventListener("click", () => {
    state.filters = {};
    state.page = 1;
    renderFilters();
    applyDataPipeline();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeFilterSheet();
    if (event.key === "/" && document.activeElement?.tagName !== "INPUT") {
      event.preventDefault();
      els.searchInput.focus();
    }
  });
}

function setStatus(type, text) {
  els.connectionStatus.className = `connection ${type || ""}`.trim();
  const label = els.connectionStatus.querySelector(".connection-text");
  if (label) label.textContent = text;
}

function openFilterSheet() {
  renderMobileFilters();
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

function setView(view) {
  state.view = view;
  els.cardViewBtn.classList.toggle("active", view === "cards");
  els.tableViewBtn.classList.toggle("active", view === "table");
  renderRows();
}

function loadSheet() {
  setStatus("", "Connecting");
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

    state.query = "";
    state.filters = {};
    state.sort = { index: null, direction: "asc" };
    state.page = 1;
    els.searchInput.value = "";
    els.searchClear.hidden = true;

    updateStatsBase();
    renderFilters();
    applyDataPipeline();
    setStatus("online", "Live");

    const now = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(new Date());
    els.updatedText.textContent = `Updated ${now}`;
  } catch (error) {
    showError(error.message || "Could not read the sheet.");
  }
}

function showError(message) {
  console.error(message);
  setStatus("error", "Offline");
  els.resultText.textContent = "Could not load student data. Check the Sheet sharing settings and refresh.";
  [els.statRows, els.statVisible, els.statPrograms, els.statCampuses].forEach(el => el.textContent = "—");
}

function updateStatsBase() {
  els.statRows.textContent = formatNumber(state.rows.length);
  const program = semanticColumn("program");
  const campus = semanticColumn("campus");
  els.statPrograms.textContent = formatNumber(uniqueValues(program).length);
  els.statCampuses.textContent = formatNumber(uniqueValues(campus).length);
}

function uniqueValues(column) {
  if (!column) return [];
  return [...new Set(state.rows.map(row => displayValue(row, column)).filter(Boolean))];
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
  getSlicerDefinitions().forEach(({ definition, column, values }) => {
    const group = document.createElement("section");
    group.className = "mobile-filter-group";
    const title = document.createElement("h3");
    title.textContent = definition.label;
    const options = document.createElement("div");
    options.className = "mobile-filter-options";
    const selected = state.filters[column.index] || new Set();

    values.forEach(value => {
      const label = document.createElement("label");
      label.className = "mobile-check";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = selected.has(value);
      input.addEventListener("change", () => toggleFilterValue(column.index, value, input.checked, false));
      const span = document.createElement("span");
      span.textContent = value;
      label.append(input, span);
      options.appendChild(label);
    });
    group.append(title, options);
    els.mobileFilters.appendChild(group);
  });
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

  if (state.sort.index !== null) {
    const index = state.sort.index;
    const direction = state.sort.direction === "asc" ? 1 : -1;
    rows = [...rows].sort((a, b) => compareCells(a[index], b[index]) * direction);
  }

  state.filteredRows = rows;
  const maxPage = Math.max(1, Math.ceil(rows.length / CONFIG.rowsPerPage));
  state.page = Math.min(state.page, maxPage);
  els.statVisible.textContent = formatNumber(rows.length);
  els.resultText.textContent = `${formatNumber(rows.length)} ${rows.length === 1 ? "student" : "students"}${state.rows.length !== rows.length ? ` of ${formatNumber(state.rows.length)}` : ""}`;
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
  const genderCol = semanticColumn("gender");
  const programCol = semanticColumn("program");
  const campusCol = semanticColumn("campus");
  const degreeCol = semanticColumn("degree");
  const roommateCol = semanticColumn("roommate");
  const coreIndexes = new Set([nameCol, genderCol, programCol, campusCol, degreeCol, roommateCol].filter(Boolean).map(c => c.index));
  const extras = visibleColumns().filter(c => !coreIndexes.has(c.index));

  rows.forEach((row, offset) => {
    const name = displayValue(row, nameCol) || `Student ${start + offset + 1}`;
    const gender = displayValue(row, genderCol);
    const program = displayValue(row, programCol) || "Program not specified";
    const campus = displayValue(row, campusCol) || "Not specified";
    const degree = displayValue(row, degreeCol) || "Not specified";
    const roommate = displayValue(row, roommateCol) || "Not specified";

    const card = document.createElement("article");
    card.className = "student-card";

    const head = document.createElement("div");
    head.className = "student-card-head";
    const avatar = document.createElement("div");
    avatar.className = "student-avatar";
    avatar.textContent = initials(name);
    const identity = document.createElement("div");
    identity.className = "student-identity";
    const title = document.createElement("h3");
    title.className = "student-name";
    title.textContent = name;
    const subline = document.createElement("div");
    subline.className = "student-subline";
    subline.textContent = "POLIMI · 2026/27";
    identity.append(title, subline);
    const badge = document.createElement("span");
    badge.className = `gender-badge ${genderClass(gender)}`;
    badge.textContent = gender || "Gender —";
    head.append(avatar, identity, badge);

    const programBlock = document.createElement("div");
    programBlock.className = "program-block";
    programBlock.innerHTML = `<span>Program</span><strong>${escapeHtml(program)}</strong>`;

    const facts = document.createElement("div");
    facts.className = "student-facts";
    facts.append(createFact("Campus", campus), createFact("Degree", degree));

    const roommateRow = document.createElement("div");
    roommateRow.className = "roommate-row";
    const roommateLabel = document.createElement("span");
    roommateLabel.textContent = "Looking for a roommate?";
    const roommateStatus = document.createElement("span");
    roommateStatus.className = `roommate-status ${roommateClass(roommate)}`;
    roommateStatus.textContent = roommate;
    roommateRow.append(roommateLabel, roommateStatus);

    card.append(head, programBlock, facts, roommateRow);

    const filledExtras = extras.filter(column => displayValue(row, column));
    if (filledExtras.length) {
      const more = document.createElement("details");
      more.className = "card-more";
      const summary = document.createElement("summary");
      summary.textContent = `More details · ${filledExtras.length}`;
      const extraWrap = document.createElement("div");
      extraWrap.className = "extra-fields";
      filledExtras.forEach(column => {
        const item = document.createElement("div");
        item.className = "extra-field";
        const label = document.createElement("span");
        label.textContent = shortHeader(column.label);
        const value = document.createElement("strong");
        renderCellContent(value, displayValue(row, column));
        item.append(label, value);
        extraWrap.appendChild(item);
      });
      more.append(summary, extraWrap);
      card.appendChild(more);
    }

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
    columns.forEach(column => {
      const td = document.createElement("td");
      renderCellContent(td, displayValue(row, column));
      tr.appendChild(td);
    });
    els.tableBody.appendChild(tr);
  });
}

function sortBy(index) {
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
  if (n === "full name") return "Name";
  return text.length > 28 ? `${text.slice(0, 26)}…` : text;
}

function initials(name) {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "P";
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
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
  setupTheme();
  setupEvents();
  setView(CONFIG.defaultView);
  loadSheet();
});
