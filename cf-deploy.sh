#!/usr/bin/env bash
# cf-deploy.sh
# Deploy ICA Weekly Report to IBM Cloud Foundry (free Lite account).
#
# Prerequisites:
#   Install IBM Cloud CLI:
#     Windows : https://github.com/IBM-Cloud/ibm-cloud-cli-release/releases/latest
#               (download ibmcloud-cli-installer.exe)
#     Mac/Linux: curl -fsSL https://clis.cloud.ibm.com/install/linux | sh
#   Then install the CF plugin:
#     ibmcloud plugin install cf
#
# Usage:
#   chmod +x cf-deploy.sh   (Mac/Linux)
#   ./cf-deploy.sh
# ---------------------------------------------------------------------------
set -euo pipefail

# ── Configuration ────────────────────────────────────────────────────────────
CF_API="https://api.us-south.cf.cloud.ibm.com"
APP_NAME="ica-weekly-report"
CF_SPACE="dev"
# ---------------------------------------------------------------------------

echo ""
echo "  ICA Weekly Report — IBM Cloud Foundry (Free Tier) Deploy"
echo "  ──────────────────────────────────────────────────────────"
echo "  API   : ${CF_API}"
echo "  App   : ${APP_NAME}"
echo ""

# ── Check for ibmcloud CLI ───────────────────────────────────────────────────
if ! command -v ibmcloud &>/dev/null; then
  echo "  ✗  IBM Cloud CLI not found."
  echo ""
  echo "  Install it:"
  echo "    Windows : download from https://github.com/IBM-Cloud/ibm-cloud-cli-release/releases/latest"
  echo "    Mac     : curl -fsSL https://clis.cloud.ibm.com/install/osx | sh"
  echo "    Linux   : curl -fsSL https://clis.cloud.ibm.com/install/linux | sh"
  echo ""
  exit 1
fi

# Ensure CF plugin is installed
if ! ibmcloud cf version &>/dev/null 2>&1; then
  echo "  Installing CF plugin..."
  ibmcloud plugin install cf -f
fi

# ── Step 1: Login ────────────────────────────────────────────────────────────
echo "▶  1/3  Logging in to IBM Cloud..."
echo "        Enter your IBMid email and password when prompted."
echo ""
ibmcloud login -a cloud.ibm.com --no-region

# Target Cloud Foundry — list available orgs/spaces
echo ""
echo "  Available Cloud Foundry orgs:"
ibmcloud cf orgs
echo ""
read -rp "  Enter your CF org name (shown above): " CF_ORG

# Create space if it doesn't exist, then target it
ibmcloud cf create-space "${CF_SPACE}" -o "${CF_ORG}" 2>/dev/null || true
ibmcloud target --cf-api "${CF_API}" -o "${CF_ORG}" -s "${CF_SPACE}"

# ── Step 2: Push ─────────────────────────────────────────────────────────────
echo ""
echo "▶  2/3  Pushing app to Cloud Foundry..."
echo "        The buildpack will install deps and build the React frontend."
echo "        This takes ~3-5 minutes on first push."
echo ""
ibmcloud cf push "${APP_NAME}" -f manifest.yml

# ── Step 3: Done ─────────────────────────────────────────────────────────────
echo ""
APP_URL="$(ibmcloud cf app "${APP_NAME}" | grep -E 'routes:' | awk '{print $2}' || echo '<check cf app output above>')"
echo "▶  3/3  Done!"
echo ""
echo "  ✅  App is live!"
echo "  🌐  URL : https://${APP_URL}"
echo ""
echo "  Useful commands:"
echo "    ibmcloud cf logs ${APP_NAME} --recent    # view logs"
echo "    ibmcloud cf restage ${APP_NAME}          # rebuild after code changes"
echo "    ibmcloud cf stop ${APP_NAME}             # stop to save free quota"
echo ""
echo "  ⚠️  Free Lite account note:"
echo "      SQLite data resets on each 'cf push' — re-upload your CSV after redeploy."
echo "      Normal daily use (upload → view reports) is unaffected."
echo ""
