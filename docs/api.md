# Documentación de la API REST - EDU-KT Free

Este documento explica las rutas disponibles en el servidor (**Node.js + Express**) para que el cliente web se comunique con la base de datos y valide la sesión de los usuarios.

En las rutas que requieren haber iniciado sesión, el navegador envía el token generado por **Microsoft Entra ID** para demostrar que el usuario es válido.

---

## 1. Estado del servidor

### `GET /api/health`
- **Para qué sirve:** Confirma que el servidor está encendido y respondiendo correctamente.
- **Requiere iniciar sesión:** No.
- **Roles permitidos:** Cualquiera.
- **Qué responde:** Un mensaje indicando que la API de EDU-KT Free está en funcionamiento.

---

## 2. Autenticación, Perfil y Usuarios

### `GET /api/auth/config`
- **Para qué sirve:** Entrega al navegador los datos básicos necesarios para abrir la ventana de inicio de sesión con Microsoft Entra ID.
- **Requiere iniciar sesión:** No.
- **Roles permitidos:** Cualquiera.
- **Qué responde:** La configuración de conexión de Microsoft cargada desde las variables del servidor.

### `POST /api/auth/registro`
- **Para qué sirve:** Registra una cuenta nueva en la base de datos cuando una persona llena sus datos de participación en la página de registro y se autentica con Microsoft Entra ID.
- **Requiere iniciar sesión:** Sí (envía el token de Microsoft Entra ID al momento de registrarse).
- **Roles permitidos en el registro:** Estudiante, Tutor o ambos (no permite registrarse como Administrador).
- **Qué responde:**
  - Si la cuenta es nueva (`201 Created`): guarda al usuario en la base de datos con el nombre y rol elegidos y activa su sesión.
  - Si la cuenta de Microsoft ya estaba registrada (`409 Conflict`): avisa que ya existe para que ingrese desde la página de inicio de sesión.

### `GET /api/auth/perfil`
- **Para qué sirve:** Verifica que la cuenta que inició sesión con Microsoft sea válida y esté autorizada en la plataforma, y devuelve sus datos académicos, su rol y su saldo del banco de horas desde la base de datos.
- **Requiere iniciar sesión:** Sí.
- **Roles permitidos:** Estudiante, Tutor y Administrador.
- **Qué responde:**
  - Si la sesión es válida (`200 OK`): devuelve la información del perfil del usuario y su rol.
  - Si no ha iniciado sesión (`401 Unauthorized`): indica que debe autenticarse primero.
  - Si la cuenta no pertenece a la plataforma (`403 Forbidden`): deniega el acceso.

### `PUT /api/auth/perfil`
- **Para qué sirve:** Permite que el usuario actualice la información de su propio perfil académico (nombre, programa, institución, temas que comparte o desea aprender, biografía y disponibilidad).
- **Requiere iniciar sesión:** Sí.
- **Roles permitidos:** Estudiante, Tutor y Administrador (cada uno sobre su propio perfil).
- **Qué responde:**
  - Si los datos son válidos (`200 OK`): guarda los cambios en la base de datos y devuelve el perfil actualizado.
  - Si intenta asignarse el rol de administrador sin tener permisos (`403 Forbidden`): bloquea el cambio.

### `GET /api/auth/usuarios`
- **Para qué sirve:** Consulta el listado completo de usuarios registrados en la base de datos para tareas de administración.
- **Requiere iniciar sesión:** Sí.
- **Roles permitidos:** Únicamente Administrador.
- **Qué responde:**
  - Si el usuario es administrador (`200 OK`): devuelve la lista de usuarios registrados.
  - Si el usuario es estudiante o tutor (`403 Forbidden`): rechaza la consulta por falta de permisos.

---

## 3. Gestión de Tutorías (CRUD)

*(Sección reservada para documentar los endpoints de creación, consulta, listado, edición y eliminación de tutorías).*
