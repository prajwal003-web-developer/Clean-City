# CleanCity frontend

CleanCity is a community platform for reporting dirty public places, finding cleanup reports within 10 km, viewing them on an interactive map and joining cleanups. This repository is the React frontend for the existing Express/MongoDB backend.

## Features
- Nearby feed (default radius 10 km) with status, category, radius, sort and loaded-data search filters
- Resolved reports stay visible under **All** and **Resolved**
- Feed and map are linked: selecting a card highlights its marker and vice versa
- Full map page (all reports or nearby only), status-coloured pins, popups, recenter and fit-all controls
- Create and edit reports with up to 3 images, local previews, upload progress, and a map location picker
- Report details, join/leave cleanup, delete with confirmation, profile with "my reports"
- Auth with session restore, protected routes and return-to-destination after login
- Framer Motion transitions with reduced-motion support, skeleton/empty/error states, keyboard-accessible dialogs

## Tech stack
React 18 (JSX), Vite, Tailwind CSS 3, React Router 6, Axios, Zustand, Motion (`motion/react`), React Leaflet + OpenStreetMap, Lucide icons, React Hot Toast.

## Getting started
```bash
npm install
cp .env.example .env     # then edit values
npm run dev              # http://localhost:5173
npm run build            # production build in dist/
```
Prerequisites: Node 18+, and the Express backend running (default `http://localhost:5000`).

## Environment variables
| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | API base URL including `/api` |
| `VITE_AUTH_MODE` | `cookie` (default) or `bearer` |
| `VITE_NEARBY_LAT_PARAM`, `VITE_NEARBY_LNG_PARAM`, `VITE_NEARBY_DISTANCE_PARAM` | Query-parameter names for `GET /reports/nearby` |
| `VITE_NEARBY_DISTANCE_UNIT` | `meters` (sends `10000` for 10 km) or `km` |

`localhost` always means the device making the request. To test from a phone, set `VITE_API_URL` to the backend computer's LAN IP (e.g. `http://192.168.1.20:5000/api`), run the frontend with `npm run dev` (it listens on the network), and add the frontend origin to the backend CORS allow-list.

## Connecting to the backend
All requests live in `src/services/api.js`; endpoint paths for auth are in `src/utils/constants.js`.

**Authentication.** Cookie mode sends `withCredentials: true` and the backend must allow credentials with an explicit CORS origin (not `*`). Bearer mode stores only the token in `localStorage` and sends `Authorization: Bearer <token>`. Never enable both. Passwords are never stored. Session restore calls the current-user endpoint once at startup, and a 401 anywhere clears the session.

**Assumed contract (verify before going live):**
- Auth: `POST /auth/login` `{email,password}`, `POST /auth/register` `{name,email,password}`, `POST /auth/logout`, `GET /auth/me`
- Nearby query parameter names and distance unit (see variables above)
- Category values in `CATEGORIES` match the backend's accepted values
- Status values are `pending`, `in-progress`, `resolved` (variants like `in_progress` are normalised for display; the value sent by the admin status control is the lowercase hyphenated form)
- `removeFileIds` receives each file's `_id` (`getFileId` in `utils/formatters.js` falls back to `id`, then `fileID`)
- Responses may be bare, `{ data }`, `{ reports }` or `{ report }`; errors expose `message` or `errors[]`
- Admin detection uses `user.role === "admin"`
- Join/leave may return the updated report; if not, participants are patched locally

## Multipart uploads
Create/edit build a `FormData` with `title`, `category`, `description`, `coordinates` (JSON `[longitude, latitude]`) and each image under the field name **`files`**. Edits also send `removeFileIds` (JSON array). `Content-Type` is never set manually so the browser adds the multipart boundary. Images are validated client-side (JPEG/PNG/WEBP/GIF, 5 MB, max 3 including kept images). Preview object URLs are revoked on removal and unmount.

## Image URL resolution
`resolveFileUrl` combines the backend **origin** (the API URL without `/api`) with the file `path`, e.g. `/uploads/reports/a.jpg` becomes `http://localhost:5000/uploads/reports/a.jpg`. Absolute URLs pass through, Windows backslashes are normalised and missing paths are skipped. The backend must serve `/uploads` statically and allow the frontend origin.

## Geolocation
The browser prompt only appears after the user presses a button, or silently when permission was already granted. Denied/unavailable states are explained and the user can always pick a point on the map. The chosen location lives in `sessionStorage` for the tab session. Device positions are labelled approximate. No reverse-geocoding service is configured, so coordinates are shown instead of addresses.

## Maps
Leaflet with OpenStreetMap standard tiles (`src/utils/constants.js`). Pins are `divIcon`s, so no default-marker image fix is needed under Vite. OSM's public tile servers are for light use: for production traffic, use a hosted provider or your own tile server, keep the attribution, and follow https://operations.osmfoundation.org/policies/tiles/.

## Architecture
```
src/
  app/          App, router (lazy routes, protected/guest guards), providers
  components/   common (UI kit), layout, maps, reports
  features/     auth, home, map, profile, reports (store + hooks + pages), not-found
  hooks/        useGeolocation, useDebounce, useAuth, useMediaQuery
  services/     api.js (the only place that talks to the backend)
  store/        uiStore (feed/map selection)
  utils/        constants, formatters, validators, distance
```
**Stores.** `authStore` (session), `reportStore` (reports, filters, location, radius, in-flight actions; stale list responses are ignored), `uiStore` (selected report, mobile view). API calls stay in `api.js`; stores orchestrate; components render.

**Routes.** `/login`, `/register` (guests only); `/`, `/map`, `/reports/new`, `/reports/:id`, `/reports/:id/edit`, `/profile` (signed-in only); `*` shows a 404.

## Adding a feature
Add API methods to `services/api.js`, state to a store under `features/<name>/`, a page component, then a lazy route in `app/router.jsx` using the `page()` helper. Give reusable components a short JSDoc comment.

## Troubleshooting
- **Network error / "Can't reach the server"**: check `VITE_API_URL`, that the backend is running, and CORS.
- **Login works but the session is lost**: cookie mode needs `credentials: true` CORS, a specific origin, and `SameSite`/`Secure` settings that suit your setup.
- **Images missing**: open the resolved URL directly; confirm `/uploads` is served statically.
- **Nearby feed empty or wrong**: confirm the parameter names and distance unit in `.env`.
- **Upload rejected**: confirm the multer field name is `files` and limits match.
- **Grey map tiles**: the map container needs a height; check you haven't hidden it with `display: none` while it mounted.
