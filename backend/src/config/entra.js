export const entraConfig = {
  tenantId: process.env.ENTRA_TENANT_ID,
  clientId: process.env.ENTRA_CLIENT_ID,
  authority: "https://login.microsoftonline.com/common",
  jwksUri: "https://login.microsoftonline.com/common/discovery/v2.0/keys"
};
