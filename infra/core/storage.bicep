// infra/core/storage.bicep
// Creates a Storage Account + Azure Files share for persistent SQLite storage.

param name          string
param location      string
param fileShareName string
param tags          object = {}

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name:     name
  location: location
  tags:     tags
  kind:     'StorageV2'
  sku: {
    name: 'Standard_LRS'
  }
  properties: {
    minimumTlsVersion:      'TLS1_2'
    supportsHttpsTrafficOnly: true
    allowBlobPublicAccess:  false
  }
}

resource fileService 'Microsoft.Storage/storageAccounts/fileServices@2023-01-01' = {
  parent: storageAccount
  name:   'default'
}

resource fileShare 'Microsoft.Storage/storageAccounts/fileServices/shares@2023-01-01' = {
  parent: fileService
  name:   fileShareName
  properties: {
    shareQuota: 1   // 1 GiB — ample for SQLite
  }
}

// ── Outputs ───────────────────────────────────────────────────────────────────
output accountKey    string = storageAccount.listKeys().keys[0].value
output accountName   string = storageAccount.name
