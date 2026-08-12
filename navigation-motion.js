(() => {
  const nav = document.querySelector(".app-mobile-nav");
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const compactViewport = () => window.matchMedia?.("(max-width: 760px)")?.matches;
  const motionKey = "polimi-navigation-motion-v1";

  function itemLabel(item) {
    return item?.querySelector("small")?.textContent?.trim() || item?.getAttribute("aria-label") || "Navigate";
  }

  function prepareNavigation() {
    if (!nav) return;
    nav.querySelectorAll(".mobile-nav-item").forEach(item => {
      const label = itemLabel(item);
      if (!item.hasAttribute("aria-label")) item.setAttribute("aria-label", label);
      if (!item.hasAttribute("title")) item.setAttribute("title", label);
    });
  }

  function activeIndex(items) {
    const selected = items.findIndex(item => item.classList.contains("active") || item.getAttribute("aria-current") === "page");
    if (selected >= 0) return selected;
    if (document.body.classList.contains("announcements-page")) return 2;
    if (document.body.classList.contains("groups-page")) return 3;
    return 0;
  }

  function addTemporaryClass(element, className, duration = 360) {
    if (!element) return;
    element.classList.remove(className);
    requestAnimationFrame(() => element.classList.add(className));
    window.setTimeout(() => element.classList.remove(className), duration);
  }

  function setBodyMotion(prefix, direction, duration = 360) {
    const forward = `${prefix}-forward`;
    const back = `${prefix}-back`;
    document.body.classList.remove(forward, back);
    const className = `${prefix}-${direction}`;
    requestAnimationFrame(() => document.body.classList.add(className));
    window.setTimeout(() => document.body.classList.remove(className), duration);
  }

  function readEntryMotion() {
    if (reducedMotion) return;
    try {
      const entry = JSON.parse(sessionStorage.getItem(motionKey) || "null");
      sessionStorage.removeItem(motionKey);
      if (!entry || Date.now() - Number(entry.time || 0) > 1800) return;
      setBodyMotion("page-enter", entry.direction === "back" ? "back" : "forward", 420);
    } catch (_) {}
  }

  function navigateAnchor(item, direction) {
    const href = item?.getAttribute("href");
    if (!href) return;
    const target = new URL(href, window.location.href);
    const current = new URL(window.location.href);
    if (target.pathname === current.pathname && target.search === current.search && target.hash === current.hash) return;

    item.classList.add("nav-target");
    if (reducedMotion) {
      window.location.assign(target.href);
      return;
    }

    try {
      sessionStorage.setItem(motionKey, JSON.stringify({ direction, time: Date.now() }));
    } catch (_) {}
    document.body.classList.add(`page-exit-${direction}`);
    window.setTimeout(() => window.location.assign(target.href), 165);
  }

  function bindNavigationClicks() {
    if (!nav) return;
    const items = [...nav.querySelectorAll(".mobile-nav-item")];

    nav.addEventListener("click", event => {
      const item = event.target.closest(".mobile-nav-item");
      if (!item) return;
      const from = activeIndex(items);
      const to = items.indexOf(item);
      const direction = to < from ? "back" : "forward";
      addTemporaryClass(item, "nav-tapped");

      if (item.matches("a[href]") && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
        event.preventDefault();
        navigateAnchor(item, direction);
        return;
      }

      if (!reducedMotion && to !== from && !window.PolimiAppNavigation) {
        window.setTimeout(() => setBodyMotion("page-shift", direction, 340), 0);
      }
    }, true);
  }

  function bindSwipeNavigation() {
    if (!nav || reducedMotion) return;
    const activeSurface = () => document.querySelector("[data-app-view-panel]:not([hidden])") || document.querySelector("main");
    document.querySelectorAll("[data-app-view-panel], main").forEach(surface => surface.classList.add("page-motion-surface"));
    const items = [...nav.querySelectorAll(".mobile-nav-item")];
    let gesture = null;
    let suppressClickUntil = 0;

    const blockedTarget = target => target.closest(
      "input, textarea, select, [contenteditable], .profile-sheet.open, .filter-sheet.open, .announcement-modal.is-visible, .quick-filter-row, .announcement-filter-row, .profile-browser-nav"
    );

    document.addEventListener("touchstart", event => {
      if (!compactViewport() || event.touches.length !== 1 || blockedTarget(event.target)) return;
      const touch = event.touches[0];
      const surface = activeSurface();
      if (!surface) return;
      gesture = { x: touch.clientX, y: touch.clientY, dx: 0, horizontal: false, from: activeIndex(items), surface };
      surface.style.transition = "none";
    }, { passive: true });

    document.addEventListener("touchmove", event => {
      if (!gesture || event.touches.length !== 1) return;
      const touch = event.touches[0];
      const dx = touch.clientX - gesture.x;
      const dy = touch.clientY - gesture.y;
      if (!gesture.horizontal && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.35) gesture.horizontal = true;
      if (!gesture.horizontal) return;
      event.preventDefault();
      gesture.dx = dx;
      const eased = Math.max(-38, Math.min(38, dx * .34));
      gesture.surface.style.setProperty("--page-swipe-x", `${eased}px`);
    }, { passive: false });

    document.addEventListener("touchend", () => {
      if (!gesture) return;
      const completed = gesture.horizontal && Math.abs(gesture.dx) >= 68;
      const direction = gesture.dx < 0 ? "forward" : "back";
      const targetIndex = gesture.from + (direction === "forward" ? 1 : -1);
      gesture.surface.style.transition = "";
      gesture.surface.style.setProperty("--page-swipe-x", "0px");

      if (completed && targetIndex >= 0 && targetIndex < items.length) {
        suppressClickUntil = Date.now() + 420;
        const target = items[targetIndex];
        addTemporaryClass(target, "nav-target");
        if (target.matches("a[href]")) {
          navigateAnchor(target, direction);
        } else {
          if (!window.PolimiAppNavigation) setBodyMotion("page-shift", direction, 340);
          target.click();
        }
      }
      gesture = null;
    }, { passive: true });

    document.addEventListener("touchcancel", () => {
      gesture = null;
      const surface = gesture?.surface;
      if (surface) {
        surface.style.transition = "";
        surface.style.setProperty("--page-swipe-x", "0px");
      }
    }, { passive: true });

    document.addEventListener("click", event => {
      if (Date.now() >= suppressClickUntil || event.target.closest(".app-mobile-nav")) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);
  }

  function setupCardMotion() {
    const selector = ".student-card, .telegram-group-card, .announcement-card-v3";
    const seen = new WeakSet();
    const observer = "IntersectionObserver" in window
      ? new IntersectionObserver(entries => {
          entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.remove("motion-pending");
            entry.target.classList.add("is-in-view");
            observer.unobserve(entry.target);
          });
        }, { rootMargin: "0px 0px -5%", threshold: .08 })
      : null;

    const prepare = root => {
      root.querySelectorAll?.(selector).forEach((card, index) => {
        if (seen.has(card)) return;
        seen.add(card);
        card.classList.add("motion-card");
        card.style.setProperty("--motion-index", String(index % 7));
        if (!observer || reducedMotion) {
          card.classList.add("is-in-view");
          return;
        }
        card.classList.add("motion-pending");
        observer.observe(card);
      });
    };

    prepare(document);
    new MutationObserver(records => {
      records.forEach(record => record.addedNodes.forEach(node => {
        if (node.nodeType === 1) prepare(node.matches?.(selector) ? node.parentElement : node);
      }));
    }).observe(document.body, { childList: true, subtree: true });

    if (reducedMotion) return;
    let scheduled = false;
    const updateFloat = () => {
      scheduled = false;
      const center = window.innerHeight / 2;
      document.querySelectorAll(".student-card.is-in-view").forEach(card => {
        const rect = card.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) return;
        const distance = center - (rect.top + rect.height / 2);
        const offset = Math.max(-4, Math.min(4, distance / Math.max(window.innerHeight, 1) * 9));
        card.style.setProperty("--scroll-float", `${offset.toFixed(2)}px`);
      });
    };
    window.addEventListener("scroll", () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(updateFloat);
    }, { passive: true });
    window.addEventListener("resize", updateFloat, { passive: true });
    updateFloat();
  }

  prepareNavigation();
  readEntryMotion();
  bindNavigationClicks();
  bindSwipeNavigation();
  setupCardMotion();
})();
