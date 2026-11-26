# Lista de características (FDD) — EDU-KT Free

Entidad principal: Tutoría. Las características se redactan como acción, resultado y objeto. La lista conserva los conjuntos A, B y C obligatorios, más el complemento D.

## Trazabilidad

En la columna de archivos, los nombres abreviados de controladores y rutas corresponden a backend/src/controllers y backend/src/routes; los JavaScript de interfaz corresponden a frontend/js. Todos los commits se pueden consultar en el historial real. **Implementado** significa que existe código; **probado** significa que el integrante reportó la prueba en su entorno. No equivale a una auditoría ni a una prueba automatizada.

| ID | Característica | Criterio de aceptación | Código y ruta | Rama / commits | Estado |
|---|---|---|---|---|---|
| A1 | Listar las tutorías | Consultar y mostrar los registros de MongoDB | GET /api/tutorias; tutorias.controller.js, tutorias.routes.js, tutorias.js, inicio.html | Jaramillo: f9e3149, 5af425f | Probado por integrante |
| A2 | Consultar el detalle de una tutoría | Mostrar los datos de una tutoría por su identificador a una cuenta autenticada | GET /api/tutorias/:id; tutorias.controller.js, tutorias.js, inicio.html | Jaramillo: f9e3149, 9f5b920 | Implementado; prueba nueva pendiente |
| A3 | Crear una tutoría | Guardar datos válidos con tutor propietario; 201 | POST /api/tutorias; tutorias.controller.js, tutorias.js | Jaramillo: f9e3149, 5af425f | Probado por integrante |
| A4 | Modificar los datos de una tutoría | Actualizar datos autorizados y persistir cambios; 200 | PUT /api/tutorias/:id; tutorias.controller.js, tutorias.js | Jaramillo: f9e3149, 5af425f | Probado por integrante |
| A5 | Eliminar una tutoría | Borrar recurso autorizado sin solicitudes; 204; impedir borrado con solicitudes (409) | DELETE /api/tutorias/:id; tutorias.controller.js, tutorias.js | Jaramillo: f9e3149, 5af425f | Probado por integrante |
| B1 | Registrar un usuario | Registrar identidad Microsoft nueva; impedir admin y duplicados | POST /api/auth/registro; auth.controller.js, auth.js, registro.html | Delgado: c9aa903; Jaramillo: 4ff375b | Implementado; prueba pendiente |
| B2 | Iniciar la sesión de un usuario | Validar identidad y cuenta activa, cargar panel | GET /api/auth/perfil; auth.middleware.js, config/identidad.js, auth.js, login.html | Delgado: c9aa903; Jaramillo: 4ff375b | Login original probado; repetir con validación nueva |
| B3 | Consultar el perfil del usuario autenticado | Obtener datos de su cuenta sin seleccionar otro usuario | GET /api/auth/perfil; auth.controller.js, auth.js, perfil.html | Delgado: c9aa903, 8a38cf6; Jaramillo: a3a8a4c | Implementado; prueba pendiente |
| B4 | Cerrar la sesión de un usuario | Limpiar sesión local y regresar al inicio | auth.js, inicio.html, perfil.html, admin.html | Delgado: c9aa903; Jaramillo: a3a8a4c | Implementado; prueba pendiente |
| C1 | Restringir la creación, modificación y eliminación de tutorías a los roles autorizados | Estudiante recibe 403; tutor/ambos/admin pueden crear; servidor verifica rol | tutorias.routes.js, roles.middleware.js | Delgado: c9aa903; Jaramillo: f9e3149, a3a8a4c | Implementado; matriz de pruebas pendiente |
| C2 | Restringir a cada usuario la gestión de sus propios recursos | Tutor/ambos no puede modificar ni eliminar tutorías ajenas; admin puede moderar | tutorias.routes.js, roles.middleware.js, tutorias.controller.js | Delgado: c9aa903; Jaramillo: f9e3149 | Implementado; matriz de pruebas pendiente |
| C3 | Adaptar las opciones de la interfaz según el rol del usuario | Mostrar controles de tutor solo al rol permitido y administración solo al admin verificado | auth.js, tutorias.js, inicio.html, perfil.html, admin.html, admin.js | Delgado: c9aa903; Jaramillo: 5af425f, a3a8a4c | Implementado; prueba pendiente |
| D1 | Consultar los usuarios de la comunidad | Admin obtiene lista real de cuentas | GET /api/auth/usuarios; auth.controller.js, admin.js | Jaramillo: a3a8a4c | Implementado; prueba pendiente |
| D2 | Modificar el rol de un usuario | Admin cambia rol no administrativo; cuenta protegida no editable | PATCH /api/auth/usuarios/:id; auth.controller.js, admin.js | Jaramillo: a3a8a4c | Implementado; prueba pendiente |
| D3 | Modificar el estado de una cuenta | Admin activa o desactiva cuentas no administrativas; cuenta inactiva pierde acceso | PATCH /api/auth/usuarios/:id; auth.controller.js, admin.js, auth.middleware.js | Jaramillo: a3a8a4c | Implementado; prueba pendiente |

## Proceso de desarrollo

1. Modelo general: entidades Usuario, Tutoría y Solicitud, descritas en modelo-general.md.
2. Lista y planificación: prioridad al CRUD A, autenticación B y autorización C; administración D como complemento.
3. Diseño y construcción: Express y Mongoose, cliente HTML/CSS/JavaScript, fetch y validaciones en ambas capas.
4. Verificación: pruebas de aceptación por característica en pruebas-funcionales.md.

La rama Delgado contiene la base de arquitectura y autenticación integrada en Jaramillo. El equipo decidió continuar con commits directos en Jaramillo. Las ramas temporales de A2 y B1 y sus PR #2 y #3 se cerraron sin fusionar mediante PR; el código se integró directamente y posteriormente se reescribieron los mensajes de los commits. No se atribuyen a esos PR revisiones ni aprobaciones que no ocurrieron. La estrategia de ramas por característica exigida en el enunciado queda como desviación documentada. Main aún no contiene esta integración final.

## Referencias a commits

- [Arquitectura de autenticación de Delgado](https://github.com/JaramilloG04/Proyecto-POW03/commit/c9aa9033af564f300e5515e119192ef09796de88)
- [CRUD backend](https://github.com/JaramilloG04/Proyecto-POW03/commit/f9e31494ad029c55e69bc4f3285c2daaf497cbec)
- [CRUD frontend](https://github.com/JaramilloG04/Proyecto-POW03/commit/5af425fd10cd9f7b097e10eeae5b30fef672ac4c)
- [Detalle](https://github.com/JaramilloG04/Proyecto-POW03/commit/9f5b920c258770754131d0d8f1fccab1250009db)
- [Registro](https://github.com/JaramilloG04/Proyecto-POW03/commit/4ff375b765167dca5a949d219fc68cdf1839141f)
- [Administración](https://github.com/JaramilloG04/Proyecto-POW03/commit/a3a8a4cac863bde56484b02e0b82fa05e4ab35e3)

Solicitudes, mensajería y banco de horas no se consideran funcionalidades completas: existen modelos o demostraciones, no el flujo persistente de extremo a extremo.
