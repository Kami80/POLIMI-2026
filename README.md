# Polimi Students 2026/2027

A static, GitHub Pages-ready dashboard that displays Google Sheets data using only HTML, CSS and JavaScript.

## Connected spreadsheet

The project is already configured for:

`1-OQdEoogFykiQuKBvreFRFFujNtr7kuQBTma6aINgOE`

It currently reads `gid=0` (normally the first tab).

## Features

- Multi-select checkbox slicers for Program name, Gender, Campus, and Want roommate
- Multiple selections inside a slicer use OR logic; different slicers combine with AND logic

- Automatic Google Sheet column detection
- Responsive table view
- Mobile-friendly card view
- Search across every field
- Automatic filters for categorical columns
- Click column headers to sort
- Pagination
- Dark / light theme
- URL, email and image-link detection
- Live refresh button
- No framework, no build step
- Ready for GitHub Pages

## Before deploying

The spreadsheet must be viewable without signing in. In Google Sheets:

1. Click **Share**.
2. Under General access, choose **Anyone with the link**.
3. Set permission to **Viewer**.

If you want a different tab, open that tab in Google Sheets, copy the number after `gid=` in the URL and replace `sheetGid` in `app.js`.

## Customize

Open `app.js` and edit the `CONFIG` object at the top:

```js
const CONFIG = {
  sheetId: "YOUR_SHEET_ID",
  sheetGid: "0",
  siteTitle: "Your data,\nmade inviting.",
  siteSubtitle: "Your subtitle here.",
  brandName: "Polimi Students 2026/2027",
  rowsPerPage: 24,
  defaultView: "table",
};
```

## Deploy to GitHub Pages

1. Create a new GitHub repository.
2. Upload `index.html`, `styles.css`, `app.js` and optionally this `README.md` to the repository root.
3. Commit the files.
4. Open **Settings → Pages**.
5. Under **Build and deployment**, choose **Deploy from a branch**.
6. Select `main` and `/ (root)`, then save.

GitHub will publish the website at your GitHub Pages URL.

## Local preview

You can open `index.html` directly, but using a simple local server is better:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.
