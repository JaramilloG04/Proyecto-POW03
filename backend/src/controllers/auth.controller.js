import { createRemoteJWKSet, jwtVerify } from "jose";
import { entraConfig } from "../config/entra.js";
import Usuario from "../models/Usuario.js";

const JWKS = createRemoteJWKSet(new URL(entraConfig.jwksUri));

export function obtenerConfigEntra(req, res) {
  res.json({
    clientId: entraConfig.clientId,
    tenantId: entraConfig.tenantId,
    authority: entraConfig.authority
  });
}

export async function registrarUsuarioConMicrosoft(req, res) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        mensaje: "Se requiere autenticación con Microsoft Entra ID para crear la cuenta"
      });
    }

    const token = authHeader.split(" ")[1];
    const { payload } = await jwtVerify(token, JWKS, {
      audience: entraConfig.clientId
    });

    const correo = (
      payload.email ||
      payload.preferred_username ||
      payload.upn ||
      ""
    ).toLowerCase();

    if (!correo) {
      return res.status(400).json({
        mensaje: "La cuenta de Microsoft no proporcionó un correo válido"
      });
    }

    const entraId = payload.oid || payload.sub;
    const prefijo = correo.split("@")[0].replace(/\.edukt$/i, "");
    const correoCanonico = `${prefijo}@edukt.edu.co`;
    const { nombre, rol } = req.body;

    const rolesPermitidosEnRegistro = ["estudiante", "tutor", "ambos"];
    if (!rol || !rolesPermitidosEnRegistro.includes(rol)) {
      return res.status(400).json({
        mensaje: "Debes seleccionar un rol válido (estudiante, tutor o ambos)"
      });
    }

    const nombreFinal = (nombre || payload.name || prefijo).trim();
    if (!nombreFinal) {
      return res.status(400).json({
        mensaje: "El nombre completo es obligatorio"
      });
    }

    let usuario = await Usuario.findOne({
      $or: [{ entraId }, { correo }, { correo: correoCanonico }]
    });

    if (usuario) {
      if (usuario.rol === "admin") {
        return res.status(409).json({
          mensaje: "Esta cuenta de administrador ya está registrada. Inicia sesión desde Ingresar."
        });
      }
      usuario.nombre = nombreFinal;
      usuario.rol = rol;
      usuario.entraId = entraId;
      await usuario.save();
      return res.status(200).json(usuario);
    }

    usuario = await Usuario.create({
      entraId,
      nombre: nombreFinal,
      correo: correoCanonico,
      rol
    });

    res.status(201).json(usuario);
  } catch (error) {
    res.status(400).json({
      mensaje: error.message || "No se pudo completar el registro con Microsoft Entra ID"
    });
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
