const TOKEN_STORAGE_KEY = "edu-kt-free-id-token";
const USER_STORAGE_KEY = "edu-kt-free-user";
const PAGINAS_PROTEGIDAS = ["inicio.html", "perfil.html"];

function obtenerNombreArchivoActual() {
  const ruta = window.location.pathname;
  const archivo = ruta.substring(ruta.lastIndexOf("/") + 1);
  return archivo || "index.html";
}

export function obtenerTokenSesion() {
  return sessionStorage.getItem(TOKEN_STORAGE_KEY);
}

export function obtenerUsuarioSesion() {
  try {
    const raw = sessionStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function sincronizarEstadoDomDeSesion() {
  const tieneSesion = Boolean(obtenerTokenSesion());
  document.documentElement.setAttribute("data-auth-state", tieneSesion ? "authenticated" : "guest");

  if (!tieneSesion && PAGINAS_PROTEGIDAS.includes(obtenerNombreArchivoActual())) {
    document.documentElement.style.visibility = "hidden";
    window.location.replace("login.html");
  }
}

// Se ejecuta de forma síncrona antes de renderizar el DOM para evitar parpadeos de elementos restringidos
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
  document.documentElement.setAttribute("data-auth-state", "authenticated");
}

export async function sincronizarPerfilConBackend(idToken) {
  const respuesta = await fetch("/api/auth/perfil", {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`
    }
  });

  const datos = await respuesta.json();
  if (!respuesta.ok) {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    sessionStorage.removeItem(USER_STORAGE_KEY);
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
  sessionStorage.clear();
  document.documentElement.setAttribute("data-auth-state", "guest");
  window.location.replace("index.html");
}

function adaptarInterfazSegunRol(usuario) {
  const mapaRoles = {
    admin: "Administrador",
    tutor: "Tutor",
    estudiante: "Estudiante",
    ambos: "Estudiante y tutor"
  };

  const iniciales = (usuario.nombre || "U")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");

  const sidebarNombre = document.querySelector(".side-menu .fw-bold.mb-0");
  const sidebarRol = document.querySelector(".side-menu small.muted-custom");
  const sidebarAvatar = document.querySelector(".side-menu .avatar");

  if (sidebarNombre) sidebarNombre.textContent = usuario.nombre;
  if (sidebarRol) sidebarRol.textContent = mapaRoles[usuario.rol] || usuario.rol;
  if (sidebarAvatar) sidebarAvatar.textContent = iniciales;

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

  if (profileName) profileName.textContent = usuario.nombre;
  if (profileAvatar) profileAvatar.textContent = iniciales;
  if (profileSummary) {
    const textoRol = mapaRoles[usuario.rol] || usuario.rol;
    profileSummary.textContent = usuario.programa ? `${textoRol} · ${usuario.programa}` : textoRol;
  }
  if (fullNameInput) fullNameInput.value = usuario.nombre || "";
  if (programInput && usuario.programa) programInput.value = usuario.programa;
  if (institutionInput && usuario.institucion) institutionInput.value = usuario.institucion;
  if (roleSelect) {
    if (usuario.rol === "admin" && ![...roleSelect.options].some((o) => o.value === "admin")) {
      roleSelect.add(new Option("Administrador", "admin"));
    }
    roleSelect.value = usuario.rol;
  }
  if (topicsInput && Array.isArray(usuario.temasCompartir)) {
    topicsInput.value = usuario.temasCompartir.join(", ");
  }
  if (learningInput && Array.isArray(usuario.temasAprender)) {
    learningInput.value = usuario.temasAprender.join(", ");
  }
  if (bioInput && usuario.biografia) {
    bioInput.value = usuario.biografia;
  }

  // Restricción de interfaz por rol (C3): oculta controles exclusivos de tutor para estudiantes
  if (usuario.rol === "estudiante") {
    const seccionDisponibilidad = document.getElementById("disponibilidad");
    const linkDisponibilidad = document.querySelector('#panelNav a[href="#disponibilidad"]');
    const btnAddSchedule = document.getElementById("addSchedule");
    if (btnAddSchedule) btnAddSchedule.hidden = true;
    if (seccionDisponibilidad) seccionDisponibilidad.hidden = true;
    if (linkDisponibilidad) linkDisponibilidad.hidden = true;
  }

  const primerNombre = (usuario.nombre || "Usuario").split(" ")[0];

  document.querySelectorAll('a[href="registro.html"]').forEach((enlace) => {
    const li = enlace.closest("li");
    if (li) {
      li.hidden = true;
    } else {
      enlace.hidden = true;
    }
  });

  document.querySelectorAll('a[href="login.html"]').forEach((enlace) => {
    if (enlace.closest(".navbar-nav")) {
      enlace.href = "perfil.html";
      enlace.className = "btn btn-sm btn-outline-primary";
      enlace.replaceChildren();
      const icono = document.createElement("i");
      icono.className = "bi bi-person-circle me-1";
      icono.setAttribute("aria-hidden", "true");
      enlace.append(icono, `${primerNombre} (${mapaRoles[usuario.rol] || usuario.rol})`);

      const navList = enlace.closest(".navbar-nav");
      if (navList && !navList.querySelector('[data-action="logout"]')) {
        const liLogout = document.createElement("li");
        liLogout.className = "nav-item ms-lg-2";
        const btnLogout = document.createElement("button");
        btnLogout.type = "button";
        btnLogout.dataset.action = "logout";
        btnLogout.className = "btn btn-sm btn-primary";
        btnLogout.textContent = "Cerrar sesión";
        btnLogout.addEventListener("click", cerrarSesionMicrosoft);
        liLogout.append(btnLogout);

        const themeItem = document.getElementById("themeToggle")?.closest("li");
        if (themeItem) {
          navList.insertBefore(liLogout, themeItem);
        } else {
          navList.append(liLogout);
        }
      }
    } else {
      const li = enlace.closest("li");
      if (li) {
        li.hidden = true;
      } else {
        enlace.hidden = true;
      }
    }
  });
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
        document.documentElement.style.visibility = "visible";
      }

      const usuarioVerificado = await sincronizarPerfilConBackend(token);
      adaptarInterfazSegunRol(usuarioVerificado);
      document.documentElement.style.visibility = "visible";
      return;
    }

    if (token) {
      if (paginaActual === "login.html" || paginaActual === "registro.html") {
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
        const usuario = await iniciarSesionConMicrosoft();
        if (typeof window.notify === "function") {
          window.notify(`Sesión iniciada como ${usuario.nombre}. Redirigiendo a tu panel…`);
        }
        setTimeout(() => {
          window.location.href = "inicio.html";
        }, 700);
      } catch (error) {
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

      if (!inputNombre.value.trim() || !selectRol.value || !checkTerms.checked) {
        if (typeof window.notify === "function") {
          window.notify("Completa tu nombre, selecciona cómo participarás y acepta los términos para continuar.");
        }
        return;
      }

      try {
        if (btnRegister) btnRegister.disabled = true;
        const nuevoUsuario = await registrarCuentaConMicrosoft({
          nombre: inputNombre.value.trim(),
          rol: selectRol.value
        });
        if (typeof window.notify === "function") {
          window.notify(`Cuenta creada para ${nuevoUsuario.nombre}. Ahora completa tu perfil académico.`);
        }
        setTimeout(() => {
          window.location.href = "perfil.html";
        }, 900);
      } catch (error) {
        if (btnRegister) btnRegister.disabled = false;
        const errMsg = error.message || "No se pudo crear la cuenta con Microsoft";
        if (typeof window.notify === "function") {
          window.notify(errMsg);
        }
      }
    });
  }

  const btnConfirmSaveProfile = document.getElementById("confirmSave");
  if (btnConfirmSaveProfile) {
    btnConfirmSaveProfile.addEventListener("click", async () => {
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
        rol: document.getElementById("role")?.value,
        temasCompartir: separarPorComas(document.getElementById("topics")?.value),
        temasAprender: separarPorComas(document.getElementById("learning")?.value),
        biografia: document.getElementById("bio")?.value.trim()
      };

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
        if (typeof window.notify === "function") {
          window.notify("Perfil académico actualizado y guardado en la base de datos.");
        }
      } catch (error) {
        if (typeof window.notify === "function") {
          window.notify(error.message || "Error al actualizar el perfil");
        }
      }
    });
  }

  document.querySelectorAll('a[href="index.html"]').forEach((enlace) => {
    if (enlace.textContent.trim() === "Cerrar sesión") {
      enlace.addEventListener("click", (evento) => {
        evento.preventDefault();
        cerrarSesionMicrosoft();
      });
    }
  });
});
