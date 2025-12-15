STEPS:
1) Get an OpenStates API key
- Sign up / request an API key at https://v3.openstates.org/. Copy the API key — you'll need it for the backend.

2) Backend setup

  cd backend
  # install dependencies listed in backend/package.json
  npm install
  (MIGHT NEED TO npm install dotenv if it doesn't pick it up)
  # Create a local .env from the example and add your OpenStates API key
  cp .env.example .env
  # Edit `backend/.env` and set:
  # OPENSTATES_API_KEY=your_real_openstates_api_key_here

  # Start the backend server (listens on port 3000 by default)
  node server.js

Notes:
- `server.js` loads environment variables with `dotenv` (require('dotenv').config()). If you see `Server missing OPENSTATES_API_KEY`, make sure `backend/.env` exists and contains `OPENSTATES_API_KEY` or export the env var in your shell before starting the server:

  OPENSTATES_API_KEY="your_key" node server.js


3) Frontend setup

  cd frontend
  npm install

  # Create frontend .env from the example. By default the project uses the server proxy so you do not have to put your key in the frontend.
  cp .env.example .env

  # If you leave VITE_USE_SERVER_PROXY=true (recommended), the frontend will call the backend proxy at /api/events and /api/people.geo.
  # If you set VITE_USE_SERVER_PROXY=false you must also add your OpenStates key to frontend/.env as VITE_OPENSTATES_API_KEY (NOT recommended for production).

  npm run dev

The Vite dev server runs (by default) on http://localhost:5173 and is configured to proxy `/api/*` to `http://localhost:3000` (see `frontend/vite.config.js`). Ensure the backend is running on port 3000 before using the app.

4) How the app works (quick)
- Representatives: type a US ZIP and click "Convert ZIP & Search". The frontend uses Zippopotam.us to resolve ZIP -> city/state/lat/lon and then calls the backend to fetch people for the location.
- Events: type a US ZIP and click "Convert ZIP & Search Events". The frontend converts ZIP -> state (full state name) and then calls the backend proxy `/api/events?jurisdiction=<StateName>`. The backend also implements a fallback that can look up jurisdiction by point and call `/events?jurisdiction=...` if needed.

5) Common troubleshooting
- 404 / Cannot GET /api/.. from the browser: make sure your backend is running on port 3000 and Vite proxy is enabled (it is by default in `vite.config.js`). If another process is listening on port 3000, stop it or change the backend port and update the proxy.
- 500 Server missing OPENSTATES_API_KEY: set `OPENSTATES_API_KEY` in `backend/.env` or export it in your shell before starting the backend.
- Blank page after search / UI crashes: open the browser console and paste the error here. The UI is defensive against upstream HTML in event descriptions (it strips tags) to avoid layout breakage. If you want formatted descriptions, we can sanitize HTML with a library like DOMPurify.

6) Development notes and configuration
- Change how many events are shown in the Events UI with the "Show: N events" input.
- To call OpenStates directly from the frontend (not recommended), set `VITE_USE_SERVER_PROXY=false` in `frontend/.env` and put `VITE_OPENSTATES_API_KEY=your_key` in `frontend/.env`. Restart the dev server after editing `.env`.
- Keep your real `.env` files out of version control. The repo contains `.env.example` files and `.gitignore` entries in both `frontend/` and `backend/` to help with this.

Enjoy — the app gives a quick local workflow for finding representatives and events by ZIP using OpenStates.
