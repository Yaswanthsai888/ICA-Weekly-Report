using './main.bicep'

param environmentName = readEnvironmentVariable('AZURE_ENV_NAME', 'ica-prod')
param location        = readEnvironmentVariable('AZURE_LOCATION', 'eastus')
