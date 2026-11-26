import { obtenerTokenSesion, obtenerUsuarioSesion, sincronizarPerfilConBackend } from "./auth.js";

const CACHE_KEY = "edu-kt-free-cache-admin";

const $ = id => document.getElementById(id);
const estado = $("adminEstado"), errorBox = $("adminError"), contenido = $("adminContenido");
const skeleton = $("adminSkeleton");
const lista = $("usuariosLista");
const roles = { estudiante: "Estudiante", tutor: "Tutor", ambos: "Estudiante y tutor", admin: "Administrador" };
let usuarios = [], totalTutorias = 0, actual, ocupado = false;

function leerCacheAdmin() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.usuarios) || typeof parsed.totalTutorias !== "number") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function guardarCacheAdmin(usuariosLista, total) {
  if (!Array.isArray(usuariosLista) || typeof total !== "number") return;
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({
      usuarios: usuariosLista,
      totalTutorias: total
    }));
  } catch {
    // Sin almacenamiento disponible: la vista continúa sin caché.
  }
}

function elemento(tag, texto, clase = "") {
  const el = document.createElement(tag);
  if (clase) el.className = clase;
  if (texto !== undefined && texto !== "") el.textContent = texto;
  return el;
}

function error(mensaje = "") {
  if (!errorBox) return;
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
      if (skeleton) skeleton.hidden = true;
      if (contenido) contenido.hidden = true;
      if (lista) lista.replaceChildren();
      if (estado) {
        estado.hidden = false;
        estado.textContent = "Acceso restringido. Actualiza la página o vuelve a iniciar sesión.";
      }
    }
    throw new Error(datos.mensaje || "No se pudo completar la operación.");
  }
  return datos;
}

function render() {
  const totalUsuariosEl = $("totalUsuarios");
  const totalActivosEl = $("totalActivos");
  const totalTutoriasEl = $("totalTutorias");
  if (totalUsuariosEl) totalUsuariosEl.textContent = usuarios.length;
  if (totalActivosEl) totalActivosEl.textContent = usuarios.filter(u => u.activo).length;
  if (totalTutoriasEl) totalTutoriasEl.textContent = totalTutorias;

  if (!lista) return;
  lista.replaceChildren(...usuarios.map(u => {
    const tr = document.createElement("tr");
    const nombre = elemento("th", u.nombre, "fw-semibold");
    nombre.scope = "row";
    nombre.append(elemento("small", u.correo, "d-block fw-normal text-break"));
    const rol = document.createElement("td");
    const estadoCelda = elemento("td", u.activo ? "Activa" : "Desactivada");
    const acciones = document.createElement("td");
    if (u.rol === "admin" || (actual && u._id === actual._id)) {
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
  const usuariosEstadoEl = $("usuariosEstado");
  if (usuariosEstadoEl) usuariosEstadoEl.textContent = usuarios.length + " usuarios registrados.";
}

async function cargar() {
  if (ocupado) return;
  ocupado = true;
  const btnRecargar = $("recargarAdmin");
  if (btnRecargar) btnRecargar.disabled = true;
  error();

  const yaVisible = Boolean(contenido && !contenido.hidden);
  if (!yaVisible) {
    if (estado) {
      estado.hidden = true;
      estado.textContent = "";
    }
    if (skeleton) skeleton.hidden = false;
    if (contenido) contenido.hidden = true;
  } else {
    render();
  }

  try {
    const [datos, tutorias] = await Promise.all([api("/api/auth/usuarios"), api("/api/tutorias")]);
    usuarios = Array.isArray(datos) ? datos : [];
    totalTutorias = Array.isArray(tutorias) ? tutorias.length : 0;
    guardarCacheAdmin(usuarios, totalTutorias);

    if (skeleton) skeleton.hidden = true;
    if (contenido) contenido.hidden = false;
    if (estado) {
      estado.hidden = false;
      estado.textContent = "Información actualizada.";
    }
  } catch (e) {
    if (skeleton) skeleton.hidden = true;
    error(e.message);
  } finally {
    ocupado = false;
    if (btnRecargar) btnRecargar.disabled = false;
    if (contenido && !contenido.hidden) render();
  }
}

async function actualizar(u, cambios) {
  if (ocupado) return;
  const accion = "rol" in cambios ? "Cambiar el rol a " + roles[cambios.rol] : cambios.activo ? "Activar cuenta" : "Desactivar cuenta";
  if (!window.confirm(accion + " de " + u.nombre + "?")) return;
  ocupado = true;
  const btnRecargar = $("recargarAdmin");
  if (btnRecargar) btnRecargar.disabled = true;
  error();
  if (estado) {
    estado.hidden = false;
    estado.textContent = "Guardando cambios…";
  }
  render();
  try {
    const actualizado = await api("/api/auth/usuarios/" + encodeURIComponent(u._id), {
      method: "PATCH", body: JSON.stringify(cambios)
    });
    usuarios = usuarios.map(v => v._id === actualizado._id ? actualizado : v);
    guardarCacheAdmin(usuarios, totalTutorias);
    if (estado) {
      estado.hidden = false;
      estado.textContent = "Cuenta actualizada correctamente.";
    }
  } catch (e) {
    error(e.message);
  } finally {
    ocupado = false;
    if (btnRecargar) btnRecargar.disabled = false;
    if (contenido && !contenido.hidden) {
      render();
      $("usuariosTitulo")?.focus();
    }
  }
}

$("recargarAdmin")?.addEventListener("click", cargar);

async function iniciar() {
  const token = obtenerTokenSesion();
  if (!token) return;

  const usuarioCache = obtenerUsuarioSesion();
  const adminCache = leerCacheAdmin();
  const tieneCacheAdmin = Boolean(usuarioCache && usuarioCache.rol === "admin" && adminCache);

  if (tieneCacheAdmin) {
    actual = usuarioCache;
    usuarios = adminCache.usuarios;
    totalTutorias = adminCache.totalTutorias;
    render();
    if (skeleton) skeleton.hidden = true;
    if (contenido) contenido.hidden = false;
    if (estado) {
      estado.hidden = true;
      estado.textContent = "";
    }
  } else {
    if (estado) {
      estado.hidden = true;
      estado.textContent = "";
    }
    if (skeleton) skeleton.hidden = false;
    if (contenido) contenido.hidden = true;
  }

  try {
    actual = await sincronizarPerfilConBackend(token);
    if (actual.rol !== "admin") {
      if (skeleton) skeleton.hidden = true;
      if (contenido) contenido.hidden = true;
      if (estado) {
        estado.hidden = false;
        estado.textContent = "Acceso denegado (403).";
      }
      error("Solo los administradores pueden acceder a este panel.");
      return;
    }
    await cargar();
  } catch (e) {
    if (skeleton) skeleton.hidden = true;
    if (contenido) contenido.hidden = true;
    if (estado) {
      estado.hidden = false;
      estado.textContent = "No se pudo verificar el acceso.";
    }
    error(e.message);
  }
}

iniciar();
