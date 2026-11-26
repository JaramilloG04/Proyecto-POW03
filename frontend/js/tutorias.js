import { obtenerTokenSesion, obtenerUsuarioSesion, sincronizarPerfilConBackend } from "./auth.js";

const CACHE_KEY = "edu-kt-free-cache-tutorias";

const lista = document.getElementById("tutoriasList");
const estado = document.getElementById("tutoriasStatus");
const errorLista = document.getElementById("tutoriasError");
const formulario = document.getElementById("tutoriaEditor");
const editorModalEl = document.getElementById("tutoriaEditorModal");
const editorSkeleton = document.getElementById("tutoriaEditorSkeleton");
const editorFields = document.getElementById("tutoriaEditorFields");
const errorForm = document.getElementById("tutoriaEditorError");
const crear = document.getElementById("newTutoria");
const guardar = document.getElementById("saveTutoria");

const detalleModalEl = document.getElementById("tutoriaDetalleModal");
const detalleTitulo = document.getElementById("tutoriaDetalleTitulo");
const detalleEstado = document.getElementById("tutoriaDetalleEstado");
const detalleError = document.getElementById("tutoriaDetalleError");
const detalleDatos = document.getElementById("tutoriaDetalleDatos");
const detalleAcciones = document.getElementById("tutoriaDetalleAcciones");

let usuario, idEdicion, origen, detalleOrigen, solicitudDetalle = 0, solicitudEdicion = 0;

function obtenerInstanciaModal(elemento) {
  if (!elemento || !window.bootstrap) return null;
  return window.bootstrap.Modal.getOrCreateInstance(elemento);
}

function leerCacheTutorias() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function guardarCacheTutorias(datos) {
  if (!Array.isArray(datos)) return;
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(datos));
  } catch {
    // Sin almacenamiento disponible: la vista continúa sin caché.
  }
}

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
  if (!elemento) return;
  elemento.textContent = mensaje;
  elemento.hidden = !mensaje;
}

function puedeGestionar(tutoria) {
  if (!usuario || !tutoria) return false;
  return usuario.rol === "admin" ||
    (["tutor", "ambos"].includes(usuario.rol) && tutoria.tutor?._id === usuario._id);
}

function puedeSolicitar(tutoria) {
  if (!usuario || !tutoria) return false;
  return ["estudiante", "ambos"].includes(usuario.rol) &&
    tutoria.estado === "disponible" &&
    tutoria.cuposDisponibles > 0 &&
    Boolean(tutoria.tutor?._id) &&
    tutoria.tutor._id !== usuario._id;
}

