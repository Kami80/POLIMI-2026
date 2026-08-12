/* Polimi Students · UX enhancement layer (2026-08-11)
   Keeps the core app intact while adding profile browsing, smarter filtering,
   personalized sorting/groups, continuity, freshness and one-time hints.
*/
(() => {
  const UX_PREFS_KEY = "polimi-directory-preferences-v2";
  const INLINE_HINT_KEY = "polimi-inline-hints-seen-v1";
  const LAST_SYNC_KEY = "polimi-last-live-sync-v1";

  const PROGRAM_GROUPS = [
    { program: "Biomedical Engineering", url: "https://t.me/+AFwhBgOX24M5Mjg8" },
    { program: "Electrical Engineering", url: "https://t.me/ElecEngPolimi" },
    { program: "Chemical Engineering", url: "https://t.me/+E-ZbMJk_9FthYTY0" },
  ];
  const FREE_FORUM = { program: "Polimi Free Forum", url: "https://t.me/+hVdotxBWIWUwMDU0" };

  state.profileReturnScrollY = 0;
  state.profileReturnSlug = "";
  state.searchSuggestionIndex = -1;
  state.lastNonRoommateSort = "recommended";

  const baseOpenStudentProfile = openStudentProfile;
  const baseCloseStudentProfile = closeStudentProfile;
  const baseRenderCards = renderCards;
  const baseRenderStudentProfile = renderStudentProfile;
  const baseUpdateEmptyStateCopy = updateEmptyStateCopy;
  const baseHandleSheetResponse = handleSheetResponse;
  const baseShowError = showError;
  const baseUpdateRoommateMatchUI = updateRoommateMatchUI;
  const baseUnlockDirectory = unlockDirectory;

  function sameValue(a, b) {
    return normalize(a) === normalize(b) && Boolean(normalize(a));
  }

  function relativeAge(ms) {
    if (!Number.isFinite(ms) || ms < 0) return "just now";
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    if (ms < minute) return "just now";
    if (ms < hour) return `${Math.max(1, Math.round(ms / minute))}m ago`;
    if (ms < day) return `${Math.max(1, Math.round(ms / hour))}h ago`;
    return `${Math.max(1, Math.round(ms / day))}d ago`;
  }

  function getCachedSavedAt() {
    try {
      const cached = JSON.parse(localStorage.getItem(SHEET_CACHE_KEY) || "null");
      return Number(cached?.savedAt || 0);
    } catch (_) { return 0; }
  }

  function updateFreshnessUI(forceOffline = !navigator.onLine) {
    const liveAt = Number(localStorage.getItem(LAST_SYNC_KEY) || 0);
    const cachedAt = getCachedSavedAt();
    const reference = liveAt || cachedAt;
    if (forceOffline || state.isOfflineCache) {
      const age = reference ? relativeAge(Date.now() - reference) : "earlier";
      setStatus("", `Offline · saved ${age}`);
      if (els.updatedText) els.updatedText.textContent = `Offline · showing data saved ${age}`;
      return;
    }
    if (reference) {
      const age = relativeAge(Date.now() - reference);
      setStatus("online", age === "just now" ? "Live" : `Live · ${age}`);
      if (els.updatedText) els.updatedText.textContent = age === "just now" ? "Updated just now" : `Updated ${age}`;
    }
  }

  handleSheetResponse = function(response) {
    baseHandleSheetResponse(response);
    try {
      if (!response?.isError?.() && state.sheetReady && !state.isOfflineCache) {
        localStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
      }
    } catch (_) {}
    updateFreshnessUI(false);
    renderTelegramRecommendations();
  };

  showError = function(message) {
    baseShowError(message);
    updateFreshnessUI(true);
  };

  unlockDirectory = function(email) {
    baseUnlockDirectory(email);
    updateFreshnessUI(!navigator.onLine || state.isOfflineCache);
    renderTelegramRecommendations();
    maybeShowInlineHint();
  };

  function maybeShowInlineHint() {
    const hint = document.getElementById("firstUseHint");
    if (!hint || localStorage.getItem(INLINE_HINT_KEY) === "1") return;
    // Prefer the lightweight inline hint over the older modal welcome tour.
    try { localStorage.setItem(ONBOARDING_KEY, "1"); } catch (_) {}
    window.setTimeout(() => { if (state.authorized) hint.hidden = false; }, 350);
  }

  function dismissInlineHint() {
    localStorage.setItem(INLINE_HINT_KEY, "1");
    const hint = document.getElementById("firstUseHint");
    if (hint) hint.hidden = true;
  }

  /* ---------- profile continuity + previous / next ---------- */
  openStudentProfile = function(row, options = {}) {
    const alreadyOpen = els.profileSheet?.classList.contains("open");
    if (!alreadyOpen) {
      state.profileReturnScrollY = window.scrollY;
      state.profileReturnSlug = studentSlug(row);
    }
    baseOpenStudentProfile(row, options);
    updateProfileBrowserNav();
  };

  closeStudentProfile = function(options = {}) {
    const returnY = state.profileReturnScrollY;
    const returnSlug = state.profileReturnSlug;
    baseCloseStudentProfile(options);
    window.requestAnimationFrame(() => {
      if (Number.isFinite(returnY)) window.scrollTo({ top: returnY, behavior: "auto" });
      if (returnSlug) document.querySelector(`[data-student-slug="${CSS.escape(returnSlug)}"]`)?.focus({ preventScroll: true });
    });
  };

  function profileBrowseRows() {
    const filtered = Array.isArray(state.filteredRows) && state.filteredRows.length ? state.filteredRows : state.rows;
    return filtered.length ? filtered : state.rows;
  }

  function activeProfileIndex() {
    const rows = profileBrowseRows();
    return rows.findIndex(row => studentSlug(row) === state.activeProfileSlug);
  }

  function updateProfileBrowserNav() {
    const rows = profileBrowseRows();
    const index = activeProfileIndex();
    const prev = document.getElementById("profilePrev");
    const next = document.getElementById("profileNext");
    const position = document.getElementById("profilePosition");
    if (position) position.textContent = index >= 0 ? `${index + 1} / ${rows.length}` : `— / ${rows.length}`;
    if (prev) prev.disabled = index <= 0;
    if (next) next.disabled = index < 0 || index >= rows.length - 1;
  }

  function navigateProfile(direction) {
    if (!els.profileSheet?.classList.contains("open")) return;
    const rows = profileBrowseRows();
    const index = activeProfileIndex();
    if (index < 0) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= rows.length) return;
    const target = rows[targetIndex];
    const page = Math.floor(targetIndex / CONFIG.rowsPerPage) + 1;
    if (state.filteredRows.includes(target) && page !== state.page) {
      state.page = page;
      persistDirectoryPreferences();
      renderRows();
    }
    baseOpenStudentProfile(target, { syncUrl: true });
    updateProfileBrowserNav();
  }

  /* ---------- active filter chips ---------- */
  renderActiveFilters = function() {
    if (!els.activeFilterChips) return;
    els.activeFilterChips.innerHTML = "";
    const own = currentUserRow();
    const ownProgram = own ? displayValue(own, semanticColumn("program")) : "";
    const ownCampus = own ? displayValue(own, semanticColumn("campus")) : "";
    const programCol = semanticColumn("program");
    const campusCol = semanticColumn("campus");
    const roommateCol = semanticColumn("roommate");

    const makeChip = (label, onRemove, className = "") => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `active-chip active-chip-removable ${className}`.trim();
      button.innerHTML = `<span>${escapeHtml(label)}</span><b class="material-symbols-rounded" aria-hidden="true">close</b>`;
      button.setAttribute("aria-label", `Remove filter ${label}`);
      button.addEventListener("click", onRemove);
      els.activeFilterChips.appendChild(button);
    };

    if (state.query) {
      makeChip(`Search: ${state.query}`, () => {
        state.query = ""; state.page = 1; els.searchInput.value = ""; els.searchClear.hidden = true;
        persistDirectoryPreferences(); applyDataPipeline();
      }, "search-chip");
    }

    Object.entries(state.filters).forEach(([index, values]) => {
      const column = state.columns[Number(index)];
      values.forEach(value => {
        let label = value;
        if (programCol && Number(index) === programCol.index && sameValue(value, ownProgram)) label = `Classmates · ${value}`;
        else if (campusCol && Number(index) === campusCol.index && sameValue(value, ownCampus)) label = `Same campus · ${value}`;
        else if (roommateCol && Number(index) === roommateCol.index) label = `Roommates · ${value}`;
        makeChip(label, () => {
          const selected = state.filters[index];
          selected?.delete(value);
          if (!selected?.size) delete state.filters[index];
          state.page = 1;
          persistDirectoryPreferences(); renderFilters(); renderQuickFilters(); applyDataPipeline();
        });
      });
    });

    if (state.roommateMatchMode) {
      makeChip("Best roommate matches", () => exitRoommateMatchMode(), "mode-chip");
    }
    if (state.savedOnly) makeChip("Saved students", () => exitSavedMode(), "mode-chip");

    const hasAny = activeFilterCount() > 0 || Boolean(state.query) || state.roommateMatchMode || state.savedOnly;
    els.clearFilters.hidden = !hasAny;
    if (!els.clearFilters.hidden) els.clearFilters.textContent = "Clear all";
    els.resultsBar?.classList.toggle("has-active", hasAny);
    updateFilterBadges();
  };

  /* ---------- personalized sorting ---------- */
  function personalizedScore(row, mode) {
    const own = currentUserRow();
    if (!own || row === own) return row === own ? 2 : 0;
    const sameProgram = sameValue(displayValue(row, semanticColumn("program")), displayValue(own, semanticColumn("program")));
    const sameCampus = sameValue(displayValue(row, semanticColumn("campus")), displayValue(own, semanticColumn("campus")));
    if (mode === "same-program") return (sameProgram ? 100 : 0) + (sameCampus ? 10 : 0);
    if (mode === "same-campus") return (sameCampus ? 100 : 0) + (sameProgram ? 10 : 0);
    return (sameProgram ? 100 : 0) + (sameCampus ? 70 : 0) + (isRecentStudent(row) ? 5 : 0);
  }

  sortRowsByMode = function(rows, mode) {
    const nameCol = semanticColumn("name");
    const copy = [...rows];
    if (mode === "name") return copy.sort((a, b) => displayValue(a, nameCol).localeCompare(displayValue(b, nameCol), undefined, { sensitivity: "base" }));
    if (["recommended", "same-program", "same-campus"].includes(mode)) {
      return copy.sort((a, b) => personalizedScore(b, mode) - personalizedScore(a, mode) || timestampValue(b) - timestampValue(a) || displayValue(a, nameCol).localeCompare(displayValue(b, nameCol), undefined, { sensitivity: "base" }));
    }
    return copy.sort((a, b) => timestampValue(b) - timestampValue(a) || displayValue(a, nameCol).localeCompare(displayValue(b, nameCol), undefined, { sensitivity: "base" }));
  };

  updateRoommateMatchUI = function() {
    baseUpdateRoommateMatchUI();
    const select = els.sortSelect;
    if (!select) return;
    const best = select.querySelector('option[value="best"]');
    if (state.roommateMatchMode) {
      state.lastNonRoommateSort = state.sortMode === "best" ? "recommended" : state.sortMode;
      if (best) best.hidden = false;
      select.value = "best";
      select.disabled = true;
      select.closest(".sort-control")?.classList.add("best-match-active");
    } else {
      if (best) best.hidden = true;
      select.disabled = false;
      if (state.sortMode === "best") state.sortMode = state.lastNonRoommateSort || "recommended";
      select.value = state.sortMode;
      select.closest(".sort-control")?.classList.remove("best-match-active");
    }
  };

  /* ---------- preferences including page ---------- */
  persistDirectoryPreferences = function() {
    if (!state.columns.length) return;
    try {
      const filters = Object.entries(state.filters).map(([index, values]) => ({
        label: state.columns[Number(index)]?.label || "",
        values: [...values]
      })).filter(item => item.label && item.values.length);
      localStorage.setItem(UX_PREFS_KEY, JSON.stringify({
        query: state.query,
        view: state.view,
        filters,
        roommateMatchMode: state.roommateMatchMode,
        sortMode: state.sortMode,
        page: state.page,
      }));
      // Keep the legacy key synchronized for downgrade compatibility.
      localStorage.setItem(PREFS_KEY, JSON.stringify({ query: state.query, view: state.view, filters, roommateMatchMode: state.roommateMatchMode, sortMode: state.sortMode }));
    } catch (_) {}
  };

  restoreDirectoryPreferences = function() {
    state.query = "";
    state.filters = {};
    state.view = CONFIG.defaultView;
    state.roommateMatchMode = false;
    state.roommateReferenceRow = null;
    state.savedOnly = false;
    state.sortMode = "recommended";
    state.page = 1;
    try {
      const saved = JSON.parse(localStorage.getItem(UX_PREFS_KEY) || localStorage.getItem(PREFS_KEY) || "null");
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
        if (["recommended", "recent", "name", "same-program", "same-campus"].includes(saved.sortMode)) state.sortMode = saved.sortMode;
        state.page = Math.max(1, Number(saved.page) || 1);
        if (saved.roommateMatchMode) {
          const reference = currentUserRow();
          if (reference) { state.roommateMatchMode = true; state.roommateReferenceRow = reference; }
        }
      }
    } catch (_) {}
    els.searchInput.value = state.query;
    els.searchClear.hidden = !state.query;
    els.cardViewBtn.classList.toggle("active", state.view === "cards");
    els.tableViewBtn.classList.toggle("active", state.view === "table");
    if (els.sortSelect) els.sortSelect.value = state.roommateMatchMode ? "best" : state.sortMode;
    state.preferencesRestored = true;
  };

  goToPage = function(page) {
    const pages = Math.max(1, Math.ceil(state.filteredRows.length / CONFIG.rowsPerPage));
    state.page = Math.max(1, Math.min(pages, Number(page) || 1));
    persistDirectoryPreferences();
    renderRows();
    const target = document.querySelector(".results-bar") || document.getElementById("cardView") || document.getElementById("directory");
    if (target) {
      const top = target.getBoundingClientRect().top + window.scrollY - 92;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    }
  };

  /* ---------- recently updated ---------- */
  function parsedDateFromColumn(row, column) {
    if (!column) return 0;
    const cell = row[column.index];
    const date = cell?.raw instanceof Date ? cell.raw : new Date(cell?.display || cell?.raw || "");
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
  }

  function isRecentlyUpdated(row) {
    const updatedCol = matchColumn(["last updated", "updated at", "last modified", "modified at", "update timestamp", "updated"]);
    const submitted = timestampValue(row);
    const updated = parsedDateFromColumn(row, updatedCol);
    const week = 7 * 24 * 60 * 60 * 1000;
    if (updated && (!submitted || updated - submitted > 60 * 1000) && Date.now() - updated >= 0 && Date.now() - updated <= week) return true;

    const emailCol = semanticColumn("email");
    if (!emailCol) return false;
    const email = normalizeEmail(displayValue(row, emailCol));
    if (!email) return false;
    const same = state.rows.filter(candidate => normalizeEmail(displayValue(candidate, emailCol)) === email);
    if (same.length < 2) return false;
    const latest = same.reduce((best, candidate) => timestampValue(candidate) > timestampValue(best) ? candidate : best, same[0]);
    return latest === row && Date.now() - timestampValue(row) >= 0 && Date.now() - timestampValue(row) <= week;
  }

  renderStudentProfile = function(row) {
    baseRenderStudentProfile(row);
    if (!row || isCreatorRow(row) || !isRecentlyUpdated(row)) return;
    const badges = els.profileBody?.querySelector(".profile-badges");
    if (badges && !badges.querySelector(".profile-updated-badge")) {
      const badge = document.createElement("span");
      badge.className = "profile-updated-badge";
      badge.textContent = "Updated recently";
      badges.appendChild(badge);
    }
  };

  renderCards = function(rows, start) {
    baseRenderCards(rows, start);
  };

  /* ---------- Telegram recommendation ---------- */
  function matchedProgramGroup(program) {
    const n = normalize(program);
    if (!n) return null;
    return PROGRAM_GROUPS.find(group => normalize(group.program) === n || n.includes(normalize(group.program)) || normalize(group.program).includes(n)) || null;
  }

  function telegramLinkCard(group, label, pinned = false) {
    const a = document.createElement("a");
    a.className = `telegram-recommendation-card${pinned ? " pinned" : ""}`;
    a.href = group.url;
    a.rel = "external noopener noreferrer";
    a.innerHTML = `<span class="telegram-recommendation-icon material-symbols-rounded" aria-hidden="true">send</span><span><small>${escapeHtml(label)}</small><strong>${escapeHtml(group.program)}</strong></span><b class="material-symbols-rounded" aria-hidden="true">arrow_forward</b>`;
    a.addEventListener("click", event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      window.location.href = group.url;
    });
    return a;
  }

  function renderTelegramRecommendations() {
    const host = document.getElementById("telegramRecommendations");
    if (!host || !state.authorized || !state.sheetReady) return;
    const own = currentUserRow();
    if (!own) { host.hidden = true; return; }
    const program = displayValue(own, semanticColumn("program"));
    const programGroup = matchedProgramGroup(program);
    host.innerHTML = "";
    const heading = document.createElement("div");
    heading.className = "telegram-recommendation-heading";
    heading.innerHTML = `<span>YOUR COMMUNITIES</span><a href="groups.html">See all communities <span class="material-symbols-rounded" aria-hidden="true">arrow_forward</span></a>`;
    const cards = document.createElement("div");
    cards.className = "telegram-recommendation-cards";
    if (programGroup) cards.appendChild(telegramLinkCard(programGroup, "Your program community"));
    cards.appendChild(telegramLinkCard(FREE_FORUM, "Main community", true));
    host.append(heading, cards);
    host.hidden = false;
  }

  /* ---------- search suggestions ---------- */
  function suggestionPool() {
    const specs = [
      { key: "program", label: "Program" },
      { key: "campus", label: "Campus" },
      { key: "name", label: "Student" },
    ];
    const results = [];
    specs.forEach(spec => {
      const col = semanticColumn(spec.key);
      if (!col) return;
      const seen = new Set();
      state.rows.forEach(row => {
        const value = displayValue(row, col);
        const n = normalize(value);
        if (!value || seen.has(n)) return;
        seen.add(n);
        results.push({ key: spec.key, type: spec.label, value, column: col });
      });
    });
    return results;
  }

  function hideSearchSuggestions() {
    const box = document.getElementById("searchSuggestions");
    if (!box) return;
    box.hidden = true; box.innerHTML = ""; state.searchSuggestionIndex = -1;
    els.searchInput?.setAttribute("aria-expanded", "false");
  }

  function showSearchSuggestions() {
    const box = document.getElementById("searchSuggestions");
    if (!box || !state.sheetReady) return;
    const q = searchNormalize(els.searchInput.value);
    if (q.length < 2) { hideSearchSuggestions(); return; }
    const tokens = q.split(" ").filter(Boolean);
    const matches = suggestionPool().filter(item => {
      const v = searchNormalize(item.value);
      return tokens.every(token => v.includes(token));
    }).sort((a, b) => {
      const av = searchNormalize(a.value), bv = searchNormalize(b.value);
      return (av.startsWith(q) ? -2 : 0) - (bv.startsWith(q) ? -2 : 0) || a.type.localeCompare(b.type) || a.value.localeCompare(b.value);
    }).slice(0, 7);
    if (!matches.length) { hideSearchSuggestions(); return; }
    box.innerHTML = "";
    matches.forEach((item, index) => {
      const button = document.createElement("button");
      button.type = "button"; button.className = "search-suggestion"; button.dataset.suggestionIndex = String(index);
      button.setAttribute("role", "option");
      button.innerHTML = `<span><small>${escapeHtml(item.type)}</small><strong>${escapeHtml(item.value)}</strong></span><b class="material-symbols-rounded" aria-hidden="true">keyboard_return</b>`;
      button.addEventListener("mousedown", event => event.preventDefault());
      button.addEventListener("click", () => applySuggestion(item));
      box.appendChild(button);
    });
    box.hidden = false;
    els.searchInput?.setAttribute("aria-expanded", "true");
    state.searchSuggestionIndex = -1;
  }

  function applySuggestion(item) {
    if (["program", "campus"].includes(item.key)) {
      state.query = ""; els.searchInput.value = ""; els.searchClear.hidden = true;
      state.filters[item.column.index] = new Set([item.value]);
    } else {
      state.query = item.value.toLowerCase();
      els.searchInput.value = item.value;
      els.searchClear.hidden = false;
    }
    state.page = 1;
    hideSearchSuggestions();
    persistDirectoryPreferences(); renderFilters(); renderQuickFilters(); applyDataPipeline();
  }

  function moveSuggestion(delta) {
    const box = document.getElementById("searchSuggestions");
    const buttons = [...(box?.querySelectorAll(".search-suggestion") || [])];
    if (!buttons.length) return false;
    state.searchSuggestionIndex = (state.searchSuggestionIndex + delta + buttons.length) % buttons.length;
    buttons.forEach((b, i) => b.classList.toggle("is-active", i === state.searchSuggestionIndex));
    buttons[state.searchSuggestionIndex]?.scrollIntoView({ block: "nearest" });
    return true;
  }

  /* ---------- better empty state ---------- */
  updateEmptyStateCopy = function() {
    baseUpdateEmptyStateCopy();
    if (!els.emptyState || state.filteredRows.length) return;
    const title = els.emptyState.querySelector("h3");
    const text = els.emptyState.querySelector("p");
    const own = currentUserRow();
    const programCol = semanticColumn("program");
    const campusCol = semanticColumn("campus");
    const ownProgram = own ? displayValue(own, programCol) : "";
    const ownCampus = own ? displayValue(own, campusCol) : "";
    const programSelected = programCol ? [...(state.filters[programCol.index] || [])].some(v => sameValue(v, ownProgram)) : false;
    const campusSelected = campusCol ? [...(state.filters[campusCol.index] || [])].some(v => sameValue(v, ownCampus)) : false;
    if (programSelected && campusSelected) {
      if (title) title.textContent = "No classmates on this campus match right now";
      if (text) text.textContent = "Try removing one filter or see all students to widen the directory.";
    } else if (programSelected) {
      if (title) title.textContent = "No classmates match these filters";
      if (text) text.textContent = "Try clearing another filter or see everyone in the directory.";
    } else if (campusSelected) {
      if (title) title.textContent = "No students on your campus match these filters";
      if (text) text.textContent = "Try another search or remove a filter to widen the results.";
    } else if (state.query) {
      if (title) title.textContent = `No results for “${state.query}”`;
      if (text) text.textContent = "Try a program, campus, or student name, or clear the search.";
    }
  };

  function showAllStudents() {
    state.query = ""; state.filters = {}; state.savedOnly = false; state.roommateMatchMode = false; state.roommateReferenceRow = null;
    state.page = 1; state.sortMode = "recommended"; state.sort = { index: null, direction: "asc" };
    els.searchInput.value = ""; els.searchClear.hidden = true;
    updateSavedUI(); updateRoommateMatchUI(); renderFilters(); renderQuickFilters(); persistDirectoryPreferences(); applyDataPipeline();
  }

  /* ---------- init ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    // Make the requested personalized sort the default for new users.
    if (!localStorage.getItem(UX_PREFS_KEY) && !localStorage.getItem(PREFS_KEY)) state.sortMode = "recommended";

    document.getElementById("firstUseHintClose")?.addEventListener("click", dismissInlineHint);
    document.getElementById("emptyShowAll")?.addEventListener("click", showAllStudents);
    els.clearFilters?.addEventListener("click", showAllStudents);
    document.getElementById("profilePrev")?.addEventListener("click", () => navigateProfile(-1));
    document.getElementById("profileNext")?.addEventListener("click", () => navigateProfile(1));

    const search = els.searchInput;
    if (search) {
      search.setAttribute("role", "combobox"); search.setAttribute("aria-autocomplete", "list"); search.setAttribute("aria-controls", "searchSuggestions"); search.setAttribute("aria-expanded", "false");
      search.addEventListener("input", () => window.setTimeout(showSearchSuggestions, 0));
      search.addEventListener("focus", showSearchSuggestions);
      search.addEventListener("keydown", event => {
        const box = document.getElementById("searchSuggestions");
        if (event.key === "ArrowDown" && !box?.hidden && moveSuggestion(1)) event.preventDefault();
        else if (event.key === "ArrowUp" && !box?.hidden && moveSuggestion(-1)) event.preventDefault();
        else if (event.key === "Enter" && !box?.hidden && state.searchSuggestionIndex >= 0) {
          event.preventDefault(); box.querySelectorAll(".search-suggestion")[state.searchSuggestionIndex]?.click();
        } else if (event.key === "Escape") hideSearchSuggestions();
      });
    }
    document.addEventListener("click", event => { if (!event.target.closest(".search-field") && !event.target.closest("#searchSuggestions")) hideSearchSuggestions(); });

    // The base listener handles sort changes; this keeps unsupported legacy values out.
    els.sortSelect?.addEventListener("change", () => {
      if (state.roommateMatchMode) return;
      if (!["recommended", "recent", "name", "same-program", "same-campus"].includes(els.sortSelect.value)) return;
      state.sortMode = els.sortSelect.value; state.page = 1; persistDirectoryPreferences(); applyDataPipeline();
    });

    // Swipe left/right in the profile sheet on mobile.
    const scroll = els.profilePanel?.querySelector(".profile-scroll");
    if (scroll) {
      let startX = 0, startY = 0, tracking = false;
      scroll.addEventListener("touchstart", event => {
        if (window.innerWidth > 760 || event.touches.length !== 1) return;
        startX = event.touches[0].clientX; startY = event.touches[0].clientY; tracking = true;
      }, { passive: true });
      scroll.addEventListener("touchend", event => {
        if (!tracking || window.innerWidth > 760) return;
        tracking = false;
        const touch = event.changedTouches[0];
        const dx = touch.clientX - startX, dy = touch.clientY - startY;
        if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.25) navigateProfile(dx < 0 ? 1 : -1);
      }, { passive: true });
    }

    // Desktop keyboard navigation inside profiles.
    document.addEventListener("keydown", event => {
      if (!els.profileSheet?.classList.contains("open")) return;
      const tag = document.activeElement?.tagName;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;
      if (event.key === "ArrowLeft") { event.preventDefault(); navigateProfile(-1); }
      else if (event.key === "ArrowRight") { event.preventDefault(); navigateProfile(1); }
    });

    window.addEventListener("online", () => updateFreshnessUI(false));
    window.addEventListener("offline", () => updateFreshnessUI(true));

    // Refresh freshness labels as time passes without network activity.
    window.setInterval(() => { if (state.authorized) updateFreshnessUI(!navigator.onLine || state.isOfflineCache); }, 60 * 1000);

    // Ensure the enhanced controls reflect any restored state after the base DOMContentLoaded handler.
    window.setTimeout(() => {
      if (els.sortSelect && !state.roommateMatchMode) els.sortSelect.value = state.sortMode || "recommended";
      updateRoommateMatchUI(); updateProfileBrowserNav(); renderTelegramRecommendations(); updateFreshnessUI(!navigator.onLine || state.isOfflineCache);
    }, 0);
  });
})();
