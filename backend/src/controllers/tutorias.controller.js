import mongoose from "mongoose";
import Tutoria from "../models/Tutoria.js";
import Solicitud from "../models/Solicitud.js";

const campos = ["titulo", "area", "descripcion", "horario", "modalidad",
  "duracionHoras", "cuposDisponibles", "estado"];
const estados = ["disponible", "agendada", "completada", "cancelada"];

function datosTutoria(body) {
  return Object.fromEntries(campos.filter(campo => Object.hasOwn(body, campo))
    .map(campo => [campo, body[campo]]));
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
