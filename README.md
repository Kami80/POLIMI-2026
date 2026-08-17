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

- A Polimi AI guide covering research, courses, free MOOCs, seminars, AIRIC, excellence networks and the AI Observatory.
- Free online courses and Open Badges through Polimi Open Knowledge (POK).
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
- recently-updated profile badges when the sheet exposes update data or a newer repeated submission
- skeleton loading and cached/offline freshness labels
- contextual empty states with Clear filters / See all students
- keyboard shortcuts: / search, Esc close, Left/Right profile navigation
- lightweight first-use hints shown only once


## Latest additions
- Pinned mandatory Basic Safety Course notice with Online Services → Safety Course path, official Italian/English course links, and optional study-notes PDF (`basic-safety-course.pdf`).
- HPC and CS Telegram group.
- Larger filter-sheet typography on desktop and mobile.

## Milan Home Hunt

`housing.html` is a private-rental research and shortlist tool for incoming students. POLIMI residences are intentionally not included. The section is designed around a simple principle: **search on the real rental platforms, then bring only the listings you care about back into Polimi Students.**

The Home Hunt flow includes:

- search profile with campus, budget, home type, move-in date and maximum commute
- area suggestions and direct search cards for Idealista, Immobiliare.it, HousingAnywhere and Spotahome
- paste-a-link importer for individual public listing URLs
- best-effort extraction of title, rent, bills, deposit, agency/admin fee, area, address, size, rooms, availability, furnishing, contract mentions, description and image
- mandatory review/edit step before an imported listing is saved
- manual-entry fallback when a listing blocks automated reading, requires login, or cannot be parsed
- browser-local **My Homes** shortlist with favorites, notes and pipeline statuses (Saved → Contacted → Replied → Viewing → Finalist → Chosen)
- refresh-from-source action for previously saved URLs
- normalized monthly-cost and upfront-cash estimates
- campus commute planning estimates based on the selected area
- listing completeness / fit scoring and automatic "items to verify" warnings
- side-by-side comparison for up to four homes
- automatic questions to ask based on missing listing details
- English / Italian landlord-message generator
- JSON backup and restore for the local shortlist
- final pre-payment verification checklist

### Listing importer architecture

Home Hunt V4 keeps the main website compatible with static hosting such as GitHub Pages, but moves URL fetching/extraction into the included `home-hunt-worker/` Cloudflare Worker. The frontend sends only the user-selected listing URL to `POST /api/import-home`; the Worker validates the URL against an allowlist, fetches the public listing page, runs a provider adapter, and returns a normalized property object.

Supported URL importers: Idealista, Immobiliare.it, HousingAnywhere, and Spotahome. Extraction prioritizes structured JSON-LD/OpenGraph data, then provider-aware text rules. Fields include rent, recurring charges, deposit, fees, address, size, rooms, bedrooms, bathrooms, floor, furnishing, elevator, balcony, A/C, availability, minimum stay, contract mentions, advertiser/agency, description, and listing images where exposed.

Security: only HTTPS URLs on the approved rental domains are accepted; credentials, non-standard ports, arbitrary hosts, localhost/private-network targets, and cross-provider redirects are rejected. The Worker limits redirects, response size, and request time. CORS is restricted through `ALLOWED_ORIGINS`.

If direct provider retrieval fails, the Worker can optionally use Jina Reader as a server-side fallback. Before a Worker endpoint is connected, the frontend can temporarily use the previous browser Reader fallback so development does not dead-end. Users can also paste listing text or add the home manually. Extracted values are always shown in a review form before saving, and source refreshes remain non-destructive.

Configure the deployed Worker URL in `home-hunt-config.js`. See `IMPORTER_SETUP.md` and `home-hunt-worker/README.md`.


## Milan Home Hunt V2 (2026-08-18)
Home Hunt is a private-rental research and decision workspace rather than a rental search engine. Users discover current inventory on real marketplaces, then save individual listing URLs into the app.

V2 includes: source-aware import with field confidence, manual fallback, property workspaces, drag-and-drop housing pipeline, personalized fit-score weights, true monthly/upfront/first-year cost views, verified commute workflow, duplicate detection/merge, source refresh with non-destructive diffs, contact timeline + next actions + calendar export, multi-context English/Italian landlord messages, evidence-based verification checks, document-readiness tracking without file storage, Web Share Target support, bookmarklet capture, returning-user dashboard, 2–4 home decision comparison, shareable shortlist summaries, mobile quick-add, onboarding/empty states, JSON backup/restore, and local-only shortlist storage.

POLIMI residences are intentionally excluded from Home Hunt.

## Milan Home Hunt V3 — clean interface (2026-08-18)
V3 keeps the full V2 feature set but reorganizes it around progressive disclosure. The primary flow is now Add Home → Overview → My Homes → Compare. The Kanban pipeline is collapsed until requested, while Search Guide, Landlord Messages, Readiness/Capture, and Before You Pay live inside expandable tool panels. Typography and form controls were enlarged, shadows/glass effects reduced, and the main housing cards/dialogs were simplified for clearer desktop and mobile scanning.

## Milan Home Hunt V4 — secure URL importer (2026-08-18)
V4 adds the serverless property importer, provider adapters, SSRF/domain protections, structured-data-first extraction, extended property facts, staged import feedback, pasted-text fallback, and secure source refresh. The clean V3 interface and all V2 decision/CRM features remain.

### Home Hunt V5 — phone-first app shell

The Housing page now uses a dedicated mobile app experience at phone widths: Home, Saved, Compare, and Tools are separate screens with a persistent bottom tab bar and a central Add action. The URL importer remains the primary action, saved-home cards become compact list cards, advanced tools stay out of the daily flow, and property/editor dialogs become full-screen mobile workspaces. Desktop keeps the full multi-section layout.


## Home Hunt V6 UX pass
- Phone-first typography/readability audit with larger labels and touch targets.
- First-screen 4-step Home Hunt guide.
- Main student page now explains the housing workflow before users open Home Hunt.
- Empty-state dashboard noise is removed until the first home is saved.
- Import helper clarifies that individual property URLs should be pasted and all extracted data is reviewed before saving.
