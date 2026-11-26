import mongoose from "mongoose";
import Tutoria from "../models/Tutoria.js";
import Solicitud from "../models/Solicitud.js";

const campos = ["titulo", "area", "descripcion", "horario", "modalidad",
  "duracionHoras", "cuposDisponibles", "estado"];
const estados = ["disponible", "agendada", "completada", "cancelada"];

function datosTutoria(body) {
  const invalido = mensaje => { throw Object.assign(new Error(mensaje), { status: 400 }); };
  if (!body || typeof body !== "object" || Array.isArray(body)) invalido("Envía un objeto JSON válido");
  const datos = {};
  const limites = { titulo: 120, area: 100, descripcion: 2000, horario: 200 };
  for (const campo of Object.keys(body)) {
    if (!campos.includes(campo)) invalido("Campo no permitido: " + campo);
    const valor = body[campo];
    if (Object.hasOwn(limites, campo)) {
      if (typeof valor !== "string" || !valor.trim() || valor.trim().length > limites[campo])
        invalido("El campo " + campo + " debe contener entre 1 y " + limites[campo] + " caracteres");
      datos[campo] = valor.trim();
    } else if (campo === "duracionHoras") {
      if (!Number.isInteger(valor) || valor < 1 || valor > 4) invalido("La duración debe ser un entero entre 1 y 4 horas");
      datos[campo] = valor;
    } else if (campo === "cuposDisponibles") {
      if (!Number.isSafeInteger(valor) || valor < 0) invalido("Los cupos deben ser un entero no negativo");
      datos[campo] = valor;
    } else if (campo === "modalidad") {
      if (!["Virtual", "Presencial", "Híbrida"].includes(valor)) invalido("Modalidad inválida");
      datos[campo] = valor;
    } else if (campo === "estado") {
      if (!estados.includes(valor)) invalido("Estado inválido");
      datos[campo] = valor;
    }
  }
  return datos;
}

function responderError(res, error) {
  if (error.status) return res.status(error.status).json({ mensaje: error.message });
  if (["ValidationError", "CastError"].includes(error.name)) {
    return res.status(400).json({ mensaje: error.message });
  }
  console.error("Error en tutorías:", error);
  return res.status(500).json({ mensaje: "No se pudo completar la operación" });
}

export function validarIdTutoria(req, res, next) {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(400).json({ mensaje: "Identificador de tutoría inválido" });
  }
  next();
}

export async function listarTutorias(req, res) {
  try {
    const filtro = {};
    if (req.query.estado !== undefined) {
      if (!estados.includes(req.query.estado)) {
        return res.status(400).json({ mensaje: "Estado de tutoría inválido" });
      }
      filtro.estado = req.query.estado;
    }
    if (req.query.propias === "true") filtro.tutor = req.usuario._id;
    const tutorias = await Tutoria.find(filtro)
      .populate("tutor", "nombre").sort({ createdAt: -1 }).lean();
    res.json(tutorias);
  } catch (error) { responderError(res, error); }
}

export async function consultarTutoria(req, res) {
  try {
    const tutoria = await Tutoria.findById(req.params.id).populate("tutor", "nombre").lean();
    if (!tutoria) return res.status(404).json({ mensaje: "Tutoría no encontrada" });
    res.json(tutoria);
  } catch (error) { responderError(res, error); }
}

export async function crearTutoria(req, res) {
  try {
    const tutoria = await Tutoria.create({
      ...datosTutoria(req.body || {}), tutor: req.usuario._id
    });
    await tutoria.populate("tutor", "nombre");
    res.status(201).json(tutoria);
  } catch (error) { responderError(res, error); }
}

function filtroEdicion(req) {
  return req.usuario.rol === "admin"
    ? { _id: req.params.id }
    : { _id: req.params.id, tutor: req.usuario._id };
}

export async function actualizarTutoria(req, res) {
  try {
    const datos = datosTutoria(req.body || {});
    if (!Object.keys(datos).length) {
      return res.status(400).json({ mensaje: "No hay campos válidos para actualizar" });
    }
    const tutoria = await Tutoria.findOneAndUpdate(filtroEdicion(req), { $set: datos },
      { new: true, runValidators: true }).populate("tutor", "nombre");
    if (!tutoria) return res.status(404).json({ mensaje: "Tutoría no encontrada" });
    res.json(tutoria);
  } catch (error) { responderError(res, error); }
}

export async function eliminarTutoria(req, res) {
  try {
    // La creación de solicitudes escribe en la misma tutoría: una transacción
    // evita que una eliminación concurrente deje una solicitud huérfana.
    await mongoose.connection.transaction(async session => {
      const tutoria = await Tutoria.findOneAndDelete(filtroEdicion(req), { session });
      if (!tutoria) throw Object.assign(new Error("Tutoría no encontrada"), { status: 404 });
      if (await Solicitud.exists({ tutoria: req.params.id }).session(session)) {
        throw Object.assign(new Error("Esta tutoría tiene solicitudes asociadas. Puedes cambiar su estado a cancelada."), { status: 409 });
      }
    });
    res.status(204).end();
  } catch (error) { responderError(res, error); }
}
