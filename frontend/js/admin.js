import { obtenerTokenSesion, sincronizarPerfilConBackend } from "./auth.js";

const $ = id => document.getElementById(id);
const estado = $("adminEstado"), errorBox = $("adminError"), contenido = $("adminContenido");
const lista = $("usuariosLista"), filtro = $("filtrarRol"), buscar = $("buscarUsuario");
const roles = { estudiante: "Estudiante", tutor: "Tutor", ambos: "Estudiante y tutor", admin: "Administrador" };
let usuarios = [], actual, ocupado = false;

function elemento(tag, texto, clase = "") {
  const el = document.createElement(tag);
  el.className = clase;
  el.textContent = texto;
  return el;
}

function error(mensaje = "") {
  errorBox.textContent = mensaje;
  errorBox.hidden = !mensaje;
}

async function api(ruta, opciones = {}) {
  const token = obtenerTokenSesion();
  if (!token) throw new Error("Debes iniciar sesión.");
  const res = await fetch(ruta, {
    ...opciones, headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }
  });
  const datos = await res.json();
  if (!res.ok) {
    if ([401, 403].includes(res.status)) {
      contenido.hidden = true;
      lista.replaceChildren();
      estado.textContent = "Acceso restringido. Actualiza la página o vuelve a iniciar sesión.";
    }
    throw new Error(datos.mensaje || "No se pudo completar la operación.");
  }
  return datos;
}

function render() {
  $("totalUsuarios").textContent = usuarios.length;
  $("totalActivos").textContent = usuarios.filter(u => u.activo).length;
  const q = buscar.value.trim().toLocaleLowerCase("es");
  const visibles = usuarios.filter(u => (!filtro.value || u.rol === filtro.value) &&
    (u.nombre + " " + u.correo).toLocaleLowerCase("es").includes(q));
  lista.replaceChildren(...visibles.map(u => {
    const tr = document.createElement("tr");
    const nombre = elemento("th", u.nombre, "fw-semibold");
    nombre.scope = "row";
    nombre.append(elemento("small", u.correo, "d-block fw-normal text-break"));
    const rol = document.createElement("td");
    const estadoCelda = elemento("td", u.activo ? "Activa" : "Desactivada");
    const acciones = document.createElement("td");
    if (u.rol === "admin" || u._id === actual._id) {
      rol.textContent = roles[u.rol] || u.rol;
      acciones.textContent = "Cuenta protegida";
    } else {
      const select = elemento("select", "", "form-select form-select-sm");
      select.setAttribute("aria-label", "Rol de " + u.nombre);
      for (const r of ["estudiante", "tutor", "ambos"]) select.add(new Option(roles[r], r));
      select.value = u.rol;
      select.disabled = ocupado;
      rol.append(select);
      const guardar = elemento("button", "Guardar rol", "btn btn-outline-primary btn-sm");
      guardar.type = "button";
      guardar.setAttribute("aria-label", "Guardar rol de " + u.nombre);
      guardar.disabled = true;
      select.addEventListener("change", () => { guardar.disabled = ocupado || select.value === u.rol; });
      guardar.addEventListener("click", () => actualizar(u, { rol: select.value }));
      const activar = elemento("button", u.activo ? "Desactivar" : "Activar", "btn btn-outline-secondary btn-sm");
      activar.type = "button";
      activar.setAttribute("aria-label", (u.activo ? "Desactivar " : "Activar ") + u.nombre);
      activar.disabled = ocupado;
      activar.addEventListener("click", () => actualizar(u, { activo: !u.activo }));
      const grupo = elemento("div", "", "d-flex flex-wrap gap-2");
      grupo.append(guardar, activar);
      acciones.append(grupo);
    }
    tr.append(nombre, rol, estadoCelda, acciones);
    return tr;
  }));
  $("usuariosEstado").textContent = visibles.length + " de " + usuarios.length + " usuarios.";
}

async function cargar() {
  if (ocupado) return;
  ocupado = true;
  $("recargarAdmin").disabled = true;
  error();
  estado.textContent = "Cargando información…";
  render();
  try {
    const [datos, tutorias] = await Promise.all([api("/api/auth/usuarios"), api("/api/tutorias")]);
    usuarios = datos;
    $("totalTutorias").textContent = tutorias.length;
    contenido.hidden = false;
    estado.textContent = "Información actualizada.";
  } catch (e) { error(e.message); }
  finally {
    ocupado = false;
    $("recargarAdmin").disabled = false;
    if (!contenido.hidden) render();
  }
}

async function actualizar(u, cambios) {
  if (ocupado) return;
  const accion = "rol" in cambios ? "Cambiar el rol a " + roles[cambios.rol] : cambios.activo ? "Activar cuenta" : "Desactivar cuenta";
  if (!window.confirm(accion + " de " + u.nombre + "?")) return;
  ocupado = true;
  $("recargarAdmin").disabled = true;
  error();
  estado.textContent = "Guardando cambios…";
  render();
  try {
    const actualizado = await api("/api/auth/usuarios/" + encodeURIComponent(u._id), {
      method: "PATCH", body: JSON.stringify(cambios)
    });
    usuarios = usuarios.map(v => v._id === actualizado._id ? actualizado : v);
    estado.textContent = "Cuenta actualizada correctamente.";
  } catch (e) { error(e.message); }
  finally {
    ocupado = false;
    $("recargarAdmin").disabled = false;
    if (!contenido.hidden) {
      render();
      $("usuariosTitulo").focus();
    }
  }
}

buscar.addEventListener("input", render);
filtro.addEventListener("change", render);
$("recargarAdmin").addEventListener("click", cargar);

async function iniciar() {
  try {
    const token = obtenerTokenSesion();
    if (!token) return;
    actual = await sincronizarPerfilConBackend(token);
    if (actual.rol !== "admin") {
      estado.textContent = "Acceso denegado (403).";
      error("Solo los administradores pueden acceder a este panel.");
      return;
    }
    await cargar();
  } catch (e) {
    estado.textContent = "No se pudo verificar el acceso.";
    error(e.message);
  }
}
iniciar();
