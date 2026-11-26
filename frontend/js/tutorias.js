import { obtenerTokenSesion, sincronizarPerfilConBackend } from "./auth.js";

const lista = document.getElementById("tutoriasList");
const estado = document.getElementById("tutoriasStatus");
const errorLista = document.getElementById("tutoriasError");
const formulario = document.getElementById("tutoriaEditor");
const errorForm = document.getElementById("tutoriaEditorError");
const crear = document.getElementById("newTutoria");
const guardar = document.getElementById("saveTutoria");
let usuario, idEdicion, origen;

async function api(ruta = "", opciones = {}) {
  const token = obtenerTokenSesion();
  if (!token) throw new Error("Debes iniciar sesión.");
  const respuesta = await fetch("/api/tutorias" + ruta, {
    ...opciones, headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }
  });
  if (respuesta.status === 204) return null;
  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error(datos.mensaje || "No se pudo completar la operación.");
  return datos;
}

function errorEn(elemento, mensaje = "") {
  elemento.textContent = mensaje;
  elemento.hidden = !mensaje;
}

function puedeGestionar(tutoria) {
  return usuario.rol === "admin" ||
    (["tutor", "ambos"].includes(usuario.rol) && tutoria.tutor?._id === usuario._id);
}

function nodo(tag, clase, texto) {
  const el = document.createElement(tag);
  el.className = clase;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

function boton(texto, clase, titulo, accion) {
  const el = nodo("button", clase, texto);
  el.type = "button";
  el.setAttribute("aria-label", texto + ": " + titulo);
  el.addEventListener("click", accion);
  return el;
}

function tarjeta(tutoria) {
  const li = nodo("li", "col-md-6");
  const article = nodo("article", "border rounded-4 p-3 h-100");
  const nombre = tutoria.tutor?.nombre || "Tutor no disponible";
  article.append(
    nodo("h3", "h6 fw-bold", tutoria.titulo),
    nodo("p", "small muted-custom", tutoria.area + " · " + nombre),
    nodo("p", "", tutoria.descripcion),
    nodo("p", "small", "Horario: " + tutoria.horario),
    nodo("p", "small", tutoria.modalidad + " · " + tutoria.duracionHoras + " h · " + tutoria.cuposDisponibles + " cupos"),
    nodo("p", "small fw-bold", "Estado: " + tutoria.estado)
  );
  const acciones = nodo("div", "d-flex flex-wrap gap-2");
  if (["estudiante", "ambos"].includes(usuario.rol) && tutoria.estado === "disponible" &&
      tutoria.cuposDisponibles > 0 && tutoria.tutor?._id !== usuario._id) {
    const solicitar = boton("Solicitar tutoría (demo)", "btn btn-outline-primary btn-sm", tutoria.titulo, () => {});
    solicitar.dataset.bsToggle = "modal";
    solicitar.dataset.bsTarget = "#solicitudModal";
    solicitar.dataset.tutor = nombre;
    acciones.append(solicitar);
  }
  if (puedeGestionar(tutoria)) {
    acciones.append(
      boton("Editar", "btn btn-outline-primary btn-sm", tutoria.titulo, async e => {
        const botonOrigen = e.currentTarget;
        try { abrirEditor(await api("/" + tutoria._id), botonOrigen); }
        catch (error) { errorEn(errorLista, error.message); }
      }),
      boton("Eliminar", "btn btn-outline-danger btn-sm", tutoria.titulo, async e => {
        const control = e.currentTarget;
        if (!window.confirm("¿Eliminar la tutoría «" + tutoria.titulo + "»? Esta acción no se puede deshacer.")) return;
        control.disabled = true;
        try {
          await api("/" + tutoria._id, { method: "DELETE" });
          await cargar("Tutoría eliminada.");
          document.getElementById("tutorias-titulo").focus();
        } catch (error) { errorEn(errorLista, error.message); control.disabled = false; }
      })
    );
  }
  article.append(acciones);
  li.append(article);
  return li;
}

async function cargar(mensaje = "") {
  errorEn(errorLista);
  estado.textContent = "Cargando tutorías…";
  try {
    const datos = await api();
    lista.replaceChildren(...datos.map(tarjeta));
    estado.textContent = (mensaje ? mensaje + " " : "") +
      (datos.length ? datos.length + " tutorías encontradas." : "No hay tutorías publicadas.");
  } catch (error) {
    estado.textContent = "";
    errorEn(errorLista, error.message);
  }
}

function abrirEditor(tutoria, control) {
  origen = control;
  idEdicion = tutoria?._id;
  formulario.reset();
  errorEn(errorForm);
  document.getElementById("tutoriaEditorTitle").textContent = idEdicion ? "Editar tutoría" : "Publicar tutoría";
  if (tutoria) {
    for (const campo of formulario.elements) {
      if (campo.name && tutoria[campo.name] !== undefined) campo.value = tutoria[campo.name];
    }
  }
  formulario.hidden = false;
  document.getElementById("tutoriaTitulo").focus();
}

function cerrarEditor() {
  formulario.hidden = true;
  formulario.reset();
  idEdicion = undefined;
  if (origen?.isConnected) origen.focus();
  else document.getElementById("tutorias-titulo").focus();
}

crear.addEventListener("click", () => abrirEditor(null, crear));
document.getElementById("cancelTutoria").addEventListener("click", cerrarEditor);
formulario.addEventListener("submit", async evento => {
  evento.preventDefault();
  errorEn(errorForm);
  const datos = Object.fromEntries(new FormData(formulario));
  for (const campo of ["titulo", "area", "descripcion", "horario"]) {
    datos[campo] = datos[campo].trim();
    if (!datos[campo]) { errorEn(errorForm, "Completa todos los campos de texto."); formulario.elements[campo].focus(); return; }
  }
  datos.duracionHoras = Number(datos.duracionHoras);
  datos.cuposDisponibles = Number(datos.cuposDisponibles);
  guardar.disabled = true;
  try {
    await api(idEdicion ? "/" + idEdicion : "", {
      method: idEdicion ? "PUT" : "POST", body: JSON.stringify(datos)
    });
    cerrarEditor();
    await cargar("Tutoría guardada.");
    document.getElementById("tutorias-titulo").focus();
  } catch (error) { errorEn(errorForm, error.message); }
  finally { guardar.disabled = false; }
});

async function iniciar() {
  try {
    usuario = await sincronizarPerfilConBackend(obtenerTokenSesion());
    crear.hidden = !["tutor", "ambos", "admin"].includes(usuario.rol);
    await cargar();
  } catch (error) {
    estado.textContent = "";
    errorEn(errorLista, error.message);
  }
}

iniciar();
