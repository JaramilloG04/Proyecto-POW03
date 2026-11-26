import { Router } from "express";
import {
  obtenerConfigEntra,
  registrarUsuarioConMicrosoft,
  obtenerPerfilAutenticado,
  actualizarPerfilAutenticado,
  listarUsuariosAdmin,
  actualizarUsuarioAdmin
} from "../controllers/auth.controller.js";
import { verificarAutenticacion } from "../middlewares/auth.middleware.js";
import { autorizarRoles } from "../middlewares/roles.middleware.js";

const router = Router();

router.get("/config", obtenerConfigEntra);
router.post("/registro", registrarUsuarioConMicrosoft);
router.get("/perfil", verificarAutenticacion, obtenerPerfilAutenticado);
router.put("/perfil", verificarAutenticacion, actualizarPerfilAutenticado);
router.get("/usuarios", verificarAutenticacion, autorizarRoles("admin"), listarUsuariosAdmin);

router.patch("/usuarios/:id", verificarAutenticacion, autorizarRoles("admin"), actualizarUsuarioAdmin);

export default router;
