const TOKEN_STORAGE_KEY = "edu-kt-free-id-token";
const USER_STORAGE_KEY = "edu-kt-free-user";
const PAGINAS_PROTEGIDAS = ["inicio.html", "perfil.html", "admin.html"];
const CACHE_KEYS = [
  "edu-kt-free-cache-tutorias",
  "edu-kt-free-cache-solicitudes",
  "edu-kt-free-cache-admin"
];

const MAPA_ROLES = {
  admin: "Administrador",
  tutor: "Tutor",
  estudiante: "Estudiante",
  ambos: "Estudiante y tutor"
};

function obtenerNombreArchivoActual() {
  const ruta = window.location.pathname;
  const archivo = ruta.substring(ruta.lastIndexOf("/") + 1);
  return archivo || "index.html";
}

export function obtenerTokenSesion() {
  try {
    return sessionStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function obtenerUsuarioSesion() {
  try {
    const raw = sessionStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function formatearNombreCorto(nombre) {
  const partes = String(nombre || "").trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "Usuario";
  if (partes.length === 1) return partes[0];
  const segundo = partes[1].length <= 6 ? partes[1] : `${partes[1][0].toUpperCase()}.`;
  return `${partes[0]} ${segundo}`;
}

function limpiarCachesSesion() {
  try {
    for (const key of CACHE_KEYS) {
      sessionStorage.removeItem(key);
    }
  } catch {
    // Sin acceso a almacenamiento de sesión.
  }
}

function toggleAuthSkeleton(mostrar) {
  const authSkeleton = document.getElementById("authSkeleton");
  const authFormBody = document.getElementById("authFormBody");
  if (authSkeleton) authSkeleton.hidden = !mostrar;
  if (authFormBody) authFormBody.hidden = mostrar;
}

function sincronizarEstadoDomDeSesion() {
  const tieneSesion = Boolean(obtenerTokenSesion());
  document.documentElement.setAttribute("data-auth-state", tieneSesion ? "authenticated" : "guest");

  if (!tieneSesion) {
    document.documentElement.removeAttribute("data-user-role");
    if (PAGINAS_PROTEGIDAS.includes(obtenerNombreArchivoActual())) {
      window.location.replace("login.html");
    }
    return;
  }

  const usuarioCache = obtenerUsuarioSesion();
  if (usuarioCache) {
    if (usuarioCache.rol) {
      document.documentElement.setAttribute("data-user-role", usuarioCache.rol);
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        adaptarInterfazSegunRol(usuarioCache);
      }, { once: true });
    } else {
      adaptarInterfazSegunRol(usuarioCache);
    }
  }
}

sincronizarEstadoDomDeSesion();

let msalInstance = null;
let serverAuthConfig = null;

async function obtenerConfigServidor() {
  if (serverAuthConfig) {
    return serverAuthConfig;
  }
  const respuesta = await fetch("/api/auth/config");
  if (!respuesta.ok) {
    throw new Error("No se pudo obtener la configuración de autenticación del servidor");
  }
  serverAuthConfig = await respuesta.json();
  return serverAuthConfig;
}

async function obtenerInstanciaMsal() {
  if (msalInstance) {
    return msalInstance;
  }

  if (!window.msal) {
    throw new Error("No se pudo cargar la librería de autenticación de Microsoft (MSAL)");
  }

  const config = await obtenerConfigServidor();

  msalInstance = new window.msal.PublicClientApplication({
    auth: {
      clientId: config.clientId,
      authority: config.authority,
      redirectUri: window.location.origin + "/login.html"
    },
    cache: {
      cacheLocation: "sessionStorage",
      storeAuthStateInCookie: false
    }
  });

  if (typeof msalInstance.initialize === "function") {
    await msalInstance.initialize();
  }

  return msalInstance;
}

function guardarUsuarioEnStorage(datos, idToken = null) {
  if (!datos || typeof datos !== "object") {
    return;
  }
  try {
    if (idToken) {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, idToken);
    }
    sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(datos));
    sessionStorage.setItem(
      "edu-kt-free-registro",
      JSON.stringify({
        name: datos.nombre,
        email: datos.correo,
        role: datos.rol
      })
    );
  } catch {
    // Sin almacenamiento disponible: la sesión activa permanece en memoria de la pestaña.
  }
  document.documentElement.setAttribute("data-auth-state", "authenticated");
  if (datos.rol) {
    document.documentElement.setAttribute("data-user-role", datos.rol);
  }
  window.dispatchEvent(new CustomEvent("edukt:user-synced", { detail: datos }));
}

