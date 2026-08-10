/*
  Polimi Students · Announcements
  Add future university notices to POLIMI_ANNOUNCEMENTS.
  Cards stay compact by default and expand to show the full notice.
*/
const POLIMI_ANNOUNCEMENTS = [
  {
    id: "summer-closure-2026",
    category: "Closure",
    filter: "closures",
    icon: "☀",
    title: "Polimi summer holiday closure",
    summary: "University offices are closed from 8 to 23 August. Student assistance will be unavailable during this period.",
    start: "2026-08-08T00:00:00+02:00",
    end: "2026-08-23T23:59:59+02:00",
    dateLabel: "8–23 Aug 2026",
    dateShort: "8–23",
    dateMonth: "AUG",
    dateContext: "Office closure",
    tone: "holiday",
    priority: 1,
    tags: ["Important", "Summer holidays", "University services"],
    highlights: [
      { label: "Closed", value: "8–23 August" },
      { label: "Student support", value: "Unavailable during closure" },
      { label: "Returns", value: "End of August" }
    ],
    fullText: [
      "Important to know: Politecnico di Milano offices will be closed for summer holidays between August 8th and August 23rd.",
      "Therefore, the university will not be able to assist students during this period.",
      "Politecnico di Milano will be back to you at the end of August."
    ],
    source: "Politecnico di Milano · Education Division",
    signature: ["Via Golgi 42 · 20133 Milano · Italy"]
  },
  {
    id: "italian-course-2026",
    category: "Course",
    filter: "courses",
    icon: "A",
    title: "Free online Italian language courses",
    summary: "Incoming international students can join free online Italian courses. Assessment-test registration is open from 26 August to 11 September.",
    start: "2026-08-26T00:00:00+02:00",
    end: "2026-09-11T23:59:59+02:00",
    dateLabel: "26 Aug–11 Sep 2026",
    dateShort: "26–11",
    dateMonth: "AUG/SEP",
    dateContext: "Assessment registration",
    tone: "course",
    priority: 2,
    tags: ["International students", "Free course", "Italian", "Deadline"],
    highlights: [
      { label: "Levels", value: "Beginner · Elementary · Intermediate" },
      { label: "Format", value: "Online" },
      { label: "Duration", value: "40 hours · 2 classes/week" },
      { label: "Registration", value: "26 Aug–11 Sep" }
    ],
    fullText: [
      "Dear Student,",
      "As you prepare to start your studies at Politecnico di Milano this September, the university would like to share useful information about one of the services available to support your experience at Polimi.",
      "To help you make the most of your time in Italy, Politecnico di Milano offers free online Italian language courses at different proficiency levels. As an international student, you are required to acquire at least a basic knowledge of Italian before graduation.",
      "Your entry level will be determined through an online assessment test. Registrations to the assessment test will be open from August 26th to September 11th. Enter your Online Services and select Language courses Catalogue.",
      "If you already hold a B1 Italian certificate, you are exempted from this requirement."
    ],
    actions: [
      {
        label: "Email Italian Courses",
        href: "mailto:italian-courses@polimi.it",
        type: "email"
      },
      {
        label: "Official information",
        href: "https://tr.polimi.it/e/tr?q=4%3dKcRYRb%264%3dRK%26J%3dLSQc%267%3dZPdNYR%26Q%3dzKDLA_Ikyh_TU_Nitj_XX_Ikyh_SZSEN.0K407E.1K_Bwkq_LlwE_Bwkq_Llw5E9sK3K6_Ikyh_SZHsE1Qs8y-97LBOwJ%26x%3d%26EA%3dRPYPS%26DO%3dJaLbRYTYIUKdRY%262%3daPSTZu5RbL5w9K6NWt6R7s4y9I5ScvTzBNROWMTxcLUQXwaQcO7TYIUKaR7M92u7sMSM&mupckp=mupAtu4m8OiX0wt",
        type: "link"
      }
    ],
    source: "Politecnico di Milano · Education Division",
    signature: ["Via Golgi 42 · 20133 Milano · Italy"]
  }
];

window.POLIMI_ANNOUNCEMENTS = POLIMI_ANNOUNCEMENTS;

const announcementState = {
  query: "",
  filter: "all",
  openId: null
};

