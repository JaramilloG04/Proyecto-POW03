# Roles y Permisos - EDU-KT Free

En **EDU-KT Free** el acceso de los usuarios se gestiona a través de **Microsoft Entra ID**. Una vez la persona inicia sesión, la plataforma identifica su rol para mostrarle únicamente las opciones que le corresponden y proteger las acciones dentro del sistema.

## Roles en la plataforma

1. **Estudiante:**
   - Puede explorar las tutorías disponibles en la comunidad y consultar sus detalles.
   - La interfaz de solicitudes es una demostración pendiente de integración persistente.
   - Puede ver y actualizar la información de su propio perfil académico.

2. **Tutor:**
   - Además de consultar tutorías y gestionar su perfil, puede publicar tutorías. La disponibilidad del panel principal es una demostración.
   - Puede crear nuevas ofertas de tutoría, así como editar o eliminar únicamente las tutorías que él mismo haya publicado.

3. **Administrador:**
   - Puede supervisar cuentas no administrativas y todas las tutorías.
   - Puede gestionar los usuarios registrados y moderar (crear, editar o eliminar) cualquier tutoría publicada en la red.

4. **Estudiante y tutor (ambos):** combina las funciones de estudiante y tutor; solo puede modificar o eliminar sus propias tutorías.

El rol inicial se elige durante el registro. Los cambios posteriores de rol y activación de cuentas se realizan desde administración. Las cuentas administrativas están protegidas: no se pueden modificar ni crear mediante el panel.

## Qué puede hacer cada rol

| Operación | Visitante | Estudiante | Tutor | Ambos | Admin |
|---|---|---|---|---|---|
| Ver bienvenida, registrarse o iniciar sesión | Sí | Sí | Sí | Sí | Sí |
| Consultar su perfil y actualizar datos académicos | No | Sí | Sí | Sí | Sí |
| Listar y consultar tutorías | No | Sí | Sí | Sí | Sí |
| Crear tutorías | No | No | Sí | Sí | Sí |
| Editar o eliminar tutorías propias | No | No | Sí | Sí | Sí |
| Editar o eliminar tutorías ajenas | No | No | No | No | Sí |
| Consultar usuarios y entrar a administración | No | No | No | No | Sí |
| Cambiar rol o estado de cuentas no administrativas | No | No | No | No | Sí |
| Crear o editar cuentas administrativas desde la web | No | No | No | No | No |

La eliminación de tutorías con solicitudes asociadas se restringe para todos los roles. La disponibilidad, las solicitudes y la mensajería del cliente aún no tienen un flujo persistente completo.

## Cómo protege el sistema las vistas y las acciones

- **Cuando alguien no ha iniciado sesión:**
  La persona solo puede ver la página principal de presentación. Si intenta entrar directamente al panel de tutorías o a la página de perfil, el sistema no muestra esa información y la redirige a la pantalla de inicio de sesión. Tampoco se muestran enlaces internos del panel hasta que haya ingresado con su cuenta.

- **Cuando alguien intenta hacer algo que no corresponde a su rol:**
  El servidor verifica en cada acción quién es el usuario y qué rol tiene. Si un estudiante intenta realizar una acción de tutor o de administrador, o si un tutor intenta modificar la tutoría de otra persona, el servidor bloquea la operación y la interfaz adapta los botones para mostrar solo lo que cada rol tiene permitido usar.
