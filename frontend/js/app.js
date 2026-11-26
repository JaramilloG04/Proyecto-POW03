// ============================================================
// Utilidades
// ============================================================

// El almacenamiento del navegador puede estar bloqueado (modo privado, permisos).
// Estas funciones evitan que un error ahí detenga el resto de la página.
const storage = {
  get(area, key) {
    try {
      return window[area].getItem(key);
    } catch {
      return null;
    }
  },
  set(area, key, value) {
    try {
      window[area].setItem(key, value);
    } catch {
      // Sin almacenamiento disponible: la demostración sigue funcionando sin recordar datos.
    }
  },
};

function readJSON(area, key) {
  try {
    return JSON.parse(storage.get(area, key)) || null;
  } catch {
    return null;
  }
}

const THEME_KEY = 'edu-kt-free-theme';
const REGISTRATION_KEY = 'edu-kt-free-registro';

// ============================================================
// Tema claro / oscuro
// ============================================================

const root = document.documentElement;
const themeToggle = document.getElementById('themeToggle');

function setTheme(theme) {
  root.setAttribute('data-bs-theme', theme);

  if (themeToggle) {
    const themeIcon = themeToggle.querySelector('i');
    const label = theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
    themeIcon.className = theme === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-stars-fill';
    themeToggle.setAttribute('aria-label', label);
    themeToggle.title = label;
  }

  storage.set('localStorage', THEME_KEY, theme);
}

setTheme(storage.get('localStorage', THEME_KEY) || 'light');

themeToggle?.addEventListener('click', () => {
  const currentTheme = root.getAttribute('data-bs-theme');
  setTheme(currentTheme === 'dark' ? 'light' : 'dark');
});

// ============================================================
// Mensajes de estado
// - 4.1.3 El texto se anuncia en #statusMessage (role="status"), una región que siempre está
//   en la página; el toast solo es la versión visual y no mueve el foco.
// - 2.2.1 Tiempo ajustable: el toast no se cierra solo; se cierra con «Cerrar mensaje» o con Esc.
// ============================================================

const toastElement = document.getElementById('feedbackToast');
const feedbackToast = toastElement && window.bootstrap
  ? new bootstrap.Toast(toastElement, { autohide: false })
  : null;
const statusRegion = document.getElementById('statusMessage');

function notify(message) {
  const toastMessage = document.getElementById('toastMessage');

  if (toastMessage && feedbackToast) {
    toastMessage.textContent = message;
    feedbackToast.show();
  }

  if (statusRegion) {
    // Se vacía y se vuelve a llenar para que un mensaje repetido también se anuncie.
    statusRegion.textContent = '';
    setTimeout(() => {
      statusRegion.textContent = message;
    }, 100);
  }
}

window.notify = notify;

// 2.1 Esc cierra el mensaje. Se escucha en fase de captura para saber si había un modal
// abierto antes de que Bootstrap lo cierre: en ese caso Esc solo cierra el modal.
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' || !feedbackToast || document.querySelector('.modal.show')) {
    return;
  }
  if (feedbackToast.isShown()) {
    feedbackToast.hide();
  }
}, true);

// ============================================================
// 3.3 Asistencia para la entrada: validación accesible
// - 3.3.1 Identifica el campo con error (aria-invalid + mensaje asociado).
// - 3.3.3 El mensaje sugiere cómo corregirlo.
// - Un resumen con role="alert" anuncia los errores y el foco va al primer campo.
// ============================================================

function getLabelText(field) {
  const label = document.querySelector(`label[for="${field.id}"]`);

  if (!label) {
    return field.name || field.id;
  }

  const clone = label.cloneNode(true);
  clone.querySelectorAll('.required-hint').forEach((hint) => hint.remove());
  return clone.textContent.trim();
}

function getFieldError(field) {
  const label = getLabelText(field);
  const isCheckbox = field.type === 'checkbox';
  const value = isCheckbox ? '' : field.value.trim();

  if (field.required && (isCheckbox ? !field.checked : value === '')) {
    if (field.dataset.msgRequired) {
      return field.dataset.msgRequired;
    }
    if (field.tagName === 'SELECT') {
      return `Selecciona una opción en «${label}».`;
    }
    return `Completa el campo «${label}».`;
  }

  if (field.type === 'email' && value && field.validity.typeMismatch) {
    return 'El correo no tiene un formato válido. Escríbelo así: nombre@universidad.edu.co';
  }

  if (field.minLength > 0 && value && value.length < field.minLength) {
    const missing = field.minLength - value.length;
    const remaining = missing === 1 ? 'Te falta 1.' : `Te faltan ${missing}.`;
    return `Escribe al menos ${field.minLength} caracteres en «${label}». ${remaining}`;
  }

  return '';
}

