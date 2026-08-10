/* Polimi Students · announcement read-state UX */
(() => {
  const KNOWN_KEY = "polimi_known_announcements_v1";
  let knownBeforeVisit = new Set();
  try {
    const stored = JSON.parse(localStorage.getItem(KNOWN_KEY) || "[]");
    knownBeforeVisit = new Set(Array.isArray(stored) ? stored : []);
  } catch (_) {}

  const currentIds = POLIMI_ANNOUNCEMENTS.map(item => item.id);
  const newSinceLastVisit = currentIds.filter(id => !knownBeforeVisit.has(id));

  function updateSinceMessage() {
    const el = document.getElementById("announcementsSince");
    if (!el) return;
    const unread = unreadAnnouncementCount();
    const read = getReadAnnouncementIds();
    const newUnread = newSinceLastVisit.filter(id => !read.has(id));
    let text = "";
    if (newUnread.length) text = `${newUnread.length} new ${newUnread.length === 1 ? "notice" : "notices"} since your last visit`;
    else if (unread) text = `${unread} unread ${unread === 1 ? "notice" : "notices"}`;
    else text = "You’re all caught up";
    el.textContent = text;
    el.hidden = false;
    el.classList.toggle("all-read", unread === 0);

    const mark = document.getElementById("markAllAnnouncementsRead");
    if (mark) mark.hidden = unread === 0;
  }

  function markAllRead() {
    try { localStorage.setItem(ANNOUNCEMENTS_READ_KEY, JSON.stringify(currentIds)); } catch (_) {}
    updateAnnouncementUnreadUI();
    renderAnnouncements();
    updateSinceMessage();
  }

  const baseMarkRead = markAnnouncementRead;
  markAnnouncementRead = function(id) {
    baseMarkRead(id);
    updateSinceMessage();
  };

  const baseRender = renderAnnouncements;
  renderAnnouncements = function() {
    baseRender();
    updateSinceMessage();
  };

  document.getElementById("markAllAnnouncementsRead")?.addEventListener("click", markAllRead);
  updateSinceMessage();

  // Treat this set as "known" after the visit, without marking anything read.
  const rememberCurrentSet = () => {
    try { localStorage.setItem(KNOWN_KEY, JSON.stringify(currentIds)); } catch (_) {}
  };
  window.addEventListener("pagehide", rememberCurrentSet, { once: true });
  window.addEventListener("beforeunload", rememberCurrentSet, { once: true });
})();
