import { obtenerTokenSesion, obtenerUsuarioSesion, sincronizarPerfilConBackend } from "./auth.js";

const CACHE_KEY = "edu-kt-free-cache-solicitudes";

const $ = id => document.getElementById(id);
const modal = $("solicitudModal"), form = $("requestForm"), enviar = $("sendRequest");
const estado = $("solicitudesEstado"), error = $("solicitudesError"), errorForm = $("requestError");
let usuario, tutoriaId, enviando = false, cargando = false, gestionando = false;
const estados = { pendiente: "Pendiente", aceptada: "Aceptada", rechazada: "Rechazada", completada: "Completada" };

function leerCacheSolicitudes() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function guardarCacheSolicitudes(datos) {
  if (!Array.isArray(datos)) return;
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(datos));
  } catch {
    // Sin almacenamiento disponible: la vista continúa sin caché.
  }
}

function mostrarError(el, mensaje = "") {
  if (!el) return;
  el.textContent = mensaje;
  el.hidden = !mensaje;
}

function nodo(tag, texto, clase = "") {
  const el = document.createElement(tag);
  if (clase) el.className = clase;
  if (texto !== undefined && texto !== "") el.textContent = texto;
  return el;
}

function crearKpiSkeleton() {
  const span = document.createElement("span");
  span.className = "sk-box sk-kpi";
  span.setAttribute("aria-hidden", "true");
  return span;
}

function crearTarjetaSkeletonSolicitud() {
  const item = document.createElement("li");
  item.className = "border rounded-3 p-3";
  item.setAttribute("data-skeleton", "");

  const titulo = document.createElement("span");
  titulo.className = "sk-box d-block w-50 mb-2";
  titulo.style.height = "1.1rem";
  titulo.setAttribute("aria-hidden", "true");

  const linea1 = document.createElement("span");
  linea1.className = "sk-box-subtle d-block w-75 mb-2";
  linea1.style.height = "0.875rem";
  linea1.setAttribute("aria-hidden", "true");

  const linea2 = document.createElement("span");
  linea2.className = "sk-box-subtle d-block w-100 mb-2";
  linea2.style.height = "0.95rem";
  linea2.setAttribute("aria-hidden", "true");

  const linea3 = document.createElement("span");
  linea3.className = "sk-box d-block w-25";
  linea3.style.height = "0.875rem";
  linea3.setAttribute("aria-hidden", "true");

  item.append(titulo, linea1, linea2, linea3);
  return item;
}

function renderSkeletonSolicitudes() {
  if (estado) {
    estado.hidden = true;
    estado.textContent = "";
  }
  for (const id of ["resumenEnviadas", "resumenRecibidas", "resumenCompletadas"]) {
    const el = $(id);
    if (el) el.replaceChildren(crearKpiSkeleton());
  }
  for (const id of ["solicitudesEnviadas", "solicitudesRecibidas"]) {
    const listaEl = $(id);
    if (listaEl) {
      listaEl.setAttribute("aria-busy", "true");
      listaEl.replaceChildren(
        crearTarjetaSkeletonSolicitud(),
        crearTarjetaSkeletonSolicitud()
      );
    }
  }
}

function tieneContenidoSolicitudes() {
  const env = $("solicitudesEnviadas");
  const rec = $("solicitudesRecibidas");
  return Boolean(
    env && rec &&
    (env.children.length > 0 || rec.children.length > 0) &&
    !env.querySelector("[data-skeleton]") &&
    !rec.querySelector("[data-skeleton]")
  );
}

async function api(ruta = "", opciones = {}) {
  const token = obtenerTokenSesion();
  if (!token) throw new Error("Debes iniciar sesión");
  const res = await fetch("/api/solicitudes" + ruta, {
    ...opciones, headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }
  });
  const datos = await res.json();
  if (!res.ok) throw new Error(datos.mensaje || "No se pudo completar la operación");
  return datos;
}

function tarjeta(s, recibida) {
  const item = nodo("li", "", "border rounded-3 p-3");
  item.append(nodo("h4", s.tutoria?.titulo || "Tutoría no disponible", "h6 fw-bold"),
    nodo("p", (recibida ? "Estudiante: " + (s.estudiante?.nombre || "No disponible") : "Tutor: " + (s.tutor?.nombre || "No disponible")), "small mb-1"),
    nodo("p", "Tema: " + s.temaReforzar, "mb-1"),
    nodo("p", s.mensaje, "text-break mb-2"),
    nodo("p", "Estado: " + (estados[s.estado] || s.estado) + " · " + s.horasComprometidas + " h", "fw-semibold small mb-2"));
  if (recibida && usuario && ["tutor", "ambos", "admin"].includes(usuario.rol)) {
    const acciones = s.estado === "pendiente" ? [["Aceptar", "aceptada"], ["Rechazar", "rechazada"]] :
      s.estado === "aceptada" ? [["Marcar completada", "completada"]] : [];
    const grupo = nodo("div", "", "d-flex gap-2 flex-wrap");
    for (const [texto, destino] of acciones) {
      const b = nodo("button", texto, "btn btn-outline-primary btn-sm");
      b.type = "button";
      b.setAttribute("aria-label", texto + ": " + (s.tutoria?.titulo || "tutoría") + " de " + (s.estudiante?.nombre || "estudiante"));
      b.addEventListener("click", () => cambiar(s, destino));
      grupo.append(b);
    }
    item.append(grupo);
  }
  return item;
}

