import { Router } from "express";
import Tutoria from "../models/Tutoria.js";
import { verificarAutenticacion } from "../middlewares/auth.middleware.js";
import { autorizarRoles, verificarPropietarioOAdmin } from "../middlewares/roles.middleware.js";
import { listarTutorias, consultarTutoria, crearTutoria, actualizarTutoria,
  eliminarTutoria, validarIdTutoria } from "../controllers/tutorias.controller.js";

const router = Router();
const puedeGestionar = autorizarRoles("tutor", "admin");
const esPropietarioOAdmin = verificarPropietarioOAdmin(async req => {
  const tutoria = await Tutoria.findById(req.params.id).select("tutor").lean();
  return tutoria?.tutor;
});

router.use(verificarAutenticacion);
router.get("/", listarTutorias);
router.get("/:id", validarIdTutoria, consultarTutoria);
router.post("/", puedeGestionar, crearTutoria);
router.put("/:id", validarIdTutoria, puedeGestionar, esPropietarioOAdmin, actualizarTutoria);
router.delete("/:id", validarIdTutoria, puedeGestionar, esPropietarioOAdmin, eliminarTutoria);

export default router;
