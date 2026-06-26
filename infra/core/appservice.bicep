// infra/core/appservice.bicep
// App Service Plan (B1 Linux) + Web App running the containerised Node.js image.
// An Azure Files share is mounted at /home/data for persistent SQLite storage.

param appServicePlanName string
param appServiceName     string
param location           string
param imageTag           string = 'latest'
param acrLoginServer     string
param acrName            string
param storageAccountName string
@secure()
param storageAccountKey  string
param fileShareName      string
param tags               object = {}

// ── App Service Plan (B1 Linux) ───────────────────────────────────────────────
resource plan 'Microsoft.Web/serverfarms@2022-09-01' = {
  name:     appServicePlanName
  location: location
  tags:     tags
  kind:     'linux'
  sku: {
    name:     'B1'
    tier:     'Basic'
    capacity: 1
  }
  properties: {
    reserved: true   // required for Linux
  }
}

// ── Web App ────────────────────────────────────────────────────────────────────
resource app 'Microsoft.Web/sites@2022-09-01' = {
  name:     appServiceName
  location: location
  tags:     tags
  kind:     'app,linux,container'
  properties: {
    serverFarmId: plan.id
    httpsOnly:    true
    siteConfig: {
      linuxFxVersion:  'DOCKER|${acrLoginServer}/${appServiceName}:${imageTag}'
      acrUseManagedIdentityCreds: false
      appSettings: [
        {
          name:  'DOCKER_REGISTRY_SERVER_URL'
          value: 'https://${acrLoginServer}'
        }
        {
          name:  'DOCKER_REGISTRY_SERVER_USERNAME'
          value: acrName
        }
        {
          name:  'DOCKER_REGISTRY_SERVER_PASSWORD'
          // NOTE: ACR admin password is fetched at deploy time — do NOT hardcode.
          // azd will inject this via azd env set / app settings update post-deploy.
          value: ''
        }
        {
          name:  'NODE_ENV'
          value: 'production'
        }
        {
          name:  'PORT'
          value: '8080'
        }
        {
          name:  'DB_PATH'
          value: '/home/data/ica_usage.db'
        }
        {
          name:  'WEBSITES_PORT'
          value: '8080'
        }
      ]
      // Enable Azure Files mount for persistent SQLite
      azureStorageAccounts: {
        icadata: {
          type:        'AzureFiles'
          accountName: storageAccountName
          shareName:   fileShareName
          mountPath:   '/home/data'
          accessKey:   storageAccountKey
        }
      }
      alwaysOn: true
    }
  }
}

// ── Outputs ───────────────────────────────────────────────────────────────────
output appUrl  string = 'https://${app.properties.defaultHostName}'
output appName string = app.name