export async function sincronizarPerfilConBackend(idToken) {
  if (!idToken || typeof idToken !== "string") {
    throw new Error("Token de sesión inválido");
  }
  const respuesta = await fetch("/api/auth/perfil", {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`
    }
  });

  const datos = await respuesta.json();
  if (!respuesta.ok) {
    try {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      sessionStorage.removeItem(USER_STORAGE_KEY);
      limpiarCachesSesion();
    } catch {
      // Ignorar fallos de almacenamiento restringido.
    }
    document.documentElement.removeAttribute("data-user-role");
    document.documentElement.setAttribute("data-auth-state", "guest");
    throw new Error(datos.mensaje || "No autorizado para acceder a la plataforma");
  }

  guardarUsuarioEnStorage(datos, idToken);
  return datos;
}

export async function iniciarSesionConMicrosoft() {
  const msalApp = await obtenerInstanciaMsal();
  const resultado = await msalApp.loginPopup({
    scopes: ["openid", "profile", "email"],
    prompt: "select_account"
  });

  if (!resultado || !resultado.idToken) {
    throw new Error("No se recibió un token de identidad de Microsoft Entra ID");
  }

  return await sincronizarPerfilConBackend(resultado.idToken);
}

export async function registrarCuentaConMicrosoft({ nombre, rol }) {
  const msalApp = await obtenerInstanciaMsal();
  const resultado = await msalApp.loginPopup({
    scopes: ["openid", "profile", "email"],
    prompt: "select_account"
  });

  if (!resultado || !resultado.idToken) {
    throw new Error("No se recibió un token de identidad de Microsoft Entra ID");
  }

  const respuesta = await fetch("/api/auth/registro", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resultado.idToken}`
    },
    body: JSON.stringify({ nombre, rol })
  });

  const datos = await respuesta.json();
  if (!respuesta.ok) {
    throw new Error(datos.mensaje || "Error al crear la cuenta");
  }

  guardarUsuarioEnStorage(datos, resultado.idToken);
  return datos;
}

export function cerrarSesionMicrosoft() {
  try {
    limpiarCachesSesion();
    sessionStorage.clear();
  } catch {
    // Ignorar fallos de almacenamiento restringido.
  }
  document.documentElement.removeAttribute("data-user-role");
  document.documentElement.setAttribute("data-auth-state", "guest");
  window.location.replace("index.html");
}

