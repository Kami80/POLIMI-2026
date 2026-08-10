/*
  Add future university announcements here.
  Keep each item independent so the page can grow without editing HTML.
*/
const POLIMI_ANNOUNCEMENTS = [
  {
    id: "summer-closure-2026",
    category: "University closure",
    icon: "☀",
    title: "Polimi offices closed for summer holidays",
    summary: "Politecnico di Milano offices are closed from August 8 to August 23, so university assistance is unavailable during this period.",
    start: "2026-08-08T00:00:00+02:00",
    end: "2026-08-23T23:59:59+02:00",
    dateLabel: "8–23 Aug 2026",
    tone: "holiday",
    details: [
      "Polimi offices are closed between August 8 and August 23.",
      "The university will not be able to assist students during the closure.",
      "Support will resume toward the end of August."
    ],
    source: "Politecnico di Milano · Education Division"
  },
  {
    id: "italian-course-2026",
    category: "Language course",
    icon: "A",
    title: "Free online Italian courses for international students",
    summary: "Incoming international students can join free online Italian courses at Beginner, Elementary and Intermediate levels. Registration for the assessment test runs from August 26 to September 11.",
    start: "2026-08-26T00:00:00+02:00",
    end: "2026-09-11T23:59:59+02:00",
    dateLabel: "Assessment registration · 26 Aug–11 Sep 2026",
    tone: "course",
    details: [
      "Levels: Beginner, Elementary and Intermediate.",
      "Format: Online · 40 hours · 2 classes per week.",
      "Your entry level is determined through an online assessment test.",
      "Register through Online Services → Language courses Catalogue.",
      "International students are required to acquire at least a basic knowledge of Italian before graduation.",
      "If you already hold a B1 Italian certificate, you are exempt from this requirement."
    ],
    actions: [
      {
        label: "Email Italian Courses",
        href: "mailto:italian-courses@polimi.it",
        type: "email"
      },
      {
        label: "More information",
        href: "https://tr.polimi.it/e/tr?q=4%3dKcRYRb%264%3dRK%26J%3dLSQc%267%3dZPdNYR%26Q%3dzKDLA_Ikyh_TU_Nitj_XX_Ikyh_SZSEN.0K407E.1K_Bwkq_LlwE_Bwkq_Llw5E9sK3K6_Ikyh_SZHsE1Qs8y-97LBOwJ%26x%3d%26EA%3dRPYPS%26DO%3dJaLbRYTYIUKdRY%262%3daPSTZu5RbL5w9K6NWt6R7s4y9I5ScvTzBNROWMTxcLUQXwaQcO7TYIUKaR7M92u7sMSM&mupckp=mupAtu4m8OiX0wt",
        type: "link"
      }
    ],
    source: "Politecnico di Milano · Education Division"
  }
];

window.POLIMI_ANNOUNCEMENTS = POLIMI_ANNOUNCEMENTS;

function announcementStatus(item) {
  const now = Date.now();
  const start = item.start ? new Date(item.start).getTime() : null;
  const end = item.end ? new Date(item.end).getTime() : null;

  if (start && now < start) return { label: "Upcoming", className: "upcoming" };
  if (end && now > end) return { label: "Ended", className: "ended" };
  if (start && end && now >= start && now <= end) return { label: "Active now", className: "active" };
  return { label: "Important", className: "important" };
}

function renderAnnouncements() {
  const grid = document.getElementById("announcementGrid");
  const count = document.getElementById("announcementsCount");
  const topCount = document.getElementById("announcementsTopCount");

  if (topCount) {
    topCount.textContent = String(POLIMI_ANNOUNCEMENTS.length);
    topCount.hidden = POLIMI_ANNOUNCEMENTS.length === 0;
  }

  if (!grid) return;

  if (count) {
    count.textContent = `${POLIMI_ANNOUNCEMENTS.length} ${POLIMI_ANNOUNCEMENTS.length === 1 ? "announcement" : "announcements"}`;
  }

  grid.innerHTML = "";
  const fragment = document.createDocumentFragment();

  POLIMI_ANNOUNCEMENTS.forEach(item => {
    const status = announcementStatus(item);
    const card = document.createElement("article");
    card.className = `announcement-card announcement-${item.tone || "general"}`;

    const head = document.createElement("header");
    head.className = "announcement-card-head";

    const icon = document.createElement("span");
    icon.className = "announcement-card-icon";
    icon.textContent = item.icon || "!";
    icon.setAttribute("aria-hidden", "true");

    const meta = document.createElement("div");
    meta.className = "announcement-card-meta";
    const category = document.createElement("span");
    category.className = "announcement-category";
    category.textContent = item.category;
    const date = document.createElement("span");
    date.className = "announcement-date";
    date.textContent = item.dateLabel;
    meta.append(category, date);

    const badge = document.createElement("span");
    badge.className = `announcement-status ${status.className}`;
    badge.textContent = status.label;

    head.append(icon, meta, badge);

    const body = document.createElement("div");
    body.className = "announcement-card-body";
    const title = document.createElement("h2");
    title.textContent = item.title;
    const summary = document.createElement("p");
    summary.className = "announcement-summary";
    summary.textContent = item.summary;
    body.append(title, summary);

    if (Array.isArray(item.details) && item.details.length) {
      const list = document.createElement("ul");
      list.className = "announcement-details";
      item.details.forEach(detail => {
        const li = document.createElement("li");
        li.textContent = detail;
        list.appendChild(li);
      });
      body.appendChild(list);
    }

    const footer = document.createElement("footer");
    footer.className = "announcement-card-footer";
    const source = document.createElement("span");
    source.className = "announcement-source";
    source.textContent = item.source || "Politecnico di Milano";
    footer.appendChild(source);

    if (Array.isArray(item.actions) && item.actions.length) {
      const actions = document.createElement("div");
      actions.className = "announcement-actions";
      item.actions.forEach(action => {
        const link = document.createElement("a");
        link.className = `announcement-action ${action.type || "link"}`;
        link.href = action.href;
        if (!String(action.href).startsWith("mailto:")) {
          link.target = "_blank";
          link.rel = "noopener noreferrer";
        }
        link.innerHTML = `<span>${action.label}</span><span aria-hidden="true">${action.type === "email" ? "✉" : "↗"}</span>`;
        actions.appendChild(link);
      });
      footer.appendChild(actions);
    }

    card.append(head, body, footer);
    fragment.appendChild(card);
  });

  grid.appendChild(fragment);
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

renderAnnouncements();
