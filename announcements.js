/*
  Polimi Students · Announcements
  Add future university notices to POLIMI_ANNOUNCEMENTS.
  Cards stay compact by default and expand to show the full notice.
*/
const POLIMI_ANNOUNCEMENTS = [
  {
    id: "basic-safety-course-resource",
    category: "Safety",
    filter: "safety",
    icon: "health_and_safety",
    title: "Basic Safety Course · Formazione generale",
    summary: "Mandatory 4-hour general safety training for students and university workers. A valid certificate may be required to access some Polimi activities and services.",
    pinned: true,
    dateLabel: "Mandatory safety training",
    dateShort: "4H",
    dateMonth: "SAFETY",
    dateContext: "Online Services → Safety Course",
    tone: "safety",
    priority: 0,
    tags: ["Pinned", "Mandatory", "Safety course", "4 hours", "Online"],
    highlights: [
      { label: "Duration", value: "4 hours" },
      { label: "Path", value: "Online Services → Safety Course" },
      { label: "Format", value: "Online" },
      { label: "Certification", value: "Valid certificate may be required" }
    ],
    fullText: [
      "Corso Base sulla Sicurezza – ‘Formazione generale’. If your status is shown as ‘non sostenuto’, the course has not yet been completed.",
      "Important: the absence of a valid safety-training certificate may prevent access to some university activities or services.",
      "Who it is for: teaching staff, contract lecturers, research fellows, students and PhD candidates, technical-administrative staff and collaborators.",
      "The course has an equivalent duration of 4 hours and corresponds to the mandatory general safety training required by law for all workers. It introduces the basic concepts of prevention and workplace safety.",
      "It also includes specific training content relevant to many activities carried out at Politecnico di Milano, including the use of video display terminal equipment (VDT) and emergency-management procedures.",
      "To find it in Polimi services, open Online Services and select Safety Course. You can then access the course in Italian or English using the official links below."
    ],
    actions: [
      {
        label: "Open course in Italian",
        href: "https://formazionesicurezza.polimi.it/auth/shibboleth/index.php?target=https://formazionesicurezza.polimi.it/course/view.php?id=4",
        type: "link"
      },
      {
        label: "Open course in English",
        href: "https://formazionesicurezza.polimi.it/auth/shibboleth/index.php?target=https://formazionesicurezza.polimi.it/course/view.php?id=5",
        type: "link"
      },
      {
        label: "Study notes PDF",
        href: "basic-safety-course.pdf",
        type: "pdf"
      }
    ],
    source: "Politecnico di Milano · Online Services → Safety Course",
    signature: ["Basic Safety Course · Formazione generale"]
  },
  {
    id: "summer-closure-2026",
    category: "Closure",
    filter: "closures",
    icon: "beach_access",
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
    icon: "translate",
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

const ANNOUNCEMENTS_READ_KEY = "polimi_read_announcements_v1";

function getReadAnnouncementIds() {
  try {
    const value = JSON.parse(localStorage.getItem(ANNOUNCEMENTS_READ_KEY) || "[]");
    return new Set(Array.isArray(value) ? value : []);
  } catch (_) {
    return new Set();
  }
}

function isAnnouncementRead(id) {
  return getReadAnnouncementIds().has(id);
}

function unreadAnnouncementCount() {
  const read = getReadAnnouncementIds();
  return POLIMI_ANNOUNCEMENTS.reduce((count, item) => count + (read.has(item.id) ? 0 : 1), 0);
}

function updateAnnouncementUnreadUI() {
  const unread = unreadAnnouncementCount();
  const topCount = document.getElementById("announcementsTopCount");
  if (topCount) {
    topCount.textContent = String(unread);
    topCount.hidden = unread === 0;
  }

  const topLink = topCount?.closest(".top-notices-btn");
  if (topLink) {
    topLink.classList.toggle("has-unread", unread > 0);
    topLink.setAttribute("aria-label", unread > 0
      ? `Open university announcements · ${unread} unread`
      : "Open university announcements");
  }

  const accessBadge = document.getElementById("accessAnnouncementsUnread");
  if (accessBadge) {
    accessBadge.textContent = String(unread);
    accessBadge.hidden = unread === 0;
  }

  const mobileBadge = document.getElementById("mobileAnnouncementsUnread");
  if (mobileBadge) {
    mobileBadge.textContent = String(unread);
    mobileBadge.hidden = unread === 0;
  }
}

function markAnnouncementRead(id) {
  if (!id) return;
  const read = getReadAnnouncementIds();
  if (read.has(id)) return;
  read.add(id);
  try { localStorage.setItem(ANNOUNCEMENTS_READ_KEY, JSON.stringify([...read])); } catch (_) {}
  updateAnnouncementUnreadUI();

  const card = document.querySelector(`[data-announcement-id="${CSS.escape(id)}"]`);
  if (card) {
    card.classList.remove("is-unread");
    card.querySelector(".announcement-unread-pill")?.remove();
  }

  const count = document.getElementById("announcementsCount");
  if (count && document.getElementById("announcementGrid")) {
    const visible = filteredAnnouncements().length;
    const unread = unreadAnnouncementCount();
    count.textContent = `${visible} ${visible === 1 ? "announcement" : "announcements"}${unread ? ` · ${unread} unread` : " · all read"}`;
  }
}

const announcementState = {
  query: "",
  filter: "all",
  openId: null
};

function announcementStatus(item) {
  if (item.pinned) return { label: "Pinned", className: "pinned", rank: 0 };
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

function tagMarkup(tags = [], limit = Infinity) {
  const shown = tags.slice(0, limit);
  const more = tags.length > limit ? `<span class="announcement-tag announcement-tag-more">+${tags.length - limit}</span>` : "";
  return shown.map(tag => `<span class="announcement-tag">${escapeHtml(tag)}</span>`).join("") + more;
}

function highlightsMarkup(items = []) {
  if (!items.length) return "";
  return `
    <div class="announcement-modal-highlights" aria-label="Key information">
      ${items.map(item => `
        <div class="announcement-modal-highlight">
          <span>${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(item.value)}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

function actionsMarkup(item) {
  const actions = Array.isArray(item.actions) ? item.actions : [];
  return actions.map(action => {
    const external = !String(action.href).startsWith("mailto:");
    const icon = action.type === "email" ? "mail" : action.type === "pdf" ? "picture_as_pdf" : "open_in_new";
    return `
      <a class="announcement-modal-action ${escapeHtml(action.type || "link")}" href="${escapeHtml(action.href)}" ${external ? 'target="_blank" rel="noopener noreferrer"' : ""}>
        <span class="material-symbols-rounded" aria-hidden="true">${icon}</span>
        <strong>${escapeHtml(action.label)}</strong>
      </a>
    `;
  }).join("");
}

function fullTextMarkup(item) {
  return (item.fullText || []).map((paragraph, index) => {
    const isGreeting = index === 0 && /^dear\s/i.test(paragraph);
    return `<p${isGreeting ? ' class="announcement-greeting"' : ""}>${escapeHtml(paragraph)}</p>`;
  }).join("");
}

function announcementCardMarkup(item) {
  const status = announcementStatus(item);
  const primaryTag = (item.tags || [])[0] || item.category;
  const unread = !isAnnouncementRead(item.id);
  return `
    <article class="announcement-card-v3 announcement-${escapeHtml(item.tone || "general")}${unread ? " is-unread" : ""}" data-announcement-id="${escapeHtml(item.id)}">
      <button class="announcement-card-button" type="button" aria-label="Open announcement: ${escapeHtml(item.title)}">
        <span class="announcement-card-accent" aria-hidden="true"></span>
        <span class="announcement-card-top">
          <span class="announcement-card-icon material-symbols-rounded" aria-hidden="true">${escapeHtml(item.icon || "notification_important")}</span>
          <span class="announcement-card-top-right">
            ${unread ? '<span class="announcement-unread-pill"><i></i>Unread</span>' : ""}
            <span class="announcement-card-status announcement-status ${status.className}">${escapeHtml(status.label)}</span>
          </span>
        </span>

        <span class="announcement-card-date-row">
          <span class="announcement-card-date">${escapeHtml(item.dateLabel)}</span>
          <span class="announcement-card-topic">${escapeHtml(primaryTag)}</span>
        </span>

        <span class="announcement-card-title">${escapeHtml(item.title)}</span>
        <span class="announcement-card-summary">${escapeHtml(item.summary)}</span>

        <span class="announcement-card-tags">${tagMarkup(item.tags, 3)}</span>

        <span class="announcement-card-footer-v3">
          <span><i class="material-symbols-rounded" aria-hidden="true">calendar_month</i>${escapeHtml(item.dateContext)}</span>
          <strong>Open notice <i class="material-symbols-rounded" aria-hidden="true">arrow_forward</i></strong>
        </span>
      </button>
    </article>
  `;
}

function updateFilterCounts() {
  const counts = {
    all: POLIMI_ANNOUNCEMENTS.length,
    safety: POLIMI_ANNOUNCEMENTS.filter(x => x.filter === "safety").length,
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

  updateAnnouncementUnreadUI();
  if (!grid) return;

  const items = filteredAnnouncements();
  const unread = unreadAnnouncementCount();
  if (count) count.textContent = `${items.length} ${items.length === 1 ? "announcement" : "announcements"}${unread ? ` · ${unread} unread` : " · all read"}`;
  if (empty) empty.hidden = items.length > 0;
  grid.innerHTML = items.map(announcementCardMarkup).join("");
  updateFilterCounts();
}

function renderAnnouncementModal(item) {
  const status = announcementStatus(item);
  const modal = document.getElementById("announcementModal");
  const panel = document.getElementById("announcementModalPanel");
  if (!modal || !panel) return;

  panel.className = `announcement-modal-panel announcement-modal-${escapeHtml(item.tone || "general")}`;
  panel.innerHTML = `
    <div class="announcement-modal-toolbar">
      <button class="announcement-modal-icon-btn" type="button" data-close-announcement aria-label="Close announcement"><span class="material-symbols-rounded" aria-hidden="true">close</span></button>
      <span class="announcement-modal-toolbar-label">UNIVERSITY ANNOUNCEMENT</span>
      <button class="announcement-modal-icon-btn share" type="button" data-share-announcement="${escapeHtml(item.id)}" aria-label="Share announcement"><span class="material-symbols-rounded" aria-hidden="true">share</span></button>
    </div>

    <div class="announcement-modal-scroll">
      <header class="announcement-modal-hero">
        <div class="announcement-modal-hero-top">
          <span class="announcement-modal-date-tile" aria-hidden="true">
            <strong>${escapeHtml(item.dateShort)}</strong>
            <small>${escapeHtml(item.dateMonth)}</small>
          </span>
          <div>
            <div class="announcement-modal-status-row">
              <span class="announcement-category">${escapeHtml(item.category)}</span>
              <span class="announcement-status ${status.className}">${escapeHtml(status.label)}</span>
            </div>
            <p>${escapeHtml(item.dateContext)} · ${escapeHtml(item.dateLabel)}</p>
          </div>
        </div>
        <h2 id="announcementModalTitle">${escapeHtml(item.title)}</h2>
        <p class="announcement-modal-summary">${escapeHtml(item.summary)}</p>
        <div class="announcement-modal-tags">${tagMarkup(item.tags)}</div>
      </header>

      <div class="announcement-modal-body">
        ${highlightsMarkup(item.highlights)}

        <section class="announcement-modal-copy" aria-labelledby="announcementFullLabel">
          <span class="announcement-modal-section-label" id="announcementFullLabel">FULL ANNOUNCEMENT</span>
          ${fullTextMarkup(item)}
        </section>

        <section class="announcement-modal-source">
          <div>
            <span>OFFICIAL SOURCE</span>
            <strong>${escapeHtml(item.source || "Politecnico di Milano")}</strong>
            ${(item.signature || []).map(line => `<small>${escapeHtml(line)}</small>`).join("")}
          </div>
          <span class="announcement-official-pill">University communication</span>
        </section>

        <div class="announcement-modal-actions">
          ${actionsMarkup(item)}
          <button class="announcement-modal-action share" type="button" data-share-announcement="${escapeHtml(item.id)}">
            <span class="material-symbols-rounded" aria-hidden="true">share</span><strong>Share announcement</strong>
          </button>
        </div>
      </div>
    </div>
  `;
}

function openAnnouncement(id, options = {}) {
  const item = POLIMI_ANNOUNCEMENTS.find(x => x.id === id);
  if (!item) return;

  announcementState.openId = id;
  markAnnouncementRead(id);
  renderAnnouncementModal(item);

  const modal = document.getElementById("announcementModal");
  if (!modal) return;
  modal.hidden = false;
  document.body.classList.add("announcement-modal-open");
  requestAnimationFrame(() => modal.classList.add("is-visible"));

  if (options.updateHash !== false) history.replaceState(null, "", `#${encodeURIComponent(id)}`);
  requestAnimationFrame(() => modal.querySelector("[data-close-announcement]")?.focus({ preventScroll: true }));
}

function closeAnnouncement(options = {}) {
  const modal = document.getElementById("announcementModal");
  if (!modal || modal.hidden) return;
  modal.classList.remove("is-visible");
  document.body.classList.remove("announcement-modal-open");
  announcementState.openId = null;
  setTimeout(() => {
    modal.hidden = true;
    const panel = document.getElementById("announcementModalPanel");
    if (panel) panel.innerHTML = "";
  }, 180);
  if (options.updateHash !== false && location.hash) {
    history.replaceState(null, "", `${location.pathname}${location.search}`);
  }
}

async function copyAnnouncementLink(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) {}

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);
  let copied = false;
  try { copied = document.execCommand("copy"); } catch (_) {}
  textarea.remove();
  return copied;
}

function showAnnouncementShareFeedback(id, copied) {
  document.querySelectorAll(`[data-share-announcement="${CSS.escape(id)}"]`).forEach(button => {
    const label = button.querySelector("strong");
    if (label) {
      const previous = label.textContent;
      label.textContent = copied ? "Link copied" : "Copy failed";
      setTimeout(() => { label.textContent = previous; }, 1800);
    } else {
      const previous = button.innerHTML;
      button.innerHTML = `<span class="material-symbols-rounded" aria-hidden="true">${copied ? "check" : "error"}</span>`;
      button.setAttribute("aria-label", copied ? "Announcement link copied" : "Could not copy announcement link");
      setTimeout(() => {
        button.innerHTML = previous;
        button.setAttribute("aria-label", "Share announcement");
      }, 1800);
    }
  });
}

async function shareAnnouncement(id) {
  const item = POLIMI_ANNOUNCEMENTS.find(x => x.id === id);
  if (!item) return;
  const url = `${location.origin}${location.pathname}#${encodeURIComponent(id)}`;
  const data = { title: item.title, text: item.summary, url };
  const coarsePointer = window.matchMedia?.("(pointer: coarse)")?.matches;

  // Native share is ideal on phones/tablets. On desktop, copying the stable link is more predictable.
  if (navigator.share && coarsePointer) {
    try {
      await navigator.share(data);
      return;
    } catch (error) {
      if (error?.name === "AbortError") return;
    }
  }

  const copied = await copyAnnouncementLink(url);
  showAnnouncementShareFeedback(id, copied);
  if (!copied) {
    // Last-resort desktop fallback: expose the URL to the user.
    window.prompt("Copy this announcement link:", url);
  }
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
      renderAnnouncements();
    });
  });

  document.getElementById("announcementGrid")?.addEventListener("click", event => {
    const button = event.target.closest(".announcement-card-button");
    const card = button?.closest("[data-announcement-id]");
    if (card) openAnnouncement(card.dataset.announcementId);
  });

  const modal = document.getElementById("announcementModal");
  modal?.addEventListener("click", event => {
    const share = event.target.closest("[data-share-announcement]");
    if (share) {
      shareAnnouncement(share.dataset.shareAnnouncement);
      return;
    }
    if (event.target.closest("[data-close-announcement]") || event.target === modal) {
      closeAnnouncement();
    }
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && announcementState.openId) closeAnnouncement();
  });

  document.getElementById("clearAnnouncementSearch")?.addEventListener("click", () => {
    if (search) search.value = "";
    announcementState.query = "";
    announcementState.filter = "all";
    renderAnnouncements();
    search?.focus();
  });

  window.addEventListener("hashchange", () => {
    const id = decodeURIComponent(location.hash.replace(/^#/, ""));
    if (id && POLIMI_ANNOUNCEMENTS.some(item => item.id === id)) {
      openAnnouncement(id, { updateHash: false });
    } else if (announcementState.openId) {
      closeAnnouncement({ updateHash: false });
    }
  });
}

function setAnnouncementsTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const icon = document.getElementById("announcementsThemeIcon");
  if (icon) icon.textContent = theme === "dark" ? "light_mode" : "dark_mode";
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

window.addEventListener("storage", event => {
  if (event.key === ANNOUNCEMENTS_READ_KEY) {
    updateAnnouncementUnreadUI();
    if (document.getElementById("announcementGrid")) renderAnnouncements();
  }
});

bindAnnouncementControls();
renderAnnouncements();

const initialHash = decodeURIComponent(location.hash.replace(/^#/, ""));
if (initialHash && POLIMI_ANNOUNCEMENTS.some(item => item.id === initialHash)) {
  requestAnimationFrame(() => openAnnouncement(initialHash, { updateHash: false }));
}