function announcementStatus(item) {
  const now = Date.now();
  const start = item.start ? new Date(item.start).getTime() : null;
  const end = item.end ? new Date(item.end).getTime() : null;

  if (start && now < start) return { label: "Upcoming", className: "upcoming", rank: 2 };
  if (end && now > end) return { label: "Ended", className: "ended", rank: 4 };
  if (start && end && now >= start && now <= end) return { label: "Active now", className: "active", rank: 1 };
  return { label: "Important", className: "important", rank: 3 };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function filteredAnnouncements() {
  const q = announcementState.query.trim().toLowerCase();
  return [...POLIMI_ANNOUNCEMENTS]
    .filter(item => announcementState.filter === "all" || item.filter === announcementState.filter)
    .filter(item => {
      if (!q) return true;
      const haystack = [
        item.title, item.summary, item.category, item.dateLabel,
        ...(item.tags || []), ...(item.fullText || []),
        ...(item.highlights || []).flatMap(x => [x.label, x.value])
      ].join(" ").toLowerCase();
      return haystack.includes(q);
    })
    .sort((a, b) => {
      const sa = announcementStatus(a).rank;
      const sb = announcementStatus(b).rank;
      if (sa !== sb) return sa - sb;
      return (a.priority || 99) - (b.priority || 99);
    });
}

function tagMarkup(tags = []) {
  return tags.map(tag => `<span class="announcement-tag">${escapeHtml(tag)}</span>`).join("");
}

function highlightsMarkup(items = []) {
  if (!items.length) return "";
  return `
    <div class="announcement-highlights" aria-label="Key information">
      ${items.map(item => `
        <div class="announcement-highlight">
          <span>${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(item.value)}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

function actionsMarkup(item) {
  const actions = Array.isArray(item.actions) ? item.actions : [];
  const linkActions = actions.map(action => {
    const external = !String(action.href).startsWith("mailto:");
    return `
      <a class="announcement-action ${escapeHtml(action.type || "link")}" href="${escapeHtml(action.href)}" ${external ? 'target="_blank" rel="noopener noreferrer"' : ""}>
        <span>${escapeHtml(action.label)}</span>
        <span aria-hidden="true">${action.type === "email" ? "✉" : "↗"}</span>
      </a>
    `;
  }).join("");

  return `
    <div class="announcement-expanded-actions">
      ${linkActions}
      <button class="announcement-action share" type="button" data-share-announcement="${escapeHtml(item.id)}">
        <span>Share notice</span><span aria-hidden="true">↗</span>
      </button>
    </div>
  `;
}

function fullTextMarkup(item) {
  return (item.fullText || []).map((paragraph, index) => {
    const isGreeting = index === 0 && /^dear\s/i.test(paragraph);
    return `<p${isGreeting ? ' class="announcement-greeting"' : ""}>${escapeHtml(paragraph)}</p>`;
  }).join("");
}

function announcementCardMarkup(item) {
  const status = announcementStatus(item);
  const expanded = announcementState.openId === item.id;
  const panelId = `announcement-panel-${item.id}`;

  return `
    <article class="announcement-card announcement-${escapeHtml(item.tone || "general")} ${expanded ? "is-open" : ""}" data-announcement-id="${escapeHtml(item.id)}">
      <button class="announcement-toggle" type="button" aria-expanded="${expanded}" aria-controls="${panelId}">
        <span class="announcement-date-tile" aria-hidden="true">
          <strong>${escapeHtml(item.dateShort)}</strong>
          <small>${escapeHtml(item.dateMonth)}</small>
        </span>

        <span class="announcement-preview">
          <span class="announcement-preview-topline">
            <span class="announcement-category">${escapeHtml(item.category)}</span>
            <span class="announcement-status ${status.className}">${escapeHtml(status.label)}</span>
          </span>
          <span class="announcement-preview-title">${escapeHtml(item.title)}</span>
          <span class="announcement-preview-summary">${escapeHtml(item.summary)}</span>
          <span class="announcement-tags">${tagMarkup(item.tags)}</span>
          <span class="announcement-event-date"><span aria-hidden="true">◷</span>${escapeHtml(item.dateContext)} · ${escapeHtml(item.dateLabel)}</span>
        </span>

        <span class="announcement-expand-icon" aria-hidden="true">⌄</span>
      </button>

      <div class="announcement-expanded" id="${panelId}" ${expanded ? "" : "hidden"}>
        <div class="announcement-expanded-inner">
          ${highlightsMarkup(item.highlights)}

          <div class="announcement-full-copy">
            <span class="announcement-full-label">FULL ANNOUNCEMENT</span>
            ${fullTextMarkup(item)}
          </div>

          <div class="announcement-source-block">
            <div>
              <span>Source</span>
              <strong>${escapeHtml(item.source || "Politecnico di Milano")}</strong>
              ${(item.signature || []).map(line => `<small>${escapeHtml(line)}</small>`).join("")}
            </div>
            <span class="announcement-official-pill">University communication</span>
          </div>

          ${actionsMarkup(item)}
        </div>
      </div>
    </article>
  `;
}

function updateFilterCounts() {
  const counts = {
    all: POLIMI_ANNOUNCEMENTS.length,
    courses: POLIMI_ANNOUNCEMENTS.filter(x => x.filter === "courses").length,
    closures: POLIMI_ANNOUNCEMENTS.filter(x => x.filter === "closures").length
  };

  document.querySelectorAll("[data-announcement-filter]").forEach(button => {
    const key = button.dataset.announcementFilter;
    button.classList.toggle("active", key === announcementState.filter);
    button.setAttribute("aria-pressed", key === announcementState.filter ? "true" : "false");
    const count = button.querySelector("i");
    if (count && counts[key] !== undefined) count.textContent = String(counts[key]);
  });
}

function renderAnnouncements() {
  const grid = document.getElementById("announcementGrid");
  const count = document.getElementById("announcementsCount");
  const topCount = document.getElementById("announcementsTopCount");
  const empty = document.getElementById("announcementsEmpty");

  if (topCount) {
    topCount.textContent = String(POLIMI_ANNOUNCEMENTS.length);
    topCount.hidden = POLIMI_ANNOUNCEMENTS.length === 0;
  }

  if (!grid) return;

  const items = filteredAnnouncements();
  if (count) count.textContent = `${items.length} ${items.length === 1 ? "announcement" : "announcements"}`;
  if (empty) empty.hidden = items.length > 0;

  grid.innerHTML = items.map(announcementCardMarkup).join("");
  updateFilterCounts();
}

function openAnnouncement(id, options = {}) {
  const exists = POLIMI_ANNOUNCEMENTS.some(item => item.id === id);
  if (!exists) return;
  announcementState.openId = announcementState.openId === id && !options.force ? null : id;
  renderAnnouncements();

  if (announcementState.openId) {
    if (options.updateHash !== false) history.replaceState(null, "", `#${id}`);
    if (options.scroll) {
      requestAnimationFrame(() => {
        document.querySelector(`[data-announcement-id="${CSS.escape(id)}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  } else if (location.hash) {
    history.replaceState(null, "", `${location.pathname}${location.search}`);
  }
}

async function shareAnnouncement(id) {
  const item = POLIMI_ANNOUNCEMENTS.find(x => x.id === id);
  if (!item) return;
  const url = `${location.origin}${location.pathname}#${encodeURIComponent(id)}`;
  const data = { title: item.title, text: item.summary, url };

  try {
    if (navigator.share) {
      await navigator.share(data);
      return;
    }
    await navigator.clipboard.writeText(url);
    const button = document.querySelector(`[data-share-announcement="${CSS.escape(id)}"] span:first-child`);
    if (button) {
      const previous = button.textContent;
      button.textContent = "Link copied";
      setTimeout(() => { button.textContent = previous; }, 1600);
    }
  } catch (_) {}
}

function bindAnnouncementControls() {
  const search = document.getElementById("announcementsSearch");
  if (search) {
    search.addEventListener("input", () => {
      announcementState.query = search.value;
      renderAnnouncements();
    });
  }

  document.querySelectorAll("[data-announcement-filter]").forEach(button => {
    button.addEventListener("click", () => {
      announcementState.filter = button.dataset.announcementFilter || "all";
      announcementState.openId = null;
      renderAnnouncements();
    });
  });

  document.getElementById("announcementGrid")?.addEventListener("click", event => {
    const share = event.target.closest("[data-share-announcement]");
    if (share) {
      event.stopPropagation();
      shareAnnouncement(share.dataset.shareAnnouncement);
      return;
    }

    if (event.target.closest("a")) return;
    const toggle = event.target.closest(".announcement-toggle");
    if (toggle) {
      const card = toggle.closest("[data-announcement-id]");
      if (card) openAnnouncement(card.dataset.announcementId);
    }
  });

  document.getElementById("clearAnnouncementSearch")?.addEventListener("click", () => {
    if (search) search.value = "";
    announcementState.query = "";
    announcementState.filter = "all";
    announcementState.openId = null;
    renderAnnouncements();
    search?.focus();
  });
}

function setAnnouncementsTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const icon = document.getElementById("announcementsThemeIcon");
  if (icon) icon.textContent = theme === "dark" ? "☀" : "☾";
  localStorage.setItem("polimi_theme", theme);
}

const announcementsThemeToggle = document.getElementById("announcementsThemeToggle");
if (announcementsThemeToggle) {
  const savedTheme = localStorage.getItem("polimi_theme");
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  setAnnouncementsTheme(savedTheme || (prefersDark ? "dark" : "light"));

  announcementsThemeToggle.addEventListener("click", () => {
    setAnnouncementsTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
  });
}

bindAnnouncementControls();

const initialHash = decodeURIComponent(location.hash.replace(/^#/, ""));
if (initialHash && POLIMI_ANNOUNCEMENTS.some(item => item.id === initialHash)) {
  announcementState.openId = initialHash;
}
renderAnnouncements();

if (announcementState.openId) {
  requestAnimationFrame(() => {
    document.querySelector(`[data-announcement-id="${CSS.escape(announcementState.openId)}"]`)?.scrollIntoView({ block: "center" });
  });
}
