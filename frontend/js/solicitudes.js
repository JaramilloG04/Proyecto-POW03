import { obtenerTokenSesion, sincronizarPerfilConBackend } from "./auth.js";
const $ = id => document.getElementById(id);
const modal = $("solicitudModal"), form = $("requestForm"), enviar = $("sendRequest");
const estado = $("solicitudesEstado"), error = $("solicitudesError"), errorForm = $("requestError");
let usuario, tutoriaId, enviando = false, cargando = false, gestionando = false;
const estados = { pendiente: "Pendiente", aceptada: "Aceptada", rechazada: "Rechazada", completada: "Completada" };

function mostrarError(el, mensaje = "") { el.textContent = mensaje; el.hidden = !mensaje; }
function nodo(tag, texto, clase = "") {
  const el = document.createElement(tag); el.className = clase; el.textContent = texto; return el;
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
  if (recibida && ["tutor", "ambos", "admin"].includes(usuario.rol)) {
    const acciones = s.estado === "pendiente" ? [["Aceptar","aceptada"],["Rechazar","rechazada"]] :
      s.estado === "aceptada" ? [["Marcar completada","completada"]] : [];
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
  const enviadas = datos.filter(s => s.estudiante?._id === usuario._id);
  const recibidas = datos.filter(s => s.tutor?._id === usuario._id);
  $("solicitudesEnviadas").replaceChildren(...(enviadas.length ? enviadas.map(s => tarjeta(s, false)) : [nodo("li","No tienes solicitudes enviadas.","muted-custom")]));
  $("solicitudesRecibidas").replaceChildren(...(recibidas.length ? recibidas.map(s => tarjeta(s, true)) : [nodo("li","No tienes solicitudes recibidas.","muted-custom")]));
  $("resumenEnviadas").textContent = enviadas.length;
  $("resumenRecibidas").textContent = recibidas.length;
  $("resumenCompletadas").textContent = datos.filter(s => s.estado === "completada").length;
}
async function cargar(mensaje = "") {
  if (cargando) return;
  cargando = true; $("recargarSolicitudes").disabled = true;
  mostrarError(error); estado.textContent = "Cargando solicitudes…";
  try { const datos = await api(); render(datos); estado.textContent = mensaje || "Solicitudes actualizadas."; }
  catch (e) { estado.textContent = ""; mostrarError(error,e.message); }
  finally { cargando = false; $("recargarSolicitudes").disabled = false; }
}
async function cambiar(s, destino) {
  if (gestionando || !window.confirm("¿Cambiar la solicitud a " + estados[destino].toLowerCase() + "?")) return;
  gestionando = true;
  mostrarError(error);
  try {
    await api("/" + encodeURIComponent(s._id) + "/estado", { method: "PATCH", body: JSON.stringify({ estado: destino }) });
    await cargar("Solicitud actualizada.");
    document.dispatchEvent(new Event("solicitudes:actualizadas"));
    $("solicitudesTitulo").focus();
  } catch (e) { mostrarError(error,e.message); }
  finally { gestionando = false; }
}
modal.addEventListener("show.bs.modal", e => {
  tutoriaId = e.relatedTarget?.dataset.tutoriaId;
  if (!tutoriaId || !usuario || !["estudiante","ambos"].includes(usuario.rol)) { e.preventDefault(); return; }
  form.reset(); mostrarError(errorForm);
  $("solicitudModalLabel").textContent = "Solicitar: " + e.relatedTarget.dataset.titulo;
});
modal.addEventListener("hide.bs.modal", e => { if (enviando) e.preventDefault(); });
modal.addEventListener("hidden.bs.modal", () => { form.reset(); mostrarError(errorForm); tutoriaId = null; });
form.addEventListener("submit", async e => {
  e.preventDefault();
  if (enviando || !tutoriaId) return;
  mostrarError(errorForm);
  const temaReforzar = $("subjectRequest").value.trim(), mensaje = $("detailRequest").value.trim();
  if (!temaReforzar || mensaje.length < 10) { mostrarError(errorForm,"Completa el tema y escribe al menos 10 caracteres en el mensaje."); return; }
  enviando = true; enviar.disabled = true;
  try {
    await api("", { method: "POST", body: JSON.stringify({ tutoria: tutoriaId, temaReforzar, mensaje }) });
    enviando = false;
    bootstrap.Modal.getOrCreateInstance(modal).hide();
    await cargar("Solicitud enviada correctamente.");
    if (typeof window.notify === "function") window.notify("Solicitud enviada correctamente.");
  } catch (e) { mostrarError(errorForm,e.message); }
  finally { enviando = false; enviar.disabled = false; }
});
$("recargarSolicitudes").addEventListener("click", () => cargar());
async function iniciar() {
  try { usuario = await sincronizarPerfilConBackend(obtenerTokenSesion()); await cargar(); }
  catch (e) { estado.textContent = ""; mostrarError(error,e.message); }
}
iniciar();
