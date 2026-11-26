import { verificarIdentidadMicrosoft } from "../config/identidad.js";
import { entraConfig } from "../config/entra.js";
import Usuario from "../models/Usuario.js";


export function obtenerConfigEntra(req, res) {
  res.json({
    clientId: entraConfig.clientId,
    tenantId: entraConfig.tenantId,
    authority: entraConfig.authority
  });
}

export async function registrarUsuarioConMicrosoft(req, res) {
  let identidad;
  try {
    identidad = await verificarIdentidadMicrosoft(req.headers.authorization);
  } catch {
    return res.status(401).json({ mensaje: "Inicia sesión con una cuenta válida de Microsoft del directorio autorizado" });
  }
  try {
    const { nombre, rol } = req.body || {};
    if (typeof nombre !== "string" || !nombre.trim() || nombre.trim().length > 120) {
      return res.status(400).json({ mensaje: "Escribe un nombre válido de hasta 120 caracteres" });
    }
    if (!["estudiante", "tutor", "ambos"].includes(rol)) {
      return res.status(400).json({ mensaje: "Selecciona un rol válido: estudiante, tutor o ambos" });
    }
    const { entraId, correo, correoCanonico } = identidad;
    const existente = await Usuario.exists({ $or: [{ entraId }, { correo }, { correo: correoCanonico }] });
    if (existente) {
      return res.status(409).json({ mensaje: "Esta cuenta ya está registrada. Utiliza Ingresar." });
    }
    const usuario = await Usuario.create({ entraId, nombre: nombre.trim(), correo: correoCanonico, rol });
    return res.status(201).json(usuario);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ mensaje: "Esta cuenta ya está registrada" });
    if (error.name === "ValidationError") return res.status(400).json({ mensaje: error.message });
    console.error("Error en registro:", error);
    return res.status(500).json({ mensaje: "No se pudo crear la cuenta" });
  }
}

export function obtenerPerfilAutenticado(req, res) {
  res.json(req.usuario);
}

export async function actualizarPerfilAutenticado(req, res) {
  try {
    const camposPermitidos = [
      "nombre",
      "programa",
      "institucion",
      "rol",
      "temasCompartir",
      "temasAprender",
      "biografia",
      "disponibilidad"
    ];

    const actualizacion = {};
    for (const campo of camposPermitidos) {
      if (req.body[campo] !== undefined) {
        if (campo === "rol" && req.body.rol === "admin" && req.usuario.rol !== "admin") {
          return res.status(403).json({
            mensaje: "No tienes permisos para asignarte el rol de administrador"
          });
        }
        actualizacion[campo] = req.body[campo];
      }
    }

    const usuarioActualizado = await Usuario.findByIdAndUpdate(
      req.usuario._id,
      actualizacion,
      { new: true, runValidators: true }
    );

    res.json(usuarioActualizado);
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
}

export async function listarUsuariosAdmin(req, res) {
  try {
    const usuarios = await Usuario.find().sort({ createdAt: -1 });
    res.json(usuarios);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
}
