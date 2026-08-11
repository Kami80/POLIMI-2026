/*
  Add future Telegram groups here.
  Example:
  { program: "Mechanical Engineering", url: "https://t.me/example" }
*/
const TELEGRAM_GROUPS = [
  {
    program: "Polimi Free Forum",
    url: "https://t.me/+hVdotxBWIWUwMDU0",
    pinned: true,
    audience: "Everyone",
    description: "The main community group for all Polimi students — meet people across programs, ask general questions, and stay connected."
  },
  {
    program: "Biomedical Engineering",
    url: "https://t.me/+AFwhBgOX24M5Mjg8"
  },
  {
    program: "Electrical Engineering",
    url: "https://t.me/ElecEngPolimi"
  },
  {
    program: "Chemical Engineering",
    url: "https://t.me/+E-ZbMJk_9FthYTY0"
  },
  {
    program: "HPC and CS",
    url: "https://t.me/+zavdWJEF7RZiMDM0"
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
    text: `Join the ${item.program} Telegram group for Polimi students.`,
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
  button.innerHTML = copied ? '<span>Link copied</span><span aria-hidden="true">✓</span>' : '<span>Copy failed</span><span aria-hidden="true">!</span>';
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
  const q = normalize(search.value);
  const groups = TELEGRAM_GROUPS
    .filter(item => !q || normalize(`${item.program} ${item.audience || ""} ${item.description || ""}`).includes(q))
    .sort((a, b) => {
      if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
      return a.program.localeCompare(b.program);
    });

  grid.innerHTML = "";
  const fragment = document.createDocumentFragment();

  groups.forEach((item, index) => {
    const card = document.createElement("article");
    card.className = `telegram-group-card telegram-group-accent-${index % 5}${item.pinned ? " telegram-group-pinned" : ""}`;

    const top = document.createElement("div");
    top.className = "telegram-group-top";

    const avatar = document.createElement("span");
    avatar.className = "telegram-group-avatar";
    avatar.textContent = initials(item.program);
    avatar.setAttribute("aria-hidden", "true");

    const telegramMark = document.createElement("span");
    telegramMark.className = "telegram-group-mark";
    telegramMark.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.6 3.2 2.9 10.4c-1.3.5-1.3 1.2-.2 1.5l4.8 1.5 1.9 5.8c.2.7.1 1 .9 1 .6 0 .8-.2 1.1-.5l2.7-2.6 5.6 4.2c1 .6 1.8.3 2-1l3.4-16.1c.4-1.5-.5-2.2-1.5-1.7ZM9.4 13.1l9.4-5.9c.4-.3.8-.1.5.2l-7.7 7-.3 3.1-1.9-4.4Z" fill="currentColor"/></svg>';

    top.append(avatar, telegramMark);

    const body = document.createElement("div");
    body.className = "telegram-group-body";

    const label = document.createElement("span");
    label.className = "telegram-group-label";
    label.textContent = item.pinned ? "📌 PINNED · MAIN COMMUNITY" : "PROGRAM GROUP";

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
    button.innerHTML = '<span>Open Telegram group</span><span aria-hidden="true">↗</span>';
    button.setAttribute("aria-label", `Open ${item.program} Telegram group`);

    const share = document.createElement("button");
    share.type = "button";
    share.className = "telegram-share-btn";
    share.innerHTML = '<span>Share</span><span aria-hidden="true">⌁</span>';
    share.setAttribute("aria-label", `Share ${item.program} group`);
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

  count.textContent = `${groups.length} ${groups.length === 1 ? "group" : "groups"}`;
  empty.hidden = groups.length !== 0;
  grid.hidden = groups.length === 0;
  clear.hidden = !search.value;
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeIcon.textContent = theme === "dark" ? "☀" : "☾";
  localStorage.setItem("polimi_theme", theme);
}

const savedTheme = localStorage.getItem("polimi_theme");
const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
setTheme(savedTheme || (prefersDark ? "dark" : "light"));

themeToggle.addEventListener("click", () => {
  setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
});

search.addEventListener("input", renderGroups);
clear.addEventListener("click", () => {
  search.value = "";
  renderGroups();
  search.focus();
});

renderGroups();