function adaptarInterfazSegunRol(usuario) {
  if (!usuario || typeof usuario !== "object") {
    return;
  }

  document.documentElement.setAttribute("data-auth-state", "authenticated");
  if (usuario.rol) {
    document.documentElement.setAttribute("data-user-role", usuario.rol);
  }

  const esAdmin = usuario.rol === "admin";
  const paginaActual = obtenerNombreArchivoActual();
  document.querySelectorAll("[data-admin-only]").forEach((el) => {
    if (paginaActual === "admin.html" && !esAdmin) {
      return;
    }
    el.hidden = !esAdmin;
  });

  const nombreCompleto = typeof usuario.nombre === "string" && usuario.nombre.trim()
    ? usuario.nombre.trim()
    : "Usuario";
  const nombreCorto = formatearNombreCorto(nombreCompleto);
  const correo = typeof usuario.correo === "string" ? usuario.correo : "";
  const etiquetaRol = MAPA_ROLES[usuario.rol] || usuario.rol || "Usuario";

  const iniciales = nombreCompleto
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("") || "U";

  document.querySelectorAll("[data-user-short-name]").forEach((el) => {
    el.textContent = nombreCorto;
  });
  document.querySelectorAll("[data-user-fullname]").forEach((el) => {
    el.textContent = nombreCompleto;
  });
  document.querySelectorAll("[data-user-email]").forEach((el) => {
    el.textContent = correo;
  });
  document.querySelectorAll("[data-user-role-label], [data-user-role-badge]").forEach((el) => {
    el.textContent = etiquetaRol;
  });

  const sidebarSkeleton = document.getElementById("sidebarUserSkeleton");
  const sidebarContent = document.getElementById("sidebarUserContent");
  const sidebarScope = sidebarContent || document.querySelector(".side-menu");
  if (sidebarScope) {
    const sidebarNombre = sidebarScope.querySelector("[data-user-fullname], .fw-bold.mb-0");
    const sidebarRol = sidebarScope.querySelector("[data-user-role-label], small.muted-custom");
    const sidebarAvatar = sidebarScope.querySelector(".avatar");
    if (sidebarNombre) sidebarNombre.textContent = nombreCompleto;
    if (sidebarRol) sidebarRol.textContent = etiquetaRol;
    if (sidebarAvatar) sidebarAvatar.textContent = iniciales;
  }
  if (sidebarSkeleton) sidebarSkeleton.hidden = true;
  if (sidebarContent) sidebarContent.hidden = false;

  const profileName = document.getElementById("profileName");
  const profileAvatar = document.getElementById("profileAvatar");
  const profileSummary = document.getElementById("profileSummary");
  const fullNameInput = document.getElementById("fullName");
  const programInput = document.getElementById("program");
  const institutionInput = document.getElementById("institution");
  const roleSelect = document.getElementById("role");
  const topicsInput = document.getElementById("topics");
  const learningInput = document.getElementById("learning");
  const bioInput = document.getElementById("bio");

  if (profileName) profileName.textContent = nombreCompleto;
  if (profileAvatar) profileAvatar.textContent = iniciales;
  if (profileSummary) {
    profileSummary.textContent = usuario.programa ? `${etiquetaRol} · ${usuario.programa}` : etiquetaRol;
  }
  if (fullNameInput) fullNameInput.value = nombreCompleto;
  if (programInput) programInput.value = usuario.programa || "";
  if (institutionInput) institutionInput.value = usuario.institucion || "";
  if (roleSelect && usuario.rol) {
    if (usuario.rol === "admin" && ![...roleSelect.options].some((o) => o.value === "admin")) {
      roleSelect.add(new Option("Administrador", "admin"));
    }
    roleSelect.value = usuario.rol;
  }
  if (topicsInput) {
    topicsInput.value = Array.isArray(usuario.temasCompartir) ? usuario.temasCompartir.join(", ") : "";
  }
  if (learningInput) {
    learningInput.value = Array.isArray(usuario.temasAprender) ? usuario.temasAprender.join(", ") : "";
  }
  if (bioInput) bioInput.value = usuario.biografia || "";

  const profileForm = document.getElementById("profileForm");
  if (profileForm) {
    if (typeof window.updateProfileHeader === "function") {
      window.updateProfileHeader();
    }
    profileForm.dispatchEvent(new Event("profile:synced"));
  }
  const profileSkeleton = document.getElementById("profileSkeleton");
  const profileContent = document.getElementById("profileContent");
  if (profileSkeleton) profileSkeleton.hidden = true;
  if (profileContent) profileContent.hidden = false;

  if (usuario.rol === "estudiante") {
    const seccionDisponibilidad = document.getElementById("disponibilidad");
    const linkDisponibilidad = document.querySelector('#panelNav a[href="#disponibilidad"]');
    const btnAddSchedule = document.getElementById("addSchedule");
    if (btnAddSchedule) btnAddSchedule.hidden = true;
    if (seccionDisponibilidad) seccionDisponibilidad.hidden = true;
    if (linkDisponibilidad) linkDisponibilidad.hidden = true;
  }

  const primerNombre = nombreCompleto.split(/\s+/)[0] || "Usuario";
  const navProfileLabel = document.getElementById("navProfileLabel");
  if (navProfileLabel) {
    navProfileLabel.textContent = `${primerNombre} (${etiquetaRol})`;
  }
}

