# Polimi Students 2026/2027

A mobile-first student directory for GitHub Pages, powered by a public Google Sheet.

## Features
- Responsive mobile-app style interface
- Student cards as the primary view
- Gender badge beside each student's name
- Program, campus, degree and roommate information prioritized
- Email and timestamp hidden from all directory views
- Email submission gate: visitors must use an email already present in the Google Form responses before the directory opens
- Multi-select checkbox filters for program, gender, campus and roommate preference
- Search, sorting, pagination and dark mode
- Google Form button for adding a student profile
- Desktop table view; mobile automatically uses cards

## Deploy on GitHub Pages
1. Upload `index.html`, `styles.css`, and `app.js` to the root of your GitHub repository.
2. In GitHub, open **Settings → Pages**.
3. Choose **Deploy from a branch**, select your main branch and `/ (root)`.
4. Save and wait for GitHub Pages to publish the site.

The connected Google Sheet must be publicly viewable for browser-only GitHub Pages access.


## Student profiles
Cards automatically include the optional self-description and turn Telegram usernames/IDs into profile links when possible. Timestamp and email remain hidden from the public UI.

## Member access gate
The page checks the visitor-entered email against the hidden email column in the connected Google Sheet. The match is case-insensitive and the email remains hidden from cards, search, and tables. A verified email is remembered only for the current browser tab/session.

**Important:** this is a client-side membership gate. Because GitHub Pages is static and the Google Sheet is publicly readable, it is not strong access control against someone who intentionally inspects the page/network or opens the Sheet endpoint directly. For real private access, use verified sign-in plus a backend/private Sheet.
