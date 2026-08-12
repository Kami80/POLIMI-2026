/*
  Add future Telegram communities here.
  Example:
  { program: "Mechanical Engineering", url: "https://t.me/example" }
*/
(() => {
const TELEGRAM_GROUPS = [
  {
    program: "Polimi Free Forum",
    url: "https://t.me/+hVdotxBWIWUwMDU0",
    pinned: true,
    audience: "Everyone",
    image: "community-photos/persian-polimi-community-floating.webp",
    description: "The main community group for all Polimi students — meet people across programs, ask general questions, and stay connected."
  },
  {
    program: "Esfahan to Italy",
    url: "https://t.me/+UNwP4GGpBQ1iZGY0",
    audience: "Students from Esfahan and Iran",
    category: "REGIONAL COMMUNITY",
    image: "community-photos/esfahan-to-italy-floating.webp",
    description: "Connect with students and newcomers from Esfahan who are studying in or moving to Italy."
  },
  {
    program: "Biomedical Engineering",
    url: "https://t.me/+AFwhBgOX24M5Mjg8",
    image: "community-photos/biomedical-engineering-floating.webp"
  },
  {
    program: "Electrical Engineering",
    url: "https://t.me/ElecEngPolimi",
    image: "community-photos/electrical-engineering-floating.webp"
  },
  {
    program: "Chemical Engineering",
    url: "https://t.me/+E-ZbMJk_9FthYTY0",
    image: "community-photos/chemical-engineering-floating.webp"
  },
  {
    program: "HPC and CS",
    url: "https://t.me/+zavdWJEF7RZiMDM0",
    image: "community-photos/hpc-computer-science-floating.webp"
  }
];
function openTelegramLink(href) {
  try {
    window.location.assign(href);
  } catch (_) {
    window.location.href = href;
  }
}


const grid = document.getElementById("telegramGroupGrid");
const search = document.getElementById("groupSearch");
const clear = document.getElementById("groupSearchClear");
const count = document.getElementById("groupsCount");
const empty = document.getElementById("groupsEmpty");
const themeToggle = document.getElementById("groupsThemeToggle");
const themeIcon = document.getElementById("groupsThemeIcon");

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function groupSlug(value) {
  return normalize(value)
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "group";
}

function groupShareUrl(item) {
  const url = new URL(window.location.href);
  url.search = "";
  if (document.getElementById("groupsAppView")) url.searchParams.set("view", "groups");
  url.searchParams.set("group", groupSlug(item.program));
  url.hash = "";
  return url.toString();
}

async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) {}
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch (_) {
    return false;
  }
}

async function shareGroup(item, button) {
  const url = groupShareUrl(item);
  const data = {
    title: `${item.program} · Polimi Students`,
    text: `Join the ${item.program} community on Telegram.`,
    url
  };
  if (navigator.share) {
    try {
      await navigator.share(data);
      return;
    } catch (error) {
      if (error && error.name === "AbortError") return;
    }
  }
  const copied = await copyText(url);
  const old = button.innerHTML;
  button.innerHTML = copied
    ? '<span>Link copied</span><span class="material-symbols-rounded" aria-hidden="true">check</span>'
    : '<span>Copy failed</span><span class="material-symbols-rounded" aria-hidden="true">error</span>';
  setTimeout(() => { button.innerHTML = old; }, 1600);
}

function initials(program) {
  return program
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join("")
    .toUpperCase();
}

