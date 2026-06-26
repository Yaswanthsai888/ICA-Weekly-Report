// infra/core/acr.bicep
// Azure Container Registry — stores the Docker image built by azd.

param name     string
param location string
param tags     object = {}

resource registry 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name:     name
  location: location
  tags:     tags
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: true   // required for App Service pull via admin credentials
  }
}

// ── Outputs ───────────────────────────────────────────────────────────────────
output name        string = registry.name
output loginServer string = registry.properties.loginServer
