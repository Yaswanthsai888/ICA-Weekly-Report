# ICA Weekly Report — Azure Deployment Plan

**Status:** Ready for Validation

---

## App Summary
| Item | Detail |
|------|--------|
| App type | Node.js Express API + React 18 SPA (single process, static files served by backend) |
| Database | SQLite (file-based) — persisted via Azure Files mount on App Service |
| File uploads | CSV via multer (temp files, deleted after parse) |
| Auth | None (internal team tool) |

---

## Target Architecture

```
Browser (any location)
       │  HTTPS
       ▼
Azure App Service (B1 Linux)
  ├── Docker container: Node.js 18 Express  →  /api/*
  ├── Serves frontend/build  →  /*
  └── Azure Files mount at /home/data  →  ica_usage.db (persistent SQLite)
       │
Azure Container Registry (Basic)  ←  azd pushes Docker image here
Azure Storage Account (Standard LRS)  →  Azure Files share "icadata" (1 GiB)
```

### Why this architecture?
- **Single container** — backend serves both API and React build, no separate static hosting needed
- **B1 App Service** (~$13/month) — adequate for an internal team tool
- **Azure Files mount** — zero code change for SQLite persistence; survives restarts and slot swaps
- **ACR Basic** (~$5/month) — private image registry for the Docker image
- **Total: ~$18–20 USD/month**

---

## Azure Resources

| Resource | SKU | Purpose |
|----------|-----|---------|
| Resource Group | — | Container for all resources |
| Azure Container Registry | Basic | Stores Docker image built by `azd` |
| App Service Plan | B1 Linux | Hosts the Node.js container |
| App Service | Docker/Linux | Runs the application on port 8080 |
| Storage Account | Standard LRS | Provides Azure Files share for SQLite persistence |
| Azure Files share "icadata" | 1 GiB | Mounted at `/home/data` inside the container |

---

## Deployment Method
- **Azure Developer CLI (`azd`)** with Bicep IaC
- Single `azd up` command provisions + deploys everything
- GitHub Actions CI/CD can be added later with `azd pipeline config`

---

## Generated Artifacts

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage build: React build → production Node image |
| `azure.yaml` | AZD service configuration |
| `infra/main.bicep` | Subscription-scoped Bicep entry point |
| `infra/main.parameters.bicepparam` | Parameter file (reads env vars) |
| `infra/abbreviations.json` | Resource name prefix map |
| `infra/core/acr.bicep` | Azure Container Registry module |
| `infra/core/storage.bicep` | Storage Account + Azure Files share module |
| `infra/core/appservice.bicep` | App Service Plan + Web App module |

---

## Steps

### Phase 1 — Preparation ✅
- [x] Write deployment plan
- [x] Patch `backend/database.js` to use `DB_PATH` env var
- [x] Generate `Dockerfile` (multi-stage: React build + Node.js prod image)
- [x] Generate `infra/` Bicep templates (ACR, App Service Plan, App Service, Storage Account, Azure Files)
- [x] Generate `azure.yaml`
- [x] Set App Service startup command + env vars (`NODE_ENV`, `PORT`, `DB_PATH`, `WEBSITES_PORT`)
- [x] Configure persistent `/home/data` mount for SQLite via `azureStorageAccounts`

### Phase 2 — Validate
- [ ] Run azure-validate

### Phase 3 — Deploy
- [ ] Confirm Azure subscription + region
- [ ] Run `azd up`
- [ ] Verify app URL is accessible
- [ ] Test CSV upload end-to-end

---

## Environment Variables (App Service Application Settings)

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `PORT` | `8080` |
| `WEBSITES_PORT` | `8080` |
| `DB_PATH` | `/home/data/ica_usage.db` |
| `DOCKER_REGISTRY_SERVER_URL` | `https://<acr>.azurecr.io` |
| `DOCKER_REGISTRY_SERVER_USERNAME` | `<acr-name>` |
| `DOCKER_REGISTRY_SERVER_PASSWORD` | *(injected by azd post-deploy)* |

---

## Pre-deploy checklist

- [x] `backend/database.js` uses `DB_PATH` env var
- [x] `backend/server.js` uses `PORT` from env
- [x] `server.js` serves `frontend/build` as static files in production
- [x] `Dockerfile` performs multi-stage build; final image exposes port 8080
- [x] `azure.yaml` references `./Dockerfile` and targets `appservice`
- [x] Bicep provisions ACR, App Service Plan (B1 Linux), App Service, Storage + Azure Files
- [x] Azure Files share "icadata" mounted at `/home/data` inside container
