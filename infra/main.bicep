// infra/main.bicep
// ICA Weekly Report — Azure App Service + Azure Files (persistent SQLite)
// Deploy with: azd up

targetScope = 'subscription'

// ── Parameters ──────────────────────────────────────────────────────────────
@minLength(1)
@maxLength(64)
@description('Name of the environment (e.g. dev, prod). Used to suffix all resource names.')
param environmentName string

@minLength(1)
@description('Azure region for all resources.')
param location string

@description('Container image tag to deploy. Populated automatically by azd.')
param imageTag string = 'latest'

// ── Variables ────────────────────────────────────────────────────────────────
var resourceToken   = toLower(uniqueString(subscription().id, environmentName, location))
var abbrs = loadJsonContent('./abbreviations.json')

var resourceGroupName  = '${abbrs.resourcesResourceGroups}${environmentName}'
var appServicePlanName = '${abbrs.webServerFarms}${resourceToken}'
var appServiceName     = '${abbrs.webSitesAppService}${resourceToken}'
// Storage account names: max 24 chars, lowercase alphanumeric only
// 'st' prefix (2) + first 22 chars of the unique token = 24 chars total
var storageAccountName = '${abbrs.storageStorageAccounts}${take(resourceToken, 22)}'
var fileShareName      = 'icadata'
var acrName            = '${abbrs.containerRegistryRegistries}${resourceToken}'

// ── Resource Group ───────────────────────────────────────────────────────────
resource rg 'Microsoft.Resources/resourceGroups@2022-09-01' = {
  name:     resourceGroupName
  location: location
  tags: {
    'azd-env-name': environmentName
  }
}

// ── Modules ──────────────────────────────────────────────────────────────────
module storage 'core/storage.bicep' = {
  name:  'storage'
  scope: rg
  params: {
    name:          storageAccountName
    location:      location
    fileShareName: fileShareName
    tags: {
      'azd-env-name': environmentName
    }
  }
}

module acr 'core/acr.bicep' = {
  name:  'acr'
  scope: rg
  params: {
    name:     acrName
    location: location
    tags: {
      'azd-env-name': environmentName
    }
  }
}

module appService 'core/appservice.bicep' = {
  name:  'appservice'
  scope: rg
  params: {
    appServicePlanName: appServicePlanName
    appServiceName:     appServiceName
    location:           location
    imageTag:           imageTag
    acrLoginServer:     acr.outputs.loginServer
    acrName:            acrName
    storageAccountName: storageAccountName
    storageAccountKey:  storage.outputs.accountKey
    fileShareName:      fileShareName
    tags: {
      'azd-env-name':  environmentName
      'azd-service-name': 'api'
    }
  }
}

// ── Outputs  (consumed by azd) ───────────────────────────────────────────────
output AZURE_RESOURCE_GROUP       string = rg.name
output AZURE_CONTAINER_REGISTRY_NAME string = acr.outputs.name
output AZURE_CONTAINER_REGISTRY_ENDPOINT string = 'https://${acr.outputs.loginServer}'
output SERVICE_API_URI            string = appService.outputs.appUrl
