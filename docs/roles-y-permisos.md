# Roles y Permisos - EDU-KT Free

En **EDU-KT Free** el acceso de los usuarios se gestiona a través de **Microsoft Entra ID**. Una vez la persona inicia sesión, la plataforma identifica su rol para mostrarle únicamente las opciones que le corresponden y proteger las acciones dentro del sistema.

## Roles en la plataforma

1. **Estudiante:**
   - Puede explorar las tutorías disponibles en la comunidad y consultar sus detalles.
   - Puede enviar solicitudes de acompañamiento a los tutores.
   - Puede ver y actualizar la información de su propio perfil académico.

2. **Tutor:**
   - Además de consultar tutorías y gestionar su perfil, puede publicar su disponibilidad horaria.
   - Puede crear nuevas ofertas de tutoría, así como editar o eliminar únicamente las tutorías que él mismo haya publicado.

3. **Administrador:**
   - Tiene acceso completo para supervisar el funcionamiento de la plataforma.
   - Puede gestionar los usuarios registrados y moderar (crear, editar o eliminar) cualquier tutoría publicada en la red.

## Qué puede hacer cada rol

| Acción en la plataforma | Visitante (Sin sesión) | Estudiante | Tutor | Administrador |
| :--- | :--- | :--- | :--- | :--- |
| Ver la página de bienvenida e información general | Sí | Sí | Sí | Sí |
| Iniciar sesión con Microsoft Entra ID | Sí | Sí | Sí | Sí |
| Entrar al panel principal y ver su perfil | No (pide iniciar sesión) | Sí | Sí | Sí |
| Consultar las tutorías disponibles y su detalle | No (pide iniciar sesión) | Sí | Sí | Sí |
| Publicar disponibilidad horaria | No | No | Sí | Sí |
| Crear una nueva tutoría | No | No | Sí | Sí |
| Editar o eliminar una tutoría | No | No | Solo las propias | Sí (todas) |
| Consultar y administrar la lista de usuarios | No | No | No | Sí |

## Cómo protege el sistema las vistas y las acciones

- **Cuando alguien no ha iniciado sesión:**
  La persona solo puede ver la página principal de presentación. Si intenta entrar directamente al panel de tutorías o a la página de perfil, el sistema no muestra esa información y la redirige a la pantalla de inicio de sesión. Tampoco se muestran enlaces internos del panel hasta que haya ingresado con su cuenta.

- **Cuando alguien intenta hacer algo que no corresponde a su rol:**
  El servidor verifica en cada acción quién es el usuario y qué rol tiene. Si un estudiante intenta realizar una acción de tutor o de administrador, o si un tutor intenta modificar la tutoría de otra persona, el servidor bloquea la operación y la interfaz adapta los botones para mostrar solo lo que cada rol tiene permitido usar.
