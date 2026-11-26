import { createRemoteJWKSet, jwtVerify } from "jose";
import { entraConfig } from "./entra.js";

const JWKS = createRemoteJWKSet(new URL(entraConfig.jwksUri));

export async function verificarIdentidadMicrosoft(header) {
  const token = /^Bearer\s+(\S+)$/i.exec(header || "")?.[1];
  if (!token || !entraConfig.tenantId || !entraConfig.clientId) throw new Error("Autenticación no disponible");
  const { payload } = await jwtVerify(token, JWKS, {
    audience: entraConfig.clientId,
    issuer: "https://login.microsoftonline.com/" + entraConfig.tenantId + "/v2.0",
    algorithms: ["RS256"],
    requiredClaims: ["exp", "iat", "sub", "tid", "oid"]
  });
  if (payload.tid !== entraConfig.tenantId || typeof payload.oid !== "string" || !payload.oid) {
    throw new Error("Identidad fuera del directorio autorizado");
  }
  const correo = String(payload.preferred_username || payload.upn || payload.email || "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+$/.test(correo)) throw new Error("Identidad sin correo válido");
  const prefijo = correo.split("@")[0].replace(/\.edukt$/i, "");
  return { payload, entraId: payload.oid, correo, correoCanonico: prefijo + "@edukt.edu.co", prefijo };
}
