import { verificarIdentidadMicrosoft } from "../config/identidad.js";
import Usuario from "../models/Usuario.js";

export async function verificarAutenticacion(req, res, next) {
  let identidad;
  try {
    identidad = await verificarIdentidadMicrosoft(req.headers.authorization);
  } catch {
    return res.status(401).json({ mensaje: "Token inválido, expirado o fuera del directorio autorizado" });
  }
  try {
    const { entraId, correo, correoCanonico, payload } = identidad;
    let usuario = await Usuario.findOne({ entraId });
    if (!usuario) {
      // Compatibilidad con las cuentas iniciales todavía sin identificador de Entra.
      // No se permite tomar una cuenta previamente vinculada a otra identidad.
      const candidatas = await Usuario.find({ entraId: null, $or: [{ correo }, { correo: correoCanonico }] }).limit(2);
      if (candidatas.length === 1 && candidatas[0].activo) {
        usuario = await Usuario.findOneAndUpdate(
          { _id: candidatas[0]._id, entraId: null, activo: true },
          { $set: { entraId } }, { new: true, runValidators: true }
        );
      }
    }
    if (!usuario || !usuario.activo) {
      return res.status(403).json({ mensaje: "Acceso denegado. La cuenta no está autorizada o está desactivada" });
    }
    req.usuario = usuario;
    req.tokenPayload = payload;
    next();
  } catch (error) {
    console.error("Error al consultar identidad:", error);
    return res.status(500).json({ mensaje: "No se pudo verificar el usuario" });
  }
}
