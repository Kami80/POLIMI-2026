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

This project was created by **Kamyab Safaei**. Kamyab's student profile receives a permanent **Creator** badge (instead of the temporary New badge). Profile reports are routed to Kamyab using the contact details in Kamyab's own sheet row, preferring Telegram and falling back to Polimi/form email when needed.

## App icon

The PWA, favicon, Apple touch icon, and in-app brand mark use the upgraded community artwork in the `icons/` directory.
