# DataPulse — API Server

Express.js REST API server for the DataPulse monthly data usage monitor.  
Screenshots are hosted on Cloudinary. Data is stored in a local JSON file.

---

## Folder Structure

```
server/
├── index.js                  ← App entry point, middleware, server start
├── package.json
├── routes/
│   └── usage.js              ← Route definitions
├── controllers/
│   └── usageController.js    ← Business logic & response handlers
├── data/
│   └── usage.json            ← Data source (edit this to add/update months)
└── public/
    └── screenshots/          ← Local screenshot images (optional if using Cloudinary)
```

---

## Requirements

- Node.js v18 or higher
- npm v9 or higher

---

## Installation

```bash
cd server
npm install
```

---

## Running the Server

### Production
```bash
npm start
```

### Development (auto-restarts on file changes)
```bash
npm run dev
```

Server runs on **http://localhost:3001** by default.

You should see:
```
DataPulse API running on http://localhost:3001
  GET /api/health
  GET /api/usage
  GET /api/usage?status=ongoing
  GET /api/usage?status=completed
  GET /api/usage/:month
  GET /api/stats
  GET /screenshots/:filename
```

---

## Environment Variables

Create a `.env` file inside the `server/` folder if needed:

```env
PORT=3001
CLIENT_ORIGIN=http://localhost:5173
```

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Port the server listens on |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Allowed CORS origin (your frontend URL) |

> In production set `CLIENT_ORIGIN` to your deployed frontend URL, e.g. `https://datapulse.netlify.app`

---

## API Reference

All endpoints return JSON in this shape:

```json
{ "success": true, "data": ... }
```

On error:

```json
{ "success": false, "error": "message" }
```

---

### GET `/api/health`

Health check. Confirms the server is running.

**Response**
```json
{
  "success": true,
  "status": "ok",
  "timestamp": "2026-03-11T00:00:00.000Z"
}
```

---

### GET `/api/usage`

Returns all months sorted **oldest → newest**.

**Query params (optional)**

| Param | Value | Description |
|---|---|---|
| `status` | `ongoing` | Returns only the current live month |
| `status` | `completed` | Returns only finished months |

**Example requests**
```
GET /api/usage
GET /api/usage?status=ongoing
GET /api/usage?status=completed
```

**Response**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "month": "Nov 2025",
      "usage_gb": 195,
      "screenshot": "https://res.cloudinary.com/your-cloud/image/upload/Screenshot_Nov_2025.jpg",
      "updated_at": "2025-11-21",
      "status": "completed"
    },
    {
      "id": 5,
      "month": "Mar 2026",
      "usage_gb": 225,
      "screenshot": "https://res.cloudinary.com/your-cloud/image/upload/Screenshot_Mar_2026.jpg",
      "updated_at": "2026-03-11",
      "status": "ongoing"
    }
  ]
}
```

---

### GET `/api/usage/:month`

Returns a single month by name.

**Example request**
```
GET /api/usage/Mar%202026
```

**Response**
```json
{
  "success": true,
  "data": {
    "id": 5,
    "month": "Mar 2026",
    "usage_gb": 225,
    "screenshot": "https://res.cloudinary.com/your-cloud/image/upload/Screenshot_Mar_2026.jpg",
    "updated_at": "2026-03-11",
    "status": "ongoing"
  }
}
```

**404 if not found**
```json
{
  "success": false,
  "error": "Month not found"
}
```

---

### GET `/api/stats`

Returns pre-computed aggregate statistics. The `lastUpdated` field is derived
from the ongoing month's `updated_at` and formatted as `DD.MM.YYYY` for display
in the frontend header.

**Response**
```json
{
  "success": true,
  "data": {
    "totalUsage": 1260,
    "avgUsage": 252,
    "monthCount": 5,
    "peakMonth": {
      "id": 4,
      "month": "Feb 2026",
      "usage_gb": 414,
      "updated_at": "2026-02-11",
      "status": "completed"
    },
    "predicted": 272,
    "currentVsPrev": -45.6,
    "lastUpdated": "11.03.2026"
  }
}
```

| Field | Description |
|---|---|
| `totalUsage` | Sum of all months in GB |
| `avgUsage` | Average GB per month |
| `monthCount` | Total number of months tracked |
| `peakMonth` | Month object with the highest usage |
| `predicted` | Next month forecast using 2nd-order difference |
| `currentVsPrev` | % change from previous month to current |
| `lastUpdated` | `updated_at` of ongoing month as `DD.MM.YYYY` |

---

### GET `/screenshots/:filename`

Serves local screenshot image files from `public/screenshots/`.

```
GET /screenshots/Screenshot_Mar_2026.jpg
```

> This is only used if you store screenshots locally.  
> If using Cloudinary, the `screenshot` field in `usage.json` is already a full URL
> and this endpoint is not needed.

---

## Data File

Edit `data/usage.json` to add or update months. The server reads this file on
every request so **no restart is needed** after editing.

```json
[
  {
    "id": 1,
    "month": "Nov 2025",
    "usage_gb": 195,
    "screenshot": "https://res.cloudinary.com/your-cloud/image/upload/Screenshot_Nov_2025.jpg",
    "updated_at": "2025-11-21",
    "status": "completed"
  },
  {
    "id": 5,
    "month": "Mar 2026",
    "usage_gb": 225,
    "screenshot": "https://res.cloudinary.com/your-cloud/image/upload/Screenshot_Mar_2026.jpg",
    "updated_at": "2026-03-11",
    "status": "ongoing"
  }
]
```

**Field reference**

| Field | Type | Description |
|---|---|---|
| `id` | number | Unique identifier |
| `month` | string | Display name e.g. `"Mar 2026"` |
| `usage_gb` | number | Data used in GB |
| `screenshot` | string | Full Cloudinary URL or local filename |
| `updated_at` | string | Date in `YYYY-MM-DD` format |
| `status` | string | `"completed"` or `"ongoing"` — only one month should be `"ongoing"` at a time |

---

## Deploying (Free, No Card Required)

### Koyeb (Recommended — never sleeps)

1. Push `server/` to a GitHub repository
2. Go to [koyeb.com](https://koyeb.com) → **Create App**
3. Connect your GitHub repo
4. Set build and run commands:
   ```
   Build:  npm install
   Run:    npm start
   ```
5. Add environment variable:
   ```
   CLIENT_ORIGIN = https://your-app.netlify.app
   ```
6. Deploy — you'll get a URL like `https://datapulse-api.koyeb.app`

### Railway (Alternative)

1. Go to [railway.app](https://railway.app) → **New Project → Deploy from GitHub**
2. Select your repo
3. Set root directory to `server`
4. Add environment variable:
   ```
   CLIENT_ORIGIN = https://your-app.netlify.app
   ```

---

## Connecting to the Frontend

After deploying, set this environment variable in your **Netlify** frontend:

```env
VITE_API_URL=https://your-server-url.koyeb.app
```

And set this in your **server** hosting (Koyeb / Railway):

```env
CLIENT_ORIGIN=https://your-app.netlify.app
```

Both must point at each other for CORS to work correctly.

---

## Dependencies

| Package | Version | Purpose |
|---|---|---|
| `express` | ^4.18.2 | Web framework |
| `cors` | ^2.8.5 | Cross-origin request handling |
| `nodemon` | ^3.0.2 | Dev auto-restart (devDependency) |