import mongoose from "mongoose";
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
    if (Object.hasOwn(req.body || {}, "rol") && req.body.rol !== req.usuario.rol) {
      return res.status(403).json({ mensaje: "Solo un administrador puede cambiar tu rol" });
    }
    const camposPermitidos = [
      "nombre",
      "programa",
      "institucion",
      "temasCompartir",
      "temasAprender",
      "biografia",
      "disponibilidad"
    ];

    const actualizacion = {};
    for (const campo of camposPermitidos) {
      if (req.body[campo] !== undefined) {
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
    const usuarios = await Usuario.find().select("nombre correo rol activo programa createdAt").sort({ createdAt: -1 }).lean();
    res.json(usuarios);
  } catch (error) {
    console.error("Error al listar usuarios:", error);
    res.status(500).json({ mensaje: "No se pudo consultar la lista de usuarios" });
  }
}

export async function actualizarUsuarioAdmin(req, res) {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(400).json({ mensaje: "Identificador de usuario inválido" });
  }
  if (String(req.usuario._id) === req.params.id) {
    return res.status(403).json({ mensaje: "No puedes modificar tu propia cuenta desde administración" });
  }
  const body = req.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return res.status(400).json({ mensaje: "Envía un objeto JSON válido" });
  }
  const campos = Object.keys(body);
  if (!campos.length || campos.some(c => !["rol", "activo"].includes(c))) {
    return res.status(400).json({ mensaje: "Solo se pueden modificar el rol y el estado de la cuenta" });
  }
  if (Object.hasOwn(body, "rol") && !["estudiante", "tutor", "ambos"].includes(body.rol)) {
    return res.status(400).json({ mensaje: "Rol inválido. No se permite asignar administradores desde este panel" });
  }
  if (Object.hasOwn(body, "activo") && typeof body.activo !== "boolean") {
    return res.status(400).json({ mensaje: "El estado activo debe ser verdadero o falso" });
  }
  try {
    const usuario = await Usuario.findOneAndUpdate(
      { _id: req.params.id, rol: { $ne: "admin" } },
      { $set: body },
      { new: true, runValidators: true }
    ).select("nombre correo rol activo programa createdAt").lean();
    if (!usuario) {
      if (await Usuario.exists({ _id: req.params.id })) {
        return res.status(403).json({ mensaje: "Las cuentas de administrador están protegidas" });
      }
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }
    return res.json(usuario);
  } catch (error) {
    if (error.name === "ValidationError") return res.status(400).json({ mensaje: error.message });
    console.error("Error al administrar usuario:", error);
    return res.status(500).json({ mensaje: "No se pudo actualizar el usuario" });
  }
}
