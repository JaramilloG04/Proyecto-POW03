# Plan y evidencia de pruebas funcionales

Entorno: ejecutar el backend local con MongoDB Atlas y cuentas del tenant Microsoft autorizadas. Usar registros de prueba; no ejecutar seed en la base compartida. Los resultados marcados como reportados corresponden a la comprobación manual comunicada por el integrante, no a pruebas independientes automatizadas. Los cambios posteriores de autenticación y administración requieren regresión.

| Caso | Pasos | Resultado esperado | Estado |
|---|---|---|---|
| A1 | Ingresar y abrir tutorías | Lista de MongoDB | Reportado correcto |
| A2 | Pulsar Ver detalles; cerrar con Esc | GET individual, datos y retorno de foco | Pendiente |
| A3 | Publicar Estadística con campos válidos | 201 y tarjeta nueva | Reportado correcto |
| A4 | Editar cupos y recargar | Persiste el cambio | Reportado correcto |
| A5 | Eliminar una tutoría propia de prueba sin solicitudes | 204 y no aparece al recargar | Reportado correcto |
| A5.2 | Intentar eliminar tutoría de Cálculo con solicitud existente | 409, sin borrar | Reportado correcto |
| A3.2 | Enviar título vacío, duración fuera de 1–4 o cupos negativos | Validación en cliente y 400 en API | Pendiente |
| B1 | Registrar cuenta Microsoft nueva del tenant | 201 y acceso al perfil | Pendiente |
| B1.2 | Repetir registro de la misma cuenta | 409 sin sobrescribir datos | Pendiente |
| B1.3 | Enviar rol admin al registro | 400 | Pendiente |
| B2 | Ingresar con cuenta activa autorizada | 200, panel | Reportado correcto antes del cambio de tenant; repetir |
| B2.2 | Solicitar /api/tutorias sin token o con token inválido | 401 | Pendiente |
| B2.3 | Ingresar con cuenta desactivada | 403 | Pendiente |
| B3 | Abrir perfil, editar un campo, recargar | Datos reales guardados | Pendiente |
| B4 | Cerrar sesión y volver a inicio.html | Sesión local vacía y redirección a login | Pendiente |
| C1 | Como estudiante, intentar POST/PUT/DELETE de tutoría desde API | 403 | Pendiente |
| C2 | Como tutor, intentar editar/borrar tutoría de otro tutor | 403 | Pendiente |
| C3 | Ingresar con estudiante, tutor, ambos y admin | Menús y controles según permisos | Pendiente |
| D1 | Ingresar como admin, buscar y filtrar usuarios | Lista y contadores reales | Pendiente |
| D1.2 | Como estudiante, abrir admin.html y llamar GET /api/auth/usuarios | Mensaje de acceso restringido; API 403 | Pendiente |
| D2 | Cambiar rol de cuenta de prueba y recargar sesión | Rol actualizado; permisos correspondientes | Pendiente |
| D3 | Desactivar cuenta de prueba y reactivarla | 403 al acceder mientras esté inactiva; acceso al reactivar | Pendiente |
| D3.2 | Intentar modificar cuenta admin | 403 | Pendiente |
| E1 | Estudiante solicita tutoría de otra cuenta activa | 201, pendiente; aparece en enviadas y recibidas | Pendiente |
| E1.2 | Repetir solicitud activa, solicitar sin cupos o tutoría propia | 409 o 403 según el caso | Pendiente |
| E2 | Usuario ajeno consulta su lista | No aparecen solicitudes de otros usuarios | Pendiente |
| E3 | Tutor destinatario acepta solicitud pendiente | 200, estado aceptada, cupos disminuyen en uno | Pendiente |
| E3.2 | Tutor rechaza solicitud pendiente | 200, cupos sin cambio | Pendiente |
| E3.3 | Tutor completa una solicitud aceptada | 200, completada | Pendiente |
| E3.4 | Usuario ajeno intenta cambiar estado | 403 | Pendiente |
| E3.5 | Intentar aceptar dos solicitudes cuando solo queda un cupo | Solo una aceptación, segunda 409, cupos 0 | Pendiente |
| E3.6 | Repetir aceptación o completar solicitud pendiente | 409, no cambia cupos | Pendiente |
| UX | Navegar con teclado, probar móvil y modo oscuro | Foco visible, errores legibles y controles operables | Pendiente en nuevas pantallas |

Registrar fecha, cuenta de prueba (sin contraseñas ni tokens), resultado observado y evidencia de pantalla en cada ejecución. No utilizar cuentas de compañeros para cambios sin autorización.