function nodo(tag, clase, texto) {
  const el = document.createElement(tag);
  if (clase) el.className = clase;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

function bloqueSkeleton(clase, alto) {
  const el = nodo("span", clase);
  if (alto) el.style.height = alto;
  el.setAttribute("aria-hidden", "true");
  return el;
}

function boton(texto, clase, titulo, accion) {
  const el = nodo("button", clase, texto);
  el.type = "button";
  el.setAttribute("aria-label", texto + ": " + titulo);
  el.addEventListener("click", accion);
  return el;
}

function renderSkeletonTutorias() {
  if (!lista) return;
  if (estado) {
    estado.hidden = true;
    estado.textContent = "";
  }
  lista.setAttribute("aria-busy", "true");
  const tarjetas = Array.from({ length: 4 }, () => {
    const li = nodo("li", "col-md-6");
    li.setAttribute("data-skeleton", "");
    const article = nodo("article", "border rounded-4 p-3 h-100 bg-white");
    const acciones = nodo("div", "d-flex flex-wrap gap-2");
    acciones.append(
      bloqueSkeleton("sk-btn"),
      bloqueSkeleton("sk-btn")
    );
    article.append(
      bloqueSkeleton("sk-box d-block w-75 mb-2", "1.15rem"),
      bloqueSkeleton("sk-box-subtle d-block w-50 mb-3", "0.875rem"),
      bloqueSkeleton("sk-box-subtle d-block w-100 mb-2", "0.95rem"),
      bloqueSkeleton("sk-box-subtle d-block w-75 mb-3", "0.95rem"),
      bloqueSkeleton("sk-box-subtle d-block w-50 mb-2", "0.875rem"),
      bloqueSkeleton("sk-box-subtle d-block w-75 mb-2", "0.875rem"),
      bloqueSkeleton("sk-box d-block w-25 mb-3", "0.875rem"),
      acciones
    );
    li.append(article);
    return li;
  });
  lista.replaceChildren(...tarjetas);
}

function renderSkeletonDetalle() {
  if (!detalleDatos) return;
  if (detalleEstado) {
    detalleEstado.hidden = true;
    detalleEstado.textContent = "";
  }
  if (detalleAcciones) {
    detalleAcciones.replaceChildren();
  }
  detalleDatos.setAttribute("aria-busy", "true");
  const bloques = Array.from({ length: 6 }, (_, indice) => {
    const col = nodo("div", indice === 1 ? "col-12" : "col-sm-6");
    const dt = nodo("dt", "small muted-custom mb-1");
    dt.append(bloqueSkeleton("sk-box d-inline-block w-50", "0.75rem"));
    const dd = nodo("dd", "mb-0");
    dd.append(bloqueSkeleton("sk-box-subtle d-inline-block w-75", indice === 1 ? "2.5rem" : "1rem"));
    col.append(dt, dd);
    return col;
  });
  detalleDatos.replaceChildren(...bloques);
}

function renderAccionesTutoria(tutoria, desdeModalDetalle = false) {
  const nombre = tutoria.tutor?.nombre || "Tutor no disponible";
  const contenedor = [];

  if (!desdeModalDetalle) {
    contenedor.push(
      boton("Ver detalles", "btn btn-outline-primary btn-sm", tutoria.titulo, e => {
        e.stopPropagation();
        verDetalle(tutoria._id, e.currentTarget);
      })
    );
  }

  if (puedeSolicitar(tutoria)) {
    const solicitar = boton("Solicitar tutoría", "btn btn-primary btn-sm", tutoria.titulo, e => {
      e.stopPropagation();
      if (desdeModalDetalle) {
        obtenerInstanciaModal(detalleModalEl)?.hide();
      }
    });
    solicitar.dataset.bsToggle = "modal";
    solicitar.dataset.bsTarget = "#solicitudModal";
    solicitar.dataset.tutor = nombre;
    solicitar.dataset.tutoriaId = tutoria._id;
    solicitar.dataset.titulo = tutoria.titulo;
    contenedor.push(solicitar);
  }

  if (puedeGestionar(tutoria)) {
    contenedor.push(
      boton("Editar", "btn btn-outline-primary btn-sm", tutoria.titulo, e => {
        e.stopPropagation();
        const botonOrigen = desdeModalDetalle ? (detalleOrigen || e.currentTarget) : e.currentTarget;
        if (desdeModalDetalle) {
          obtenerInstanciaModal(detalleModalEl)?.hide();
        }
        iniciarEdicionTutoria(tutoria._id, botonOrigen, desdeModalDetalle ? tutoria : null);
      }),
      boton("Eliminar", "btn btn-outline-danger btn-sm", tutoria.titulo, async e => {
        e.stopPropagation();
        const control = e.currentTarget;
        if (!window.confirm("¿Eliminar la tutoría «" + tutoria.titulo + "»? Esta acción no se puede deshacer.")) return;
        control.disabled = true;
        try {
          await api("/" + tutoria._id, { method: "DELETE" });
          if (desdeModalDetalle) {
            obtenerInstanciaModal(detalleModalEl)?.hide();
          }
          await cargar("Tutoría eliminada.");
          if (typeof window.notify === "function") window.notify("Tutoría eliminada correctamente.");
          document.getElementById("tutorias-titulo")?.focus();
        } catch (error) {
          errorEn(desdeModalDetalle ? detalleError : errorLista, error.message);
          control.disabled = false;
        }
      })
    );
  }

  return contenedor;
}

async function verDetalle(id, control) {
  const numero = ++solicitudDetalle;
  detalleOrigen = control;
  if (detalleTitulo) detalleTitulo.textContent = "Detalle de tutoría";
  errorEn(detalleError);
  renderSkeletonDetalle();
  obtenerInstanciaModal(detalleModalEl)?.show();

  try {
    const t = await api("/" + encodeURIComponent(id));
    if (numero !== solicitudDetalle) return;
    if (detalleTitulo) detalleTitulo.textContent = t.titulo;
    const campos = [
      ["Área académica", t.area, "col-sm-6"],
      ["Tutor responsable", t.tutor?.nombre || "Tutor no disponible", "col-sm-6"],
      ["Descripción", t.descripcion, "col-12"],
      ["Horario", t.horario, "col-sm-6"],
      ["Modalidad", t.modalidad, "col-sm-6"],
      ["Duración (horas)", String(t.duracionHoras) + " h", "col-sm-4"],
      ["Cupos disponibles", String(t.cuposDisponibles), "col-sm-4"],
      ["Estado actual", t.estado, "col-sm-4"]
    ];
    if (detalleDatos) {
      detalleDatos.replaceChildren(...campos.map(([nombre, valor, colClase]) => {
        const bloque = nodo("div", colClase);
        const caja = nodo("div", "border rounded-3 p-2 h-100");
        caja.append(
          nodo("dt", "small muted-custom fw-semibold mb-1", nombre),
          nodo("dd", "mb-0 fw-medium text-break", String(valor ?? "Sin información"))
        );
        bloque.append(caja);
        return bloque;
      }));
      detalleDatos.setAttribute("aria-busy", "false");
    }
    if (detalleAcciones) {
      detalleAcciones.replaceChildren(...renderAccionesTutoria(t, true));
    }
    if (detalleEstado) {
      detalleEstado.hidden = false;
      detalleEstado.textContent = "Detalle cargado.";
    }
  } catch (error) {
    if (numero !== solicitudDetalle) return;
    if (detalleDatos) {
      detalleDatos.replaceChildren();
      detalleDatos.setAttribute("aria-busy", "false");
    }
    if (detalleEstado) {
      detalleEstado.hidden = true;
      detalleEstado.textContent = "";
    }
    errorEn(detalleError, error.message);
  }
}

function cerrarDetalle(devolverFoco = true) {
  solicitudDetalle++;
  obtenerInstanciaModal(detalleModalEl)?.hide();
  if (detalleDatos) {
    detalleDatos.replaceChildren();
    detalleDatos.setAttribute("aria-busy", "false");
  }
  if (detalleAcciones) {
    detalleAcciones.replaceChildren();
  }
  errorEn(detalleError);
  if (devolverFoco) {
    if (detalleOrigen?.isConnected) detalleOrigen.focus();
    else document.getElementById("tutorias-titulo")?.focus();
  }
}

detalleModalEl?.addEventListener("hidden.bs.modal", () => {
  solicitudDetalle++;
  if (detalleOrigen?.isConnected && document.activeElement === document.body) {
    detalleOrigen.focus();
  }
});

function tarjeta(tutoria) {
  const li = nodo("li", "col-md-6");
  const article = nodo("article", "border rounded-4 p-3 h-100 bg-white d-flex flex-column justify-content-between tutoria-card-interactive");
  const nombre = tutoria.tutor?.nombre || "Tutor no disponible";

  const cuerpo = nodo("div", "mb-3");
  cuerpo.append(
    nodo("h3", "h6 fw-bold mb-1", tutoria.titulo),
    nodo("p", "small muted-custom mb-2", tutoria.area + " · " + nombre),
    nodo("p", "small mb-2 text-break", tutoria.descripcion),
    nodo("p", "small mb-1", "Horario: " + tutoria.horario),
    nodo("p", "small mb-1", tutoria.modalidad + " · " + tutoria.duracionHoras + " h · " + tutoria.cuposDisponibles + " cupos"),
    nodo("p", "small fw-bold mb-0", "Estado: " + tutoria.estado)
  );

  const acciones = nodo("div", "d-flex flex-wrap gap-2 pt-2 border-top");
  acciones.append(...renderAccionesTutoria(tutoria, false));

  article.addEventListener("click", e => {
    if (e.target.closest("button, a")) return;
    const btnDetalle = article.querySelector("button");
    verDetalle(tutoria._id, btnDetalle || article);
  });

  article.append(cuerpo, acciones);
  li.append(article);
  return li;
}

function tieneListaRealPintada() {
  return Boolean(lista && lista.children.length > 0 && !lista.querySelector("[data-skeleton]"));
}

function renderTutorias(datos, mensaje = "") {
  if (!lista) return;
  lista.replaceChildren(...datos.map(tarjeta));
  lista.setAttribute("aria-busy", "false");
  if (estado) {
    estado.hidden = false;
    estado.textContent = (mensaje ? mensaje + " " : "") +
      (datos.length ? datos.length + " tutorías encontradas." : "No hay tutorías publicadas.");
  }
}

async function cargar(mensaje = "", usarCache = false) {
  errorEn(errorLista);

  if (usarCache && usuario) {
    const cache = leerCacheTutorias();
    if (cache) {
      renderTutorias(cache, mensaje);
      return;
    }
  }

  if (!tieneListaRealPintada()) {
    renderSkeletonTutorias();
  }

  try {
    const datos = await api();
    const tutorias = Array.isArray(datos) ? datos : [];
    guardarCacheTutorias(tutorias);
    renderTutorias(tutorias, mensaje);
  } catch (error) {
    if (lista) {
      lista.setAttribute("aria-busy", "false");
      if (!tieneListaRealPintada()) {
        lista.replaceChildren();
      }
    }
    if (estado) {
      estado.hidden = true;
      estado.textContent = "";
    }
    errorEn(errorLista, error.message);
  }
}

function rellenarFormularioEditor(tutoria) {
  if (!formulario) return;
  formulario.reset();
  if (tutoria) {
    for (const campo of formulario.elements) {
      if (campo.name && tutoria[campo.name] !== undefined) {
        campo.value = tutoria[campo.name];
      }
    }
  }
}

function abrirEditor(tutoria, control) {
  solicitudEdicion++;
  origen = control;
  idEdicion = tutoria?._id;
  errorEn(errorForm);
  if (editorSkeleton) editorSkeleton.hidden = true;
  if (editorFields) editorFields.hidden = false;
  if (guardar) guardar.disabled = false;

  const tituloEl = document.getElementById("tutoriaEditorTitle");
  if (tituloEl) tituloEl.textContent = idEdicion ? "Editar tutoría" : "Publicar tutoría";

  rellenarFormularioEditor(tutoria);
  obtenerInstanciaModal(editorModalEl)?.show();
}

async function iniciarEdicionTutoria(id, control, datosIniciales = null) {
  const numero = ++solicitudEdicion;
  origen = control;
  idEdicion = id;
  errorEn(errorForm);

  const tituloEl = document.getElementById("tutoriaEditorTitle");
  if (tituloEl) tituloEl.textContent = "Editar tutoría";

  if (datosIniciales) {
    if (editorSkeleton) editorSkeleton.hidden = true;
    if (editorFields) editorFields.hidden = false;
    rellenarFormularioEditor(datosIniciales);
    obtenerInstanciaModal(editorModalEl)?.show();
    return;
  }

  if (editorSkeleton) editorSkeleton.hidden = false;
  if (editorFields) editorFields.hidden = true;
  if (guardar) guardar.disabled = true;
  obtenerInstanciaModal(editorModalEl)?.show();

  try {
    const tutoria = await api("/" + encodeURIComponent(id));
    if (numero !== solicitudEdicion) return;
    rellenarFormularioEditor(tutoria);
    if (editorSkeleton) editorSkeleton.hidden = true;
    if (editorFields) editorFields.hidden = false;
    if (guardar) guardar.disabled = false;
    document.getElementById("tutoriaTitulo")?.focus();
  } catch (error) {
    if (numero !== solicitudEdicion) return;
    if (editorSkeleton) editorSkeleton.hidden = true;
    if (editorFields) editorFields.hidden = false;
    errorEn(errorForm, error.message);
  }
}

function cerrarEditor() {
  solicitudEdicion++;
  obtenerInstanciaModal(editorModalEl)?.hide();
  formulario?.reset();
  idEdicion = undefined;
  errorEn(errorForm);
  if (origen?.isConnected) origen.focus();
  else document.getElementById("tutorias-titulo")?.focus();
}

editorModalEl?.addEventListener("shown.bs.modal", () => {
  if (editorFields && !editorFields.hidden) {
    document.getElementById("tutoriaTitulo")?.focus();
  }
});

editorModalEl?.addEventListener("hidden.bs.modal", () => {
  solicitudEdicion++;
  formulario?.reset();
  idEdicion = undefined;
  errorEn(errorForm);
  if (editorSkeleton) editorSkeleton.hidden = true;
  if (editorFields) editorFields.hidden = false;
  if (guardar) guardar.disabled = false;
  if (origen?.isConnected && document.activeElement === document.body) {
    origen.focus();
  }
});

crear?.addEventListener("click", () => abrirEditor(null, crear));

formulario?.addEventListener("submit", async evento => {
  evento.preventDefault();
  errorEn(errorForm);
  const datos = Object.fromEntries(new FormData(formulario));
  for (const campo of ["titulo", "area", "descripcion", "horario"]) {
    datos[campo] = String(datos[campo] || "").trim();
    if (!datos[campo]) {
      errorEn(errorForm, "Completa todos los campos de texto.");
      formulario.elements[campo]?.focus();
      return;
    }
  }
  datos.duracionHoras = Number(datos.duracionHoras);
  datos.cuposDisponibles = Number(datos.cuposDisponibles);
  if (guardar) guardar.disabled = true;
  try {
    await api(idEdicion ? "/" + idEdicion : "", {
      method: idEdicion ? "PUT" : "POST", body: JSON.stringify(datos)
    });
    cerrarEditor();
    await cargar("Tutoría guardada.");
    if (typeof window.notify === "function") {
      window.notify("Tutoría guardada correctamente.");
    }
    document.getElementById("tutorias-titulo")?.focus();
  } catch (error) {
    errorEn(errorForm, error.message);
  } finally {
    if (guardar) guardar.disabled = false;
  }
});

async function iniciar() {
  const token = obtenerTokenSesion();
  if (!token) return;

  const usuarioCache = obtenerUsuarioSesion();
  const tutoriasCache = leerCacheTutorias();
  const tieneCacheInicial = Boolean(usuarioCache && tutoriasCache);

  if (tieneCacheInicial) {
    usuario = usuarioCache;
    if (crear) crear.hidden = !["tutor", "ambos", "admin"].includes(usuario.rol);
    renderTutorias(tutoriasCache);
  } else {
    renderSkeletonTutorias();
  }

  try {
    usuario = await sincronizarPerfilConBackend(token);
    if (crear) crear.hidden = !["tutor", "ambos", "admin"].includes(usuario.rol);
    await cargar("", false);
  } catch (error) {
    if (lista) {
      lista.setAttribute("aria-busy", "false");
      if (!tieneCacheInicial) lista.replaceChildren();
    }
    if (estado) {
      estado.hidden = true;
      estado.textContent = "";
    }
    errorEn(errorLista, error.message);
  }
}

document.addEventListener("solicitudes:actualizadas", () => { if (usuario) cargar(); });
iniciar();