function render(datos) {
  if (!usuario) return;
  const listaDatos = Array.isArray(datos) ? datos : [];
  const enviadas = listaDatos.filter(s => s.estudiante?._id === usuario._id);
  const recibidas = listaDatos.filter(s => s.tutor?._id === usuario._id);
  const envEl = $("solicitudesEnviadas");
  const recEl = $("solicitudesRecibidas");
  if (envEl) {
    envEl.replaceChildren(...(enviadas.length ? enviadas.map(s => tarjeta(s, false)) : [nodo("li", "No tienes solicitudes enviadas.", "muted-custom")]));
    envEl.setAttribute("aria-busy", "false");
  }
  if (recEl) {
    recEl.replaceChildren(...(recibidas.length ? recibidas.map(s => tarjeta(s, true)) : [nodo("li", "No tienes solicitudes recibidas.", "muted-custom")]));
    recEl.setAttribute("aria-busy", "false");
  }
  const rEnv = $("resumenEnviadas");
  const rRec = $("resumenRecibidas");
  const rCom = $("resumenCompletadas");
  if (rEnv) rEnv.textContent = enviadas.length;
  if (rRec) rRec.textContent = recibidas.length;
  if (rCom) rCom.textContent = listaDatos.filter(s => s.estado === "completada").length;
}

async function cargar(mensaje = "") {
  if (cargando) return;
  cargando = true;
  const btnRecargar = $("recargarSolicitudes");
  if (btnRecargar) btnRecargar.disabled = true;
  mostrarError(error);

  if (!tieneContenidoSolicitudes()) {
    renderSkeletonSolicitudes();
  }

  try {
    const datos = await api();
    const listaDatos = Array.isArray(datos) ? datos : [];
    guardarCacheSolicitudes(listaDatos);
    render(listaDatos);
    if (estado) {
      estado.hidden = false;
      estado.textContent = mensaje || "Solicitudes actualizadas.";
    }
  } catch (e) {
    for (const id of ["solicitudesEnviadas", "solicitudesRecibidas"]) {
      const el = $(id);
      if (el) {
        el.setAttribute("aria-busy", "false");
        if (!tieneContenidoSolicitudes()) el.replaceChildren();
      }
    }
    if (estado) {
      estado.hidden = true;
      estado.textContent = "";
    }
    mostrarError(error, e.message);
  } finally {
    cargando = false;
    if (btnRecargar) btnRecargar.disabled = false;
  }
}

async function cambiar(s, destino) {
  if (gestionando || !window.confirm("¿Cambiar la solicitud a " + estados[destino].toLowerCase() + "?")) return;
  gestionando = true;
  mostrarError(error);
  try {
    await api("/" + encodeURIComponent(s._id) + "/estado", { method: "PATCH", body: JSON.stringify({ estado: destino }) });
    await cargar("Solicitud actualizada.");
    document.dispatchEvent(new Event("solicitudes:actualizadas"));
    $("solicitudesTitulo")?.focus();
  } catch (e) { mostrarError(error, e.message); }
  finally { gestionando = false; }
}

modal?.addEventListener("show.bs.modal", e => {
  tutoriaId = e.relatedTarget?.dataset.tutoriaId;
  if (!tutoriaId || !usuario || !["estudiante", "ambos"].includes(usuario.rol)) { e.preventDefault(); return; }
  form?.reset();
  mostrarError(errorForm);
  const label = $("solicitudModalLabel");
  if (label) label.textContent = "Solicitar: " + e.relatedTarget.dataset.titulo;
});
modal?.addEventListener("hide.bs.modal", e => { if (enviando) e.preventDefault(); });
modal?.addEventListener("hidden.bs.modal", () => { form?.reset(); mostrarError(errorForm); tutoriaId = null; });
form?.addEventListener("submit", async e => {
  e.preventDefault();
  if (enviando || !tutoriaId) return;
  mostrarError(errorForm);
  const temaReforzar = $("subjectRequest").value.trim(), mensaje = $("detailRequest").value.trim();
  if (!temaReforzar || mensaje.length < 10) { mostrarError(errorForm, "Completa el tema y escribe al menos 10 caracteres en el mensaje."); return; }
  enviando = true;
  if (enviar) enviar.disabled = true;
  try {
    await api("", { method: "POST", body: JSON.stringify({ tutoria: tutoriaId, temaReforzar, mensaje }) });
    enviando = false;
    bootstrap.Modal.getOrCreateInstance(modal).hide();
    await cargar("Solicitud enviada correctamente.");
    if (typeof window.notify === "function") window.notify("Solicitud enviada correctamente.");
  } catch (e) { mostrarError(errorForm, e.message); }
  finally {
    enviando = false;
    if (enviar) enviar.disabled = false;
  }
});
$("recargarSolicitudes")?.addEventListener("click", () => cargar());

async function iniciar() {
  const token = obtenerTokenSesion();
  if (!token) return;

  const usuarioCache = obtenerUsuarioSesion();
  const solicitudesCache = leerCacheSolicitudes();
  const tieneCacheInicial = Boolean(usuarioCache && solicitudesCache);

  if (tieneCacheInicial) {
    usuario = usuarioCache;
    render(solicitudesCache);
    if (estado) {
      estado.hidden = false;
      estado.textContent = "Solicitudes actualizadas.";
    }
  } else {
    renderSkeletonSolicitudes();
  }

  try {
    usuario = await sincronizarPerfilConBackend(token);
    await cargar();
  } catch (e) {
    for (const id of ["solicitudesEnviadas", "solicitudesRecibidas"]) {
      const el = $(id);
      if (el) {
        el.setAttribute("aria-busy", "false");
        if (!tieneCacheInicial) el.replaceChildren();
      }
    }
    if (estado) {
      estado.hidden = true;
      estado.textContent = "";
    }
    mostrarError(error, e.message);
  }
}

iniciar();
