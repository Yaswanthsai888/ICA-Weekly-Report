# ICA Weekly Report Application

Analytics dashboard for tracking daily ICA (IBM Consulting Assistant) usage across the JDE stream. Upload the team CSV once per day and instantly see monthly pivot tables, weekly breakdowns, user reports, and assistant statistics.

---

## Quick Start (Development)

```powershell
# 1. Install all dependencies
npm run install:all

# 2. Start the backend  (terminal 1)
npm run dev:backend       # http://localhost:5000

# 3. Start the frontend (terminal 2)
npm run dev:frontend      # http://localhost:3000
```

---

## Production Deployment (LAN / Internal Server)

### One-time setup

```powershell
# Install dependencies and build the React app
npm run setup
```

This runs `npm install` in both `backend/` and `frontend/`, then creates an optimised production build at `frontend/build/`.

### Configure the port (optional)

```powershell
copy backend\.env.example backend\.env
# Edit backend\.env — change PORT if 5000 is taken
```

### Start the server

**Option A — double-click (Windows):**
```
start.bat
```

**Option B — command line:**
```powershell
$env:NODE_ENV="production"; node backend/server.js
```

The server serves both the API and the React app from a single port.  
Open **`http://<server-ip>:5000`** on any machine on the same network.

### Run on startup (Windows Task Scheduler)

1. Open **Task Scheduler → Create Basic Task**
2. Trigger: *At system startup*
3. Action: *Start a program* → browse to `start.bat`
4. Check *Run whether user is logged on or not* if needed

---

## Cloud Deployment — IBM Cloud Foundry ✅ (Free Tier, Recommended)

No Docker, no Kubernetes, no credit card. The IBM Cloud **free Lite account** includes 256 MB of Cloud Foundry memory — enough to run this app. The CF buildpack builds the React frontend at staging time and starts the lean Node.js server at runtime.

### Step 1 — Install IBM Cloud CLI (once)

**Windows** — download and run the installer:
```
https://github.com/IBM-Cloud/ibm-cloud-cli-release/releases/latest
→ ibmcloud-cli-installer.exe
```

**Mac / Linux:**
```bash
curl -fsSL https://clis.cloud.ibm.com/install/linux | sh
```

Then install the CF plugin:
```bash
ibmcloud plugin install cf
```

### Step 2 — Deploy (3 commands)

```bash
# Log in with your IBMid (email + password at cloud.ibm.com)
ibmcloud login -a cloud.ibm.com --no-region

# Target your Cloud Foundry org and space
ibmcloud target --cf-api https://api.us-south.cf.cloud.ibm.com -o <YOUR_ORG> -s dev

# Push — builds React + starts Node.js, takes ~3-5 min first time
ibmcloud cf push ica-weekly-report -f manifest.yml
```

Your app will be live at:
```
https://ica-weekly-report.us-south.cf.appdomain.cloud
```

### Or use the helper script

```bash
chmod +x cf-deploy.sh
./cf-deploy.sh
# Prompts for IBMid login, lists your org, then pushes automatically
```

### Deployment files

| File | Purpose |
|------|---------|
| [`manifest.yml`](manifest.yml) | 256M memory, nodejs buildpack, env vars (`NODE_ENV`, `DB_PATH`) |
| [`.cfignore`](.cfignore) | Excludes `node_modules/`, `frontend/build/`, `.db` files from upload |
| [`cf-deploy.sh`](cf-deploy.sh) | End-to-end: login → target org → `cf push` → print URL |

### How the build works on CF

CF staging runs `npm install` at the root level, which triggers the `postinstall` hook in [`package.json`](package.json). This hook:
1. Installs frontend dependencies
2. Builds the React app (`npm run build`) — runs at **staging time**, not runtime
3. Installs backend dependencies
4. Creates the `/home/vcap/app/data/` directory for SQLite

At **runtime**, CF only runs `node backend/server.js` — well within the 256M limit.

### ⚠️ SQLite persistence on Cloud Foundry

CF has an ephemeral filesystem — `ica_usage.db` persists while the app is running but **resets on `cf push` or a platform restart**.

- ✅ Normal daily use (upload CSV → view reports) works perfectly
- ⚠️ After a `cf push` redeploy, re-upload your CSV to restore data
- 💡 Want permanent storage? Ask and we can add an **IBM Cloudant** binding

---

## Cloud Deployment — IBM Cloud ROKS (OpenShift)

Your ITZ reservation provisions a **Red Hat OpenShift on IBM Cloud (ROKS)** cluster.
Use `openshift-deploy.sh` to build the Docker image, push it to IBM Container Registry, and deploy to the cluster.

### Prerequisites — install once on your machine

