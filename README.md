# Polimi Students 2026/2027

Static HTML/CSS/JS student-directory app for GitHub Pages. Data is read from the configured Google Sheet and access is gated by the email submitted in the Google Form.

## Included UX

- Primary **Add my profile** onboarding before email verification
- Persistent verified email with `localStorage`
- Personalized **My profile**, **Classmates**, and **Same campus** shortcuts
- Saved/bookmarked students stored on the current device
- Recently joined markers and sorting by recent/name/program
- Full student profile sheet with Telegram, Polimi Mail, Share, Save and report/update actions
- Stable hashed profile URLs such as `?student=name-abc12` with legacy unique-name links still supported
- Smart roommate mode with descriptive match labels (no fake percentages)
- Multi-select filter bottom sheet, swipe-down-to-close on mobile, and touch-safe controls
- Improved accent-insensitive/tokenized search
- Cached last successful Google Sheet response for fast repeat visits and offline fallback
- Skeleton cards while live data is loading
- One-time welcome tips after first verification
- PWA manifest + service worker + app icons so the site can be installed from supported browsers
- Dark mode and reduced-motion support

## Privacy visibility columns (optional)

If you add any of these optional questions/columns to the Google Form response sheet, the website will automatically respect them:

- `Show Telegram` / `Telegram visibility` / `Share Telegram`
- `Show Polimi mail` / `Polimi mail visibility` / `Share Polimi mail`

Values such as **No**, **Private**, or **Hide** suppress the corresponding contact button. If the columns do not exist, current behavior is unchanged.

## Report email

In `app.js`, set:

```js
reportEmail: "your-admin@email.com"
```

Then **Report incorrect info** opens a pre-filled email to that inbox. With the value left blank, it opens a pre-filled email draft and lets the user choose the recipient.

## GitHub Pages

Upload these files to the repository root:

- `index.html`
- `styles.css`
- `app.js`
- `manifest.webmanifest`
- `sw.js`
- `icons/`

Then enable GitHub Pages for the branch/root folder. HTTPS is required for service workers/PWA installation; GitHub Pages provides HTTPS.

## Important security note

The email gate is a user-experience/membership gate. If the Google Sheet itself is publicly readable, a technically determined visitor can still access the underlying public data endpoint outside the UI. Strong data privacy would require putting the sheet/API behind a server-side authenticated endpoint.

## Creator & reporting

This project was created by **Kamyab**. Kamyab's student profile receives a permanent **Creator** badge (instead of the temporary New badge). Profile reports are routed to Kamyab using the contact details in Kamyab's own sheet row, preferring Telegram and falling back to Polimi/form email when needed.

## App icon

The PWA, favicon, Apple touch icon, and in-app brand mark use the upgraded community artwork in the `icons/` directory.


## Telegram Groups page

The project now includes `groups.html`, a searchable directory of Telegram groups by program.

To add another group later, edit the `TELEGRAM_GROUPS` array near the top of `groups.js`:

```js
{ program: "Mechanical Engineering", url: "https://t.me/your-group-link" }
```

The page updates automatically; no HTML changes are needed.


## Announcements page

University notices are available at `announcements.html`. The page currently includes:

- Polimi summer office closure: August 8–23, 2026.
- Free online Italian language courses and assessment registration: August 26–September 11, 2026.

To add another notice later, add a new object to the `POLIMI_ANNOUNCEMENTS` array in `announcements.js`. Each item supports a title, summary, date/status window, detail bullets, source and optional action links.

## Announcements v3

`announcements.html` now uses a card gallery with floating announcement details. Each announcement supports:

- event/date labels
- status (Active / Upcoming / Ended)
- topic tags
- search and category filters
- compact visual cards
- click/tap to open a centered desktop modal or mobile bottom sheet
- key-info highlight tiles
- full university wording in the floating detail view
- official actions (email / external link)
- shareable announcement URL hashes such as `announcements.html#italian-course-2026`
- Escape/backdrop close behavior and mobile safe-area handling

To add a future notice, add one object to `POLIMI_ANNOUNCEMENTS` in `announcements.js`.


### Pinned main community group
- Polimi Free Forum — https://t.me/+hVdotxBWIWUwMDU0
- Shown as the pinned main group above program-specific Telegram groups.

## Unread announcements
Announcement read state is stored locally under `polimi_read_announcements_v1`. New announcement IDs are automatically treated as unread. Opening a notice marks only that notice as read and updates badges immediately.


## Latest UI update
- Student directory uses 24 records per page with numbered pagination.
- Announcement cards use larger desktop typography for dates, summaries, tags and footer labels.

## UX enhancement pass (Aug 11, 2026)

This build additionally includes:
- preserved scroll position when opening/closing profiles
- swipe profile browsing on mobile and Previous/Next on desktop
- removable active-filter chips + Clear all
- smart program/campus/student search suggestions
- personalized sorting: Recommended, Recently joined, Name A–Z, Same program, Same campus
- 24-per-page pagination with remembered page and grid-level smooth scrolling
- sticky mobile Telegram / Polimi Mail profile actions
- Mark all announcements as read + new-since-last-visit messaging
- personalized Telegram group recommendation + pinned Polimi Free Forum
- recently-updated profile badges when the sheet exposes update data or a newer repeated submission
- skeleton loading and cached/offline freshness labels
- contextual empty states with Clear filters / See all students
- keyboard shortcuts: / search, Esc close, Left/Right profile navigation
- lightweight first-use hints shown only once
