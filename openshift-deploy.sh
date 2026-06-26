#!/usr/bin/env bash
# openshift-deploy.sh
# One-shot build + deploy of ICA Weekly Report to IBM Cloud ROKS (OpenShift).
#
# Prerequisites:
#   - ibmcloud CLI  : https://cloud.ibm.com/docs/cli
#   - oc CLI        : download from your OpenShift web console  → ? → Command Line Tools
#   - docker CLI    : Docker Desktop or Podman (set DOCKER=podman if needed)
#
# Usage:
#   chmod +x openshift-deploy.sh
#   ./openshift-deploy.sh
# ---------------------------------------------------------------------------
set -euo pipefail

# ── Configuration — edit these four values ──────────────────────────────────
IBM_REGION="us-south"                       # matches your ITZ region
ICR_NAMESPACE="ica-app"                     # IBM Container Registry namespace (create once)
IMAGE_NAME="ica-weekly-report"
OC_PROJECT="ica-weekly-report"              # OpenShift project / namespace
# ---------------------------------------------------------------------------

DOCKER="${DOCKER:-docker}"
ICR_HOST="us.icr.io"                        # us-south registry endpoint
FULL_IMAGE="${ICR_HOST}/${ICR_NAMESPACE}/${IMAGE_NAME}:latest"

echo ""
echo "  ICA Weekly Report — IBM Cloud ROKS Deploy"
echo "  ─────────────────────────────────────────"
echo "  Image  : ${FULL_IMAGE}"
echo "  Project: ${OC_PROJECT}"
echo ""

# ── Step 1: IBM Cloud login ──────────────────────────────────────────────────
echo "▶  1/6  Logging into IBM Cloud..."
ibmcloud login --no-region -q
ibmcloud target -r "${IBM_REGION}" -q

# ── Step 2: Configure IBM Container Registry ─────────────────────────────────
echo "▶  2/6  Configuring IBM Container Registry..."
ibmcloud cr login
ibmcloud cr namespace-add "${ICR_NAMESPACE}" 2>/dev/null || true   # idempotent

# ── Step 3: Build Docker image ───────────────────────────────────────────────
echo "▶  3/6  Building Docker image..."
"${DOCKER}" build \
  --platform linux/amd64 \
  -t "${FULL_IMAGE}" \
  -f Dockerfile \
  .

# ── Step 4: Push image to IBM Container Registry ─────────────────────────────
echo "▶  4/6  Pushing image to ICR..."
"${DOCKER}" push "${FULL_IMAGE}"

# ── Step 5: Log into OpenShift cluster ───────────────────────────────────────
echo "▶  5/6  Connecting to OpenShift cluster..."
echo "        Opening the OpenShift web console — copy your login command from:"
echo "        OpenShift Console → top-right user menu → Copy login command"
echo ""
echo "        Paste the 'oc login' command here and press Enter, then re-run this"
echo "        script, OR run manually:"
echo ""
echo "          oc login --token=<token> --server=https://<cluster-api>"
echo ""
read -rp "        Press Enter once you have logged in with 'oc login'..."

# Create/switch project
oc get project "${OC_PROJECT}" 2>/dev/null || oc new-project "${OC_PROJECT}"
oc project "${OC_PROJECT}"

# Allow the default SA to pull from ICR
ibmcloud oc cluster config --cluster "$(ibmcloud oc clusters --output json 2>/dev/null | python3 -c "import sys,json; c=json.load(sys.stdin); print(c[0]['id'] if c else '')" 2>/dev/null || echo '')" 2>/dev/null || true

# Create ICR image pull secret if it doesn't exist
if ! oc get secret icr-pull-secret -n "${OC_PROJECT}" &>/dev/null; then
  echo "        Creating ICR image pull secret..."
  ibmcloud cr token-add --description "ica-pull" --non-expiring --readwrite 2>/dev/null || true
  ICR_PASS="$(ibmcloud cr token-list --format json 2>/dev/null | python3 -c "import sys,json; t=json.load(sys.stdin); print(t[0]['token'] if t else '')" 2>/dev/null || echo '')"
  if [ -n "${ICR_PASS}" ]; then
    oc create secret docker-registry icr-pull-secret \
      --docker-server="${ICR_HOST}" \
      --docker-username=iamapikey \
      --docker-password="${ICR_PASS}" \
      -n "${OC_PROJECT}"
    oc secrets link default icr-pull-secret --for=pull -n "${OC_PROJECT}"
  else
    echo "        ⚠  Could not auto-create pull secret — see README for manual steps."
  fi
fi

# ── Step 6: Apply Kubernetes/OpenShift manifests ─────────────────────────────
echo "▶  6/6  Applying manifests..."

# Patch the image reference in the deployment
sed "s|<YOUR_IMAGE>|${FULL_IMAGE}|g" k8s/deployment.yaml > /tmp/ica-deployment-patched.yaml

oc apply -f k8s/configmap.yaml
oc apply -f k8s/pvc.yaml
oc apply -f /tmp/ica-deployment-patched.yaml
rm -f /tmp/ica-deployment-patched.yaml

# Wait for rollout
echo ""
echo "  Waiting for deployment rollout..."
oc rollout status deployment/ica-weekly-report --timeout=120s

# Print the public URL
ROUTE_HOST="$(oc get route ica-weekly-report -o jsonpath='{.spec.host}' 2>/dev/null || echo '<pending>')"
echo ""
echo "  ✅  Deploy complete!"
echo "  🌐  App URL : https://${ROUTE_HOST}"
echo ""
