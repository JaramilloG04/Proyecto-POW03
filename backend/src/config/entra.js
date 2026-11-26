export const entraConfig = {
  tenantId: process.env.ENTRA_TENANT_ID,
  clientId: process.env.ENTRA_CLIENT_ID,
  authority: "https://login.microsoftonline.com/" + process.env.ENTRA_TENANT_ID,
  jwksUri: "https://login.microsoftonline.com/" + process.env.ENTRA_TENANT_ID + "/discovery/v2.0/keys"
};