function getErrorElement(field) {
  const errorId = `${field.id}-error`;
  let error = document.getElementById(errorId);

  if (!error) {
    error = document.createElement('div');
    error.id = errorId;
    error.className = 'invalid-feedback';
    // Dentro de un input-group el mensaje debe ir al final del grupo (requisito de Bootstrap).
    (field.closest('.input-group') || field.parentElement).append(error);

    const describedBy = field.getAttribute('aria-describedby');
    field.setAttribute('aria-describedby', describedBy ? `${describedBy} ${errorId}` : errorId);
  }

  return error;
}

function showFieldError(field, message) {
  const error = getErrorElement(field);
  error.replaceChildren();

  if (message) {
    const icon = document.createElement('i');
    icon.className = 'bi bi-exclamation-circle-fill me-1';
    icon.setAttribute('aria-hidden', 'true');
    error.append(icon, message);
  }
}

function validateField(field) {
  const message = getFieldError(field);

  field.classList.toggle('is-invalid', Boolean(message));
  if (message) {
    field.setAttribute('aria-invalid', 'true');
  } else {
    field.removeAttribute('aria-invalid');
  }
  showFieldError(field, message);

  return !message;
}

function getValidatableFields(form) {
  return [...form.elements].filter((element) => (
    element.matches('input, select, textarea') && element.id && !element.disabled && element.type !== 'hidden'
  ));
}

function hideSummary(form) {
  const summary = form.querySelector('.form-error-summary');

  if (summary) {
    summary.hidden = true;
    summary.textContent = '';
  }
}

function validateForm(form) {
  const invalidFields = getValidatableFields(form).filter((field) => !validateField(field));
  const summary = form.querySelector('.form-error-summary');

  if (invalidFields.length === 0) {
    hideSummary(form);
    return true;
  }

  if (summary) {
    const names = invalidFields.map((field) => `«${getLabelText(field)}»`);
    summary.textContent = invalidFields.length === 1
      ? `Revisa el campo ${names[0]} antes de continuar.`
      : `Revisa ${invalidFields.length} campos antes de continuar: ${names.join(', ')}.`;
    summary.hidden = false;
  }

  invalidFields[0].focus();
  return false;
}

function resetValidation(form) {
  getValidatableFields(form).forEach((field) => {
    field.classList.remove('is-invalid');
    field.removeAttribute('aria-invalid');
    document.getElementById(`${field.id}-error`)?.replaceChildren();
  });
  hideSummary(form);
}

// Cuando un campo ya tiene error, el mensaje se actualiza mientras la persona lo corrige.
// Solo cambia el mensaje: no se envía nada ni se cambia de página (3.2.2 Al introducir datos).
document.querySelectorAll('form').forEach((form) => {
  const recheck = (event) => {
    const field = event.target;

    if (!field.classList?.contains('is-invalid')) {
      return;
    }

    validateField(field);
    if (!form.querySelector('.is-invalid')) {
      hideSummary(form);
    }
  };

  form.addEventListener('input', recheck);
  form.addEventListener('change', recheck);
});

// ============================================================
// 3.3.8 Autenticación accesible: mostrar u ocultar la contraseña
// ============================================================

document.querySelectorAll('[data-password-toggle]').forEach((button) => {
  const input = document.getElementById(button.dataset.passwordToggle);

  if (!input) {
    return;
  }

  button.addEventListener('click', () => {
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    button.setAttribute('aria-pressed', String(show));
    button.querySelector('i').className = show ? 'bi bi-eye-slash' : 'bi bi-eye';
  });
});

// ============================================================
// Ingresar
// ============================================================

const loginForm = document.getElementById('loginForm');

loginForm?.addEventListener('submit', (event) => {
  event.preventDefault();

  if (!validateForm(loginForm)) {
    return;
  }

  notify('Inicio de sesión simulado. Te llevamos a tu panel…');
  setTimeout(() => {
    window.location.href = 'inicio.html';
  }, 1200);
});

document.getElementById('forgotPassword')?.addEventListener('click', () => {
  notify('La recuperación de contraseña llegará en una próxima fase. En esta demostración puedes usar cualquier contraseña.');
});

// ============================================================
// Crear cuenta
// 3.3.7 Entrada redundante: el nombre y el rol se guardan para no pedirlos otra vez en el perfil.
// ============================================================

const registerForm = document.getElementById('registerForm');

registerForm?.addEventListener('submit', (event) => {
  event.preventDefault();

  if (!validateForm(registerForm)) {
    return;
  }

  storage.set('sessionStorage', REGISTRATION_KEY, JSON.stringify({
    name: document.getElementById('nameRegister').value.trim(),
    email: document.getElementById('emailRegister').value.trim(),
    role: document.getElementById('roleRegister').value,
  }));

  notify('Cuenta de prueba creada. Ahora completa tu perfil académico.');
  setTimeout(() => {
    window.location.href = 'perfil.html';
  }, 1200);
});

// ============================================================
// Perfil
// ============================================================

const profileForm = document.getElementById('profileForm');

function getInitials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');
}

