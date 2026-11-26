# API REST — EDU-KT Free

Base local: `http://localhost:3000/api`. Las solicitudes con cuerpo usan JSON y `Content-Type: application/json`. Las rutas protegidas reciben `Authorization: Bearer <idToken>` de Microsoft Entra ID. El servidor obtiene el usuario y rol de MongoDB; no confía en el rol enviado por el cliente. Las respuestas de error contienen `mensaje`. Una eliminación exitosa (204) no contiene cuerpo.

## Rutas

| Método y ruta | Permiso | Éxito | Errores específicos (además de 401/403 en rutas protegidas y 500 ante fallos internos) |
|---|---|---|---|
| GET /health | Público | 200 | — |
| GET /auth/config | Público | 200 | — |
| POST /auth/registro | Identidad Microsoft del tenant, rol inicial estudiante/tutor/ambos | 201 | 400, 401, 409 |
| GET /auth/perfil | Cualquier cuenta activa | 200 | — |
| PUT /auth/perfil | Cuenta activa, solo su perfil | 200 | 400, 403 |
| GET /auth/usuarios | Admin | 200 | — |
| PATCH /auth/usuarios/:id | Admin, solo cuentas no administrativas | 200 | 400, 403, 404 |
| GET /tutorias | Cualquier cuenta activa | 200 | 400 |
| GET /tutorias/:id | Cualquier cuenta activa | 200 | 400, 404 |
| POST /tutorias | Tutor, ambos, admin | 201 | 400 |
| PUT /tutorias/:id | Tutor/ambos propietario o admin | 200 | 400, 404 |
| DELETE /tutorias/:id | Tutor/ambos propietario o admin | 204 | 400, 404, 409 |

## Autenticación y administración

- GET /auth/config entrega clientId, tenantId y authority; son parámetros públicos de la aplicación, no secretos.
- POST /auth/registro recibe nombre y rol. El correo e identificador se derivan del token verificado. No permite crear administradores ni sobrescribir cuentas ya registradas.
- GET /auth/perfil valida la sesión y devuelve los datos del usuario autenticado.
- PUT /auth/perfil acepta nombre, programa, institucion, temasCompartir, temasAprender, biografia y disponibilidad. No permite modificar el rol propio, correo, saldo o identidad.
- GET /auth/usuarios devuelve nombre, correo, rol, estado, programa, id y fecha de creación.
- PATCH /auth/usuarios/:id acepta rol (estudiante/tutor/ambos) y/o activo (booleano). No permite cambiar cuentas administrativas ni la cuenta propia del administrador.
- El cierre de sesión se ejecuta en el navegador: limpia sessionStorage y regresa al inicio. No existe un endpoint de cierre ni revocación remota.

Ejemplos de cuerpos:

```json
{"nombre":"Usuario de prueba","rol":"ambos"}
```

```json
{"rol":"tutor","activo":true}
```

## CRUD de tutorías

GET /tutorias admite filtros opcionales `?estado=disponible` y `?propias=true`. GET /tutorias/:id devuelve una tutoría específica. POST asigna el tutor al usuario autenticado; PUT actualiza solo los campos de la tutoría admitidos por el controlador (no cambia el propietario). DELETE devuelve 409 cuando existen solicitudes asociadas, para conservar la integridad de los registros; en ese caso puede cambiarse estado a cancelada.

Ejemplo de creación (POST /tutorias):

```json
{
  "titulo":"Estadística descriptiva",
  "area":"Ciencias básicas",
  "descripcion":"Repaso de medidas de tendencia central con ejercicios.",
  "horario":"Martes 14:00–16:00",
  "modalidad":"Virtual",
  "duracionHoras":2,
  "cuposDisponibles":5,
  "estado":"disponible"
}
```

Título (máx. 120), área (100), descripción (2000) y horario (200) son obligatorios. Modalidad: Virtual, Presencial o Híbrida. Duración: entero de 1 a 4 horas. Cupos: enteros no negativos. Estados: disponible, agendada, completada, cancelada. La interfaz envía todos los campos; el esquema tiene valores predeterminados para modalidad, duración, cupos y estado. El servidor devuelve la tutoría con su _id y tutor (nombre e identificador).

Ejemplo de edición (PUT /tutorias/:id): `{"cuposDisponibles":8}`.

## Solicitudes de tutorías

| Método y ruta | Permiso | Éxito | Errores específicos |
|---|---|---|---|
| GET /solicitudes | Cuenta activa, solo solicitudes propias enviadas o recibidas | 200 | 401, 403, 500 |
| POST /solicitudes | Estudiante o ambos | 201 | 400, 401, 403, 404, 409, 500 |
| PATCH /solicitudes/:id/estado | Tutor/ambos/admin destinatario de la solicitud | 200 | 400, 401, 403, 404, 409, 500 |

POST recibe `{"tutoria":"ID_DE_TUTORIA","temaReforzar":"Probabilidad","mensaje":"Quisiera practicar ejercicios de probabilidad."}`. El servidor deriva estudiante, tutor y horas; no permite una solicitud propia ni duplicada pendiente o aceptada. Tema: 1–120 caracteres; mensaje: 10–1000. La tutoría debe estar disponible, tener cupos y pertenecer a una cuenta activa habilitada como tutor.

PATCH recibe `{"estado":"aceptada"}`, `{"estado":"rechazada"}` o `{"estado":"completada"}`. Transiciones: pendiente → aceptada/rechazada; aceptada → completada. Al aceptar se descuenta un cupo mediante una transacción; al rechazar no cambia la capacidad. No se realiza transferencia de banco de horas. Las solicitudes anteriores se conservan sin recalcular sus cupos. Las transacciones requieren una instancia MongoDB compatible.

## Códigos HTTP

| Código | Significado |
|---|---|
| 200 | Consulta o actualización exitosa |
| 201 | Recurso creado |
| 204 | Eliminación exitosa sin contenido |
| 400 | Identificador o datos inválidos |
| 401 | Identidad ausente, inválida o expirada |
| 403 | Cuenta no autorizada/inactiva o permisos insuficientes |
| 404 | Recurso o ruta no encontrados |
| 409 | Cuenta duplicada o tutoría con solicitudes asociadas |
| 500 | Fallo interno |

## Alcance y seguridad

El flujo actual conserva el ID token de MSAL como credencial de la API para el proyecto académico. No es una arquitectura de autenticación de producción recomendada: migrar a access tokens propios de la API es una mejora pendiente. El enlace inicial de cuentas semilla por correo también debe revisarse antes de una publicación abierta. Las solicitudes sí tienen endpoints funcionales implementados; la mensajería y el intercambio automático de horas no.