function renderGroups() {
  if (!grid) return;
  const q = normalize(search?.value || "");
  const groups = TELEGRAM_GROUPS
    .filter(item => !q || normalize(`${item.program} ${item.audience || ""} ${item.category || ""} ${item.description || ""}`).includes(q))
    .sort((a, b) => {
      if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
      return a.program.localeCompare(b.program);
    });

  grid.innerHTML = "";
  const fragment = document.createDocumentFragment();

  groups.forEach((item, index) => {
    const card = document.createElement("article");
    card.className = `telegram-group-card telegram-group-accent-${index % 5}${item.pinned ? " telegram-group-pinned" : ""}`;

    if (item.image) {
      card.classList.add("has-community-photo");
      const media = document.createElement("div");
      media.className = "telegram-group-photo";
      media.setAttribute("aria-hidden", "true");

      const photo = document.createElement("img");
      photo.src = item.image;
      photo.alt = "";
      photo.decoding = "async";
      photo.loading = item.pinned ? "eager" : "lazy";
      if (item.pinned) photo.fetchPriority = "high";
      photo.addEventListener("error", () => {
        media.remove();
        card.classList.remove("has-community-photo");
      }, { once: true });
      media.appendChild(photo);
      card.appendChild(media);
    }

    const top = document.createElement("div");
    top.className = "telegram-group-top";

    const avatar = document.createElement("span");
    avatar.className = "telegram-group-avatar";
    avatar.textContent = initials(item.program);
    avatar.setAttribute("aria-hidden", "true");

    const telegramMark = document.createElement("span");
    telegramMark.className = "telegram-group-mark telegram-icon-svg";
    telegramMark.setAttribute("aria-hidden", "true");
    telegramMark.innerHTML = '<svg viewBox="0 0 24 24" focusable="false" fill="currentColor"><path d="M21.2 3.12 3.93 9.78c-.78.3-.77 1.4.02 1.68l4.36 1.52 1.7 5.48c.25.8 1.3.96 1.78.27l2.42-3.5 4.77 3.5c.6.44 1.46.1 1.6-.63L22.4 4.2c.15-.79-.45-1.36-1.2-1.08ZM9.26 12.1l8.45-5.42-6.72 7.24-.6 2.63-1.13-4.45Z"/></svg>';

    top.append(avatar, telegramMark);

    const body = document.createElement("div");
    body.className = "telegram-group-body";

    const label = document.createElement("span");
    label.className = "telegram-group-label";
    if (item.pinned) label.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">push_pin</span> PINNED · MAIN COMMUNITY';
    else label.textContent = item.category || "PROGRAM COMMUNITY";

    const title = document.createElement("h2");
    title.textContent = item.program;

    const description = document.createElement("p");
    description.textContent = item.description || `Connect with ${item.program} students at Polimi.`;

    body.append(label, title, description);

    const actions = document.createElement("div");
    actions.className = "telegram-group-actions";

    const button = document.createElement("a");
    button.className = "telegram-join-btn";
    button.href = item.url;
    button.rel = "external noopener noreferrer";
    button.addEventListener("click", event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      openTelegramLink(item.url);
    });
    button.innerHTML = '<span>Open in Telegram</span><span class="material-symbols-rounded" aria-hidden="true">open_in_new</span>';
    button.setAttribute("aria-label", `Open ${item.program} community in Telegram`);

    const share = document.createElement("button");
    share.type = "button";
    share.className = "telegram-share-btn";
    share.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">share</span><span class="telegram-share-label">Share</span>';
    share.setAttribute("aria-label", `Share ${item.program} community`);
    share.addEventListener("click", () => shareGroup(item, share));

    actions.append(button, share);
    card.dataset.groupSlug = groupSlug(item.program);
    card.append(top, body, actions);
    fragment.appendChild(card);
  });

  grid.appendChild(fragment);

  const requestedGroup = new URLSearchParams(window.location.search).get("group");
  if (requestedGroup) {
    const target = grid.querySelector(`[data-group-slug="${CSS.escape(requestedGroup)}"]`);
    if (target) {
      requestAnimationFrame(() => {
        target.classList.add("group-deep-linked");
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  }

  if (count) count.textContent = `${groups.length} ${groups.length === 1 ? "community" : "communities"}`;
  if (empty) empty.hidden = groups.length !== 0;
  grid.hidden = groups.length === 0;
  if (clear) clear.hidden = !search?.value;
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  if (themeIcon) themeIcon.textContent = theme === "dark" ? "light_mode" : "dark_mode";
  localStorage.setItem("polimi-theme", theme);
}

const savedTheme = localStorage.getItem("polimi-theme") || localStorage.getItem("polimi_theme");
const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
setTheme(savedTheme || (prefersDark ? "dark" : "light"));

themeToggle?.addEventListener("click", () => {
  setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
});

search?.addEventListener("input", renderGroups);
clear?.addEventListener("click", () => {
  search.value = "";
  renderGroups();
  search.focus();
});

window.PolimiGroups = { render: renderGroups };
renderGroups();
})();
