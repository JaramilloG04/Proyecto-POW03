export function autorizarRoles(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({
        mensaje: "No autenticado. Debe iniciar sesión primero"
      });
    }

    const rolUsuario = req.usuario.rol;

    // El rol 'ambos' habilita permisos tanto de 'estudiante' como de 'tutor'
    const tienePermiso =
      rolesPermitidos.includes(rolUsuario) ||
      (rolUsuario === "ambos" &&
        (rolesPermitidos.includes("estudiante") || rolesPermitidos.includes("tutor")));

    if (!tienePermiso) {
      return res.status(403).json({
        mensaje: `Acceso denegado. Se requiere uno de los siguientes roles: ${rolesPermitidos.join(", ")}`
      });
    }

    next();
  };
}

export function verificarPropietarioOAdmin(obtenerIdPropietario) {
  return async (req, res, next) => {
    try {
      if (!req.usuario) {
        return res.status(401).json({
          mensaje: "No autenticado. Debe iniciar sesión primero"
        });
      }

      if (req.usuario.rol === "admin") {
        return next();
      }

      const idPropietario = await obtenerIdPropietario(req);
      if (!idPropietario) {
        return res.status(404).json({
          mensaje: "Recurso no encontrado"
        });
      }

      if (String(idPropietario) !== String(req.usuario._id)) {
        return res.status(403).json({
          mensaje: "Acceso denegado. Solo puedes modificar o eliminar tus propios recursos"
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        mensaje: error.message
      });
    }
  };
}