async function verificarAccesoPagina() {
  const paginaActual = obtenerNombreArchivoActual();
  const esProtegida = PAGINAS_PROTEGIDAS.includes(paginaActual);
  const token = obtenerTokenSesion();

  try {
    if (esProtegida) {
      if (!token) {
        window.location.replace("login.html");
        return;
      }

      const usuarioCache = obtenerUsuarioSesion();
      if (usuarioCache) {
        adaptarInterfazSegunRol(usuarioCache);
      }

      const usuarioVerificado = await sincronizarPerfilConBackend(token);
      adaptarInterfazSegunRol(usuarioVerificado);
      return;
    }

    if (token) {
      if (paginaActual === "login.html" || paginaActual === "registro.html") {
        toggleAuthSkeleton(true);
        window.location.replace("inicio.html");
        return;
      }

      const usuarioCache = obtenerUsuarioSesion();
      if (usuarioCache) {
        adaptarInterfazSegunRol(usuarioCache);
      }

      const usuarioVerificado = await sincronizarPerfilConBackend(token);
      adaptarInterfazSegunRol(usuarioVerificado);
    }
  } catch {
    if (esProtegida) {
      window.location.replace("login.html");
    }
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await verificarAccesoPagina();

  const btnMicrosoft = document.getElementById("btnLoginMicrosoft");
  if (btnMicrosoft) {
    btnMicrosoft.addEventListener("click", async () => {
      try {
        btnMicrosoft.disabled = true;
        toggleAuthSkeleton(true);
        const usuario = await iniciarSesionConMicrosoft();
        if (typeof window.notify === "function") {
          window.notify(`Sesión iniciada como ${usuario.nombre}. Redirigiendo a tu panel…`);
        }
        setTimeout(() => {
          window.location.href = "inicio.html";
        }, 150);
      } catch (error) {
        toggleAuthSkeleton(false);
        btnMicrosoft.disabled = false;
        if (typeof window.notify === "function") {
          window.notify(error.message || "No se pudo completar el inicio de sesión con Microsoft");
        }
      }
    });
  }

  const formRegistro = document.getElementById("entraRegisterForm");
  if (formRegistro) {
    formRegistro.addEventListener("submit", async (evento) => {
      evento.preventDefault();

      const inputNombre = document.getElementById("nameRegister");
      const selectRol = document.getElementById("roleRegister");
      const checkTerms = document.getElementById("terms");
      const btnRegister = document.getElementById("btnRegisterMicrosoft");
      const errorRegistro = document.getElementById("registroError");
      if (errorRegistro) {
        errorRegistro.hidden = true;
        errorRegistro.textContent = "";
      }

      if (!inputNombre?.value.trim() || !selectRol?.value || !checkTerms?.checked) {
        if (errorRegistro) {
          errorRegistro.textContent = "Completa tu nombre, selecciona cómo participarás y acepta los términos para continuar.";
          errorRegistro.hidden = false;
        }
        if (inputNombre && !inputNombre.value.trim()) inputNombre.focus();
        return;
      }

      try {
        if (btnRegister) btnRegister.disabled = true;
        toggleAuthSkeleton(true);
        const nuevoUsuario = await registrarCuentaConMicrosoft({
          nombre: inputNombre.value.trim(),
          rol: selectRol.value
        });
        if (typeof window.notify === "function") {
          window.notify(`Cuenta creada para ${nuevoUsuario.nombre}. Ahora completa tu perfil académico.`);
        }
        setTimeout(() => {
          window.location.href = "perfil.html";
        }, 150);
      } catch (error) {
        toggleAuthSkeleton(false);
        if (btnRegister) btnRegister.disabled = false;
        if (errorRegistro) {
          errorRegistro.textContent = error.message || "No se pudo crear la cuenta con Microsoft";
          errorRegistro.hidden = false;
        }
      }
    });
  }

  const btnConfirmSaveProfile = document.getElementById("confirmSave");
  const profileForm = document.getElementById("profileForm");
  if (btnConfirmSaveProfile && profileForm) {
    profileForm.addEventListener("profile:save", async () => {
      const token = obtenerTokenSesion();
      if (!token) return;

      const separarPorComas = (texto = "") =>
        texto
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);

      const payloadPerfil = {
        nombre: document.getElementById("fullName")?.value.trim(),
        programa: document.getElementById("program")?.value.trim(),
        institucion: document.getElementById("institution")?.value.trim(),
        temasCompartir: separarPorComas(document.getElementById("topics")?.value),
        temasAprender: separarPorComas(document.getElementById("learning")?.value),
        biografia: document.getElementById("bio")?.value.trim()
      };

      const errorPerfil = document.getElementById("profileApiError");
      const submit = document.getElementById("profileSubmit");
      if (errorPerfil) errorPerfil.hidden = true;
      btnConfirmSaveProfile.disabled = true;
      if (submit) submit.disabled = true;
      try {
        const respuesta = await fetch("/api/auth/perfil", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payloadPerfil)
        });

        const datosActualizados = await respuesta.json();
        if (!respuesta.ok) {
          throw new Error(datosActualizados.mensaje || "No se pudo guardar el perfil en la base de datos");
        }

        guardarUsuarioEnStorage(datosActualizados, token);
        adaptarInterfazSegunRol(datosActualizados);
        if (window.bootstrap) bootstrap.Modal.getOrCreateInstance(document.getElementById("confirmProfileModal")).hide();
        if (typeof window.notify === "function") {
          window.notify("Perfil académico actualizado y guardado en la base de datos.");
        }
      } catch (error) {
        if (errorPerfil) {
          errorPerfil.textContent = error.message || "Error al actualizar el perfil";
          errorPerfil.hidden = false;
        }
        if (window.bootstrap) bootstrap.Modal.getOrCreateInstance(document.getElementById("confirmProfileModal")).hide();
      } finally {
        btnConfirmSaveProfile.disabled = false;
        if (submit) submit.disabled = false;
      }
    });
  }
});

document.addEventListener("click", (evento) => {
  const logoutTrigger = evento.target.closest('[data-action="logout"], a[href="index.html"]');
  if (!logoutTrigger) {
    return;
  }
  if (logoutTrigger.matches('[data-action="logout"]') || logoutTrigger.textContent.trim() === "Cerrar sesión") {
    evento.preventDefault();
    cerrarSesionMicrosoft();
  }
});
