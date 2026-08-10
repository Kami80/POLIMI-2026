/*
  Add future Telegram groups here.
  Example:
  { program: "Mechanical Engineering", url: "https://t.me/example" }
*/
const TELEGRAM_GROUPS = [
  {
    program: "Biomedical Engineering",
    url: "https://t.me/+AFwhBgOX24M5Mjg8"
  },
  {
    program: "Electrical Engineering",
    url: "https://t.me/ElecEngPolimi"
  }
];

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
    .filter(item => !q || normalize(item.program).includes(q))
    .sort((a, b) => a.program.localeCompare(b.program));

  grid.innerHTML = "";
  const fragment = document.createDocumentFragment();

  groups.forEach((item, index) => {
    const card = document.createElement("article");
    card.className = `telegram-group-card telegram-group-accent-${index % 5}`;

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
    label.textContent = "PROGRAM GROUP";

    const title = document.createElement("h2");
    title.textContent = item.program;

    const description = document.createElement("p");
    description.textContent = `Connect with ${item.program} students at Polimi.`;

    body.append(label, title, description);

    const button = document.createElement("a");
    button.className = "telegram-join-btn";
    button.href = item.url;
    button.target = "_blank";
    button.rel = "noopener noreferrer";
    button.innerHTML = '<span>Open Telegram group</span><span aria-hidden="true">↗</span>';
    button.setAttribute("aria-label", `Open ${item.program} Telegram group`);

    card.append(top, body, button);
    fragment.appendChild(card);
  });

  grid.appendChild(fragment);
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
