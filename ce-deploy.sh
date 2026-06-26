#!/usr/bin/env bash
# ce-deploy.sh
# Deploy ICA Weekly Report to IBM Cloud Code Engine (free tier).
#
# What this does:
#   1. Installs required plugins (code-engine, container-registry)
#   2. Creates an IBM Container Registry namespace and pushes the Docker image
#   3. Creates a Code Engine project and deploys the app
#   4. Prints your public HTTPS URL
#
# Prerequisites:
#   - IBM Cloud CLI installed and logged in:
#       ibmcloud login -a https://cloud.ibm.com
#   - Docker Desktop running
#
# Usage (Mac/Linux):
#   chmod +x ce-deploy.sh && ./ce-deploy.sh
#
# Usage (Windows PowerShell) — run each command manually from the numbered
# sections below, replacing <YOUR_ORG_OR_ACCOUNT> with your account ID.
# ---------------------------------------------------------------------------
set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────
REGION="us-south"
ICR_HOST="us.icr.io"
ICR_NAMESPACE="ica-app"                     # will be created if it doesn't exist
IMAGE_NAME="ica-weekly-report"
CE_PROJECT="ica-weekly-report"
APP_NAME="ica-weekly-report"
MEMORY="512M"
CPU="0.25"
# ---------------------------------------------------------------------------

FULL_IMAGE="${ICR_HOST}/${ICR_NAMESPACE}/${IMAGE_NAME}:latest"

echo ""
echo "  ICA Weekly Report — IBM Cloud Code Engine Deploy"
echo "  ─────────────────────────────────────────────────"
echo "  Image  : ${FULL_IMAGE}"
echo "  Project: ${CE_PROJECT}"
echo "  Region : ${REGION}"
echo ""

# ── Step 1: Install plugins ───────────────────────────────────────────────────
echo "▶  1/5  Installing plugins..."
ibmcloud plugin install code-engine    -f 2>/dev/null || true
ibmcloud plugin install container-registry -f 2>/dev/null || true

# ── Step 2: Set region and log into Container Registry ───────────────────────
echo "▶  2/5  Setting region and logging into Container Registry..."
ibmcloud target -r "${REGION}"
ibmcloud cr region-set "${REGION}"
ibmcloud cr login

# Create namespace (idempotent)
ibmcloud cr namespace-add "${ICR_NAMESPACE}" 2>/dev/null || echo "  (namespace already exists)"

# ── Step 3: Build and push Docker image ──────────────────────────────────────
echo "▶  3/5  Building Docker image (this takes ~3-5 min first time)..."
docker build --platform linux/amd64 -t "${FULL_IMAGE}" .

echo "        Pushing to IBM Container Registry..."
docker push "${FULL_IMAGE}"

# ── Step 4: Create Code Engine project and deploy ────────────────────────────
echo "▶  4/5  Setting up Code Engine project..."

# Create project if needed (one project per region on free tier)
ibmcloud ce project create --name "${CE_PROJECT}" --region "${REGION}" 2>/dev/null \
  || echo "  (project already exists)"

ibmcloud ce project select --name "${CE_PROJECT}"

# Create an IAM API key for Code Engine to pull from ICR
echo "        Configuring ICR image pull access for Code Engine..."
ibmcloud ce registry create \
  --name icr-creds \
  --server "${ICR_HOST}" \
  --username iamapikey \
  --password "$(ibmcloud iam api-key-create ce-icr-pull --output json | grep -o '"apikey":"[^"]*"' | cut -d'"' -f4)" \
  2>/dev/null || echo "  (registry credentials already set)"

# Deploy (or update) the application
echo "▶  5/5  Deploying application..."
if ibmcloud ce app get --name "${APP_NAME}" &>/dev/null; then
  # Update existing app
  ibmcloud ce app update \
    --name "${APP_NAME}" \
    --image "${FULL_IMAGE}" \
    --registry-secret icr-creds \
    --memory "${MEMORY}" \
    --cpu "${CPU}" \
    --port 8080 \
    --env NODE_ENV=production \
    --env DB_PATH=/tmp/ica_usage.db \
    --min-scale 0 \
    --max-scale 1
else
  # Create new app
  ibmcloud ce app create \
    --name "${APP_NAME}" \
    --image "${FULL_IMAGE}" \
    --registry-secret icr-creds \
    --memory "${MEMORY}" \
    --cpu "${CPU}" \
    --port 8080 \
    --env NODE_ENV=production \
    --env DB_PATH=/tmp/ica_usage.db \
    --min-scale 0 \
    --max-scale 1
fi

# ── Done ──────────────────────────────────────────────────────────────────────
APP_URL="$(ibmcloud ce app get --name "${APP_NAME}" --output json 2>/dev/null \
  | grep -o '"endpoint":"[^"]*"' | head -1 | cut -d'"' -f4 \
  || echo '<run: ibmcloud ce app get --name ica-weekly-report>')"

echo ""
echo "  ✅  Deploy complete!"
echo "  🌐  URL : ${APP_URL}"
echo ""
echo "  Useful commands:"
echo "    ibmcloud ce app logs --name ${APP_NAME}           # view logs"
echo "    ibmcloud ce app update --name ${APP_NAME} ...     # update settings"
echo "    ibmcloud ce app delete --name ${APP_NAME}         # delete app"
echo ""
echo "  ⚠️  Code Engine free tier note:"
echo "      App scales to zero after inactivity (~10 min). First request"
echo "      after idle may take 5-10 seconds (cold start)."
echo "      SQLite data at /tmp/ica_usage.db resets when the instance restarts."
echo "      Re-upload your CSV if data disappears."
echo ""
