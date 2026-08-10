# Polimi Students 2026/2027

Static HTML/CSS/JavaScript student directory designed for GitHub Pages.

## Current UX

- New visitors see **Add my profile** first, followed by the email access check for students who already submitted the form.
- The directory automatically checks the submitted email against the Google Sheet and redirects unknown emails to the Google Form.
- Verified access is stored in `localStorage`, so returning users on the same browser are not asked for their email again.
- Search, selected filters, Card/Table preference, and roommate-matching mode are also remembered locally.
- Student cards stay intentionally minimal (name + program) with subtle pink/sky-blue gender gradients.
- Student profiles open in a full desktop modal / mobile bottom sheet with About Me, campus, degree, roommate preference, Telegram, Polimi mail and sharing.
- Shareable student URLs use `?student=student-slug`.
- Quick filters surface Roommates, common campuses and Master-level students, while the full multi-select filter sheet remains available.
- Recently submitted profiles can receive a small `New` marker when a timestamp column is available.
- Mobile navigation provides Students, Filters, Roommates and Update.

## Deploy to GitHub Pages

Upload these four files to the root of your repository:

- `index.html`
- `styles.css`
- `app.js`
- `README.md`

Then enable GitHub Pages from the repository settings and publish from your chosen branch/root folder.

## Data source

The site reads the configured Google Sheet using Google Visualization / GViz. The Sheet must remain readable by the browser for this static deployment model to work.

> The email check is an application-level membership gate. If the underlying Google Sheet is public, it is not equivalent to server-side access control for sensitive data.
