import { createRemoteJWKSet, jwtVerify } from "jose";
import { entraConfig } from "../config/entra.js";
import Usuario from "../models/Usuario.js";

const JWKS = createRemoteJWKSet(new URL(entraConfig.jwksUri));

function obtenerCorreoCanonicodeDirectorio(correoToken) {
  const prefijo = correoToken.split("@")[0].replace(/\.edukt$/i, "");
  return `${prefijo}@edukt.edu.co`;
}

export async function verificarAutenticacion(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        mensaje: "No autenticado. Se requiere iniciar sesión con Microsoft Entra ID"
      });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        mensaje: "Token de autenticación no proporcionado"
      });
    }

    const { payload } = await jwtVerify(token, JWKS, {
      audience: entraConfig.clientId
    });

    const correo = (
      payload.email ||
      payload.preferred_username ||
      payload.upn ||
      ""
    ).toLowerCase();

    const correoCanonico = obtenerCorreoCanonicodeDirectorio(correo);
    const entraId = payload.oid || payload.sub;

    const usuario = await Usuario.findOne({
      $or: [{ entraId }, { correo }, { correo: correoCanonico }]
    });

    if (!usuario) {
      return res.status(403).json({
        mensaje: "Acceso denegado. Tu cuenta no está autorizada en la plataforma EDU-KT Free"
      });
    }

    if (!usuario.entraId && entraId) {
      usuario.entraId = entraId;
      await usuario.save();
    }

    if (!usuario.activo) {
      return res.status(403).json({
        mensaje: "La cuenta de usuario se encuentra desactivada"
      });
    }

    req.usuario = usuario;
    req.tokenPayload = payload;
    next();
  } catch (error) {
    return res.status(401).json({
      mensaje: "Token inválido o expirado",
      detalle: error.message
    });
  }
}