| Tool | Install |
|------|---------|
| IBM Cloud CLI | `curl -fsSL https://clis.cloud.ibm.com/install/linux \| sh` or [download](https://cloud.ibm.com/docs/cli) |
| `ibmcloud cr` plugin | `ibmcloud plugin install container-registry` |
| `ibmcloud oc` plugin | `ibmcloud plugin install oc` |
| `oc` CLI | OpenShift Console → **?** → **Command Line Tools** → download |
| Docker | Docker Desktop (or Podman — set `export DOCKER=podman`) |

### One-command deploy

```bash
# 1. Edit the four variables at the top of the script
#    IBM_REGION, ICR_NAMESPACE, IMAGE_NAME, OC_PROJECT
nano openshift-deploy.sh      # or open in VS Code

# 2. Run it
chmod +x openshift-deploy.sh
./openshift-deploy.sh
```

The script will:
1. Log into IBM Cloud + IBM Container Registry
2. Build the Docker image (multi-stage: React → Node.js 18)
3. Push the image to ICR (`us.icr.io/<namespace>/ica-weekly-report:latest`)
4. Prompt you to paste your `oc login` token (from the OpenShift web console)
5. Create the OpenShift project, apply all manifests, and wait for rollout
6. Print your public HTTPS URL

### Manual apply (if you prefer)

```bash
# Set your image in the deployment manifest first
IMAGE="us.icr.io/<namespace>/ica-weekly-report:latest"
sed -i "s|<YOUR_IMAGE>|${IMAGE}|g" k8s/deployment.yaml

# Apply manifests in order
oc apply -f k8s/configmap.yaml
oc apply -f k8s/pvc.yaml
oc apply -f k8s/deployment.yaml

# Get the public URL
oc get route ica-weekly-report -o jsonpath='{.spec.host}'
```

### Kubernetes / OpenShift manifest files

| File | Purpose |
|------|---------|
| [`k8s/configmap.yaml`](k8s/configmap.yaml) | `NODE_ENV`, `PORT`, `DB_PATH` env vars |
| [`k8s/pvc.yaml`](k8s/pvc.yaml) | 1 GiB IBM Cloud File Storage PVC for SQLite |
| [`k8s/deployment.yaml`](k8s/deployment.yaml) | Deployment (1 replica) + ClusterIP Service + OpenShift Route (HTTPS) |
| [`openshift-deploy.sh`](openshift-deploy.sh) | End-to-end build & deploy helper script |

### ITZ-specific notes

| Detail | Value |
|--------|-------|
| Cloud account | `tsglwatson` |
| Region | `us-south` |
| Datacenter | `sjc04` |
| Reservation ID | `6a3e19a33a224c82a1c06de3` |
| Idle timeout | 3 hours (10800 s) — keep the app active |
| Expiry | 2026-06-28 06:20 UTC — save your data before then |

> ⚠️ **ITZ environments are ephemeral.** Export/back up `ica_usage.db` from the PVC before the reservation expires on **2026-06-28**.

---

## Cloud Deployment — Microsoft Azure (optional / future)

The `infra/` Bicep templates and `azure.yaml` are ready for Azure App Service deployment via Azure Developer CLI.
See [`.azure/deployment-plan.md`](.azure/deployment-plan.md) for full details.

```powershell
# Requires: azd CLI + az CLI installed
azd up
```

---

## Project Structure

```
ICA_Weekly_report_Application/
├── backend/
│   ├── server.js        # Express API + serves React build in production
│   ├── database.js      # SQLite helpers
│   ├── csvParser.js     # CSV parsing (DD/MM/YYYY, ambiguous dates, JDE filter)
│   ├── .env.example     # Copy to .env and set PORT / NODE_ENV
│   └── ica_usage.db     # SQLite DB (auto-created; not committed to git)
├── frontend/
│   ├── src/
│   │   ├── App.js                    # Sidebar layout + upload widget
│   │   └── components/
│   │       ├── Dashboard.js          # Monthly pivot table + weekly bar chart
│   │       ├── UsageExplorer.js      # Full filter/search + charts
│   │       ├── UserReports.js        # Per-user weekly drill-down
│   │       └── AssistantReports.js   # Assistant ranking + pie/bar charts
│   └── build/                        # Production build output (gitignored)
├── package.json         # Root scripts (install:all, build, start, setup)
├── start.bat            # One-click Windows launcher
└── README.md
```

---

## Daily Upload Workflow

1. Export the latest ICA usage CSV from your tracker.
2. Drag it onto the **Import CSV** widget in the left sidebar — from any page.
3. Click **Upload & Process**.
4. The feedback shows how many **new records** were added vs already stored.
   - If you re-upload the same file: `✓ Already up to date` — safe, nothing changes.
   - If the day's new entries were added: `✓ N new records added` — the dashboard refreshes automatically.

---

## CSV Format

| Column | Content |
|--------|---------|
| 1 (A) | Employee name |
| 2 (B) | Email address |
| 3 (C) | Scrum Master |
| 4 (D) | Stream (only **JDE** rows are imported) |
| 5+ | Daily date columns — assistant name(s) used |

Row 0 contains the date headers (DD/MM/YYYY or MM/DD/YYYY — ambiguity resolved automatically).  
Row 1 is skipped. Data rows start at row 2.

Multi-row user blocks are supported (user owns all rows until the next row with a name + stream).

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload-csv` | Upload & process CSV |
| GET | `/api/users` | All users |
| GET | `/api/usage?startDate&endDate` | Usage records in range |
| GET | `/api/monthly-summary?year&month` | Pivot data for dashboard |
| GET | `/api/available-weeks` | Week list for dropdowns |
| GET | `/api/weekly-summary?startDate&endDate` | Weekly summary |
| GET | `/api/assistant-stats?startDate&endDate` | Assistant rankings |
| GET | `/api/user-usage/:userId?startDate&endDate` | Per-user detail |
| DELETE | `/api/clear-data` | Wipe all data |
| GET | `/api/health` | Health check |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js 18 + Express 4 |
| Database | SQLite 3 (file-based, no separate DB server) |
| CSV parsing | csv-parse 5 |
| Frontend | React 18 + MUI 5 + Recharts 2 |
| Fonts | Inter (Google Fonts) |

---

## Troubleshooting

**Port 5000 already in use**
```powershell
# backend\.env
PORT=5001
```

**Database reset**
Delete `backend/ica_usage.db` — it is recreated automatically on next start.

**`npm` not recognised in PowerShell**
Use the full path:
```powershell
& "C:\Program Files\nodejs\npm.cmd" run setup
```

---

**Version:** 1.0.0 · **Last updated:** June 2026 · Internal IBM use only
