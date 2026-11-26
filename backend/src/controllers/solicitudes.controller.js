import mongoose from "mongoose";
import Solicitud from "../models/Solicitud.js";
import Tutoria from "../models/Tutoria.js";
import Usuario from "../models/Usuario.js";

const rolesTutor = ["tutor", "ambos", "admin"];
const estadosActivos = ["pendiente", "aceptada"];
const fallo = (status, message) => Object.assign(new Error(message), { status });
const camposPublicos = "nombre";
function datosConsulta(query) {
  return query.populate("tutoria", "titulo horario modalidad estado")
    .populate("estudiante", camposPublicos).populate("tutor", camposPublicos).lean();
}
function responderError(res, e) {
  if (e.status) return res.status(e.status).json({ mensaje: e.message });
  if (["ValidationError", "CastError"].includes(e.name)) return res.status(400).json({ mensaje: e.message });
  if (e.code === 11000) return res.status(409).json({ mensaje: "Ya existe una solicitud activa" });
  console.error("Error en solicitudes:", e);
  return res.status(500).json({ mensaje: "No se pudo completar la operación de solicitudes" });
}

export async function listarSolicitudes(req, res) {
  try {
    const id = req.usuario._id;
    const filtro = { $or: [{ estudiante: id }, { tutor: id }] };
    return res.json(await datosConsulta(Solicitud.find(filtro).sort({ createdAt: -1 })));
  } catch (e) { return responderError(res, e); }
}

export async function crearSolicitud(req, res) {
  const { tutoria, temaReforzar, mensaje } = req.body || {};
  if (!mongoose.isObjectIdOrHexString(tutoria) ||
      typeof temaReforzar !== "string" || !temaReforzar.trim() || temaReforzar.trim().length > 120 ||
      typeof mensaje !== "string" || mensaje.trim().length < 10 || mensaje.trim().length > 1000) {
    return res.status(400).json({ mensaje: "Selecciona una tutoría válida, un tema de hasta 120 caracteres y un mensaje de 10 a 1000 caracteres" });
  }
  try {
    let id;
    await mongoose.connection.transaction(async session => {
      // Escribir en la tutoría serializa las solicitudes con su eliminación y con la aceptación.
      const t = await Tutoria.findOneAndUpdate({ _id: tutoria }, { $inc: { __v: 1 } }, { new: true, session });
      if (!t) throw fallo(404, "Tutoría no encontrada");
      if (String(t.tutor) === String(req.usuario._id)) throw fallo(403, "No puedes solicitar tu propia tutoría");
      if (t.estado !== "disponible" || t.cuposDisponibles < 1) throw fallo(409, "La tutoría no tiene cupos disponibles");
      if (!await Usuario.exists({ _id: t.tutor, activo: true, rol: { $in: rolesTutor } }).session(session)) {
        throw fallo(409, "El tutor no está disponible");
      }
      if (await Solicitud.exists({ tutoria: t._id, estudiante: req.usuario._id, estado: { $in: estadosActivos } }).session(session)) {
        throw fallo(409, "Ya tienes una solicitud pendiente o aceptada para esta tutoría");
      }
      const [s] = await Solicitud.create([{
        tutoria: t._id, estudiante: req.usuario._id, tutor: t.tutor,
        temaReforzar: temaReforzar.trim(), mensaje: mensaje.trim(),
        horasComprometidas: t.duracionHoras, estado: "pendiente"
      }], { session });
      id = s._id;
    });
    return res.status(201).json(await datosConsulta(Solicitud.findById(id)));
  } catch (e) { return responderError(res, e); }
}

export async function cambiarEstadoSolicitud(req, res) {
  if (!mongoose.isObjectIdOrHexString(req.params.id) || !["aceptada", "rechazada", "completada"].includes(req.body?.estado)) {
    return res.status(400).json({ mensaje: "Identificador o estado de solicitud inválido" });
  }
  const destino = req.body.estado;
  try {
    await mongoose.connection.transaction(async session => {
      const s = await Solicitud.findById(req.params.id).session(session);
      if (!s) throw fallo(404, "Solicitud no encontrada");
      if (String(s.tutor) !== String(req.usuario._id)) throw fallo(403, "Solo el tutor destinatario puede gestionar esta solicitud");
      const origen = destino === "completada" ? "aceptada" : "pendiente";
      if (s.estado !== origen) throw fallo(409, "La solicitud ya no permite ese cambio de estado");
      if (destino === "aceptada") {
        const t = await Tutoria.findOneAndUpdate(
          { _id: s.tutoria, tutor: req.usuario._id, estado: "disponible", cuposDisponibles: { $gte: 1 } },
          { $inc: { cuposDisponibles: -1 } }, { new: true, session }
        );
        if (!t) throw fallo(409, "La tutoría ya no está disponible o no tiene cupos");
      }
      s.estado = destino;
      await s.save({ session });
    });
    return res.json(await datosConsulta(Solicitud.findById(req.params.id)));
  } catch (e) { return responderError(res, e); }
}