function updateProfileHeader() {
  const name = document.getElementById('fullName').value.trim();
  const role = document.getElementById('role');
  const program = document.getElementById('program').value.trim();
  const roleText = role.options[role.selectedIndex]?.text || '';

  document.getElementById('profileName').textContent = name;
  document.getElementById('profileAvatar').textContent = getInitials(name);
  document.getElementById('profileSummary').textContent = program ? `${roleText} · ${program}` : roleText;
}

function getDisplayValue(field) {
  if (field.tagName === 'SELECT') {
    return field.options[field.selectedIndex]?.text || '';
  }

  const value = field.value.trim();
  if (!value) {
    return '(vacío)';
  }
  return value.length > 80 ? `${value.slice(0, 80)}…` : value;
}

if (profileForm) {
  const fields = getValidatableFields(profileForm);
  const nameInput = document.getElementById('fullName');
  const roleSelect = document.getElementById('role');
  const registration = readJSON('sessionStorage', REGISTRATION_KEY);

  if (registration) {
    if (registration.name) {
      nameInput.value = registration.name;
    }
    if ([...roleSelect.options].some((option) => option.value === registration.role)) {
      roleSelect.value = registration.role;
    }
    updateProfileHeader();
    document.getElementById('prefillNotice').hidden = false;
  }

  const takeSnapshot = () => Object.fromEntries(fields.map((field) => [field.id, field.value]));
  let savedValues = takeSnapshot();

  const confirmModalElement = document.getElementById('confirmProfileModal');
  const confirmModal = confirmModalElement && window.bootstrap
    ? bootstrap.Modal.getOrCreateInstance(confirmModalElement)
    : null;

  profileForm.addEventListener("profile:synced", () => { savedValues = takeSnapshot(); });
  const saveProfile = () => profileForm.dispatchEvent(new Event("profile:save"));

  profileForm.addEventListener('submit', (event) => {
    event.preventDefault();

    if (!validateForm(profileForm)) {
      return;
    }

    const changedFields = fields.filter((field) => field.value !== savedValues[field.id]);

    if (changedFields.length === 0) {
      notify('No hay cambios por guardar.');
      return;
    }

    // 3.3.4 Prevención de errores: se muestra qué va a cambiar y se pide confirmación.
    if (!confirmModal) {
      saveProfile();
      return;
    }

    const changesList = document.getElementById('changesList');
    changesList.replaceChildren(...changedFields.map((field) => {
      const item = document.createElement('li');
      const label = document.createElement('strong');
      label.textContent = `${getLabelText(field)}: `;
      item.append(label, getDisplayValue(field));
      return item;
    }));
    confirmModal.show();
  });

  document.getElementById('confirmSave')?.addEventListener('click', () => {
    saveProfile();
  });

  // Al cerrar la confirmación, el foco vuelve al botón «Guardar cambios».
  confirmModalElement?.addEventListener('hidden.bs.modal', () => {
    document.getElementById('profileSubmit')?.focus();
  });
}

// ============================================================
// Solicitud de tutoría (modal)
// 3.2.4 Todos los botones «Solicitar tutoría» abren el mismo formulario.
// ============================================================

// Disponibilidad y mensajes
// ============================================================

const sampleSlots = ['Viernes · 3:00–5:00 p. m.', 'Sábado · 9:00–11:00 a. m.'];

document.getElementById('addSchedule')?.addEventListener('click', () => {
  const scheduleList = document.getElementById('scheduleList');
  const slot = sampleSlots.shift();

  if (!scheduleList) {
    return;
  }

  if (!slot) {
    notify('Ya agregaste todos los horarios de ejemplo de esta demostración.');
    return;
  }

  const item = document.createElement('li');
  item.className = 'schedule-slot';
  item.textContent = slot;
  scheduleList.appendChild(item);
  notify(`Se agregó el horario ${slot} a tu disponibilidad.`);
});

document.getElementById('viewMessages')?.addEventListener('click', () => {
  notify('La mensajería completa estará disponible en la siguiente fase del proyecto.');
});

// ============================================================
// 4.1.2 Nombre, función y valor: el menú lateral del panel indica la sección actual
// con aria-current="location" (además del estilo .active), al hacer clic o al cambiar el #ancla.
// ============================================================

const panelNav = document.getElementById('panelNav');

if (panelNav) {
  const sectionLinks = [...panelNav.querySelectorAll('a[href^="#"]')];

  const markCurrentSection = (hash) => {
    const target = sectionLinks.some((link) => link.hash === hash) ? hash : '#resumen';

    sectionLinks.forEach((link) => {
      const isCurrent = link.hash === target;
      link.classList.toggle('active', isCurrent);
      if (isCurrent) {
        link.setAttribute('aria-current', 'location');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  };

  sectionLinks.forEach((link) => link.addEventListener('click', () => markCurrentSection(link.hash)));
  window.addEventListener('hashchange', () => markCurrentSection(window.location.hash));
  markCurrentSection(window.location.hash);
}
