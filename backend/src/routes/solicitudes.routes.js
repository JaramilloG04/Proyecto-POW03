import { Router } from "express";
import { verificarAutenticacion } from "../middlewares/auth.middleware.js";
import { autorizarRoles } from "../middlewares/roles.middleware.js";
import { listarSolicitudes, crearSolicitud, cambiarEstadoSolicitud } from "../controllers/solicitudes.controller.js";

const router = Router();
router.use(verificarAutenticacion);
router.get("/", listarSolicitudes);
router.post("/", autorizarRoles("estudiante"), crearSolicitud);
router.patch("/:id/estado", autorizarRoles("tutor", "admin"), cambiarEstadoSolicitud);
export default router;
