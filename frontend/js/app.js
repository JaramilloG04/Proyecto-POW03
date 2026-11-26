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
      // Sin almacenamiento disponible: la aplicación sigue funcionando sin recordar preferencias.
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

const root = document.documentElement;
const themeToggle = document.getElementById('themeToggle');
let themeInitialized = false;

function setTheme(theme) {
  const nextTheme = theme === 'dark' ? 'dark' : 'light';

  if (themeInitialized) {
    root.classList.add('theme-switching');
  }

  root.setAttribute('data-bs-theme', nextTheme);

  if (themeInitialized) {
    void root.offsetHeight;
  }

  if (themeToggle) {
    const themeIcon = themeToggle.querySelector('i');
    const label = nextTheme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
    if (themeIcon) {
      themeIcon.className = nextTheme === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-stars-fill';
    }
    themeToggle.setAttribute('aria-label', label);
    themeToggle.title = label;
  }

  storage.set('localStorage', THEME_KEY, nextTheme);

  if (themeInitialized) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        root.classList.remove('theme-switching');
      });
    });
  }

  themeInitialized = true;
}

setTheme(storage.get('localStorage', THEME_KEY) || 'light');

themeToggle?.addEventListener('click', () => {
  const currentTheme = root.getAttribute('data-bs-theme');
  setTheme(currentTheme === 'dark' ? 'light' : 'dark');
});

function initPageSkeletonLoader() {
  try {
    if (!document.querySelector('.page-skeleton-shell') || document.readyState === 'complete') {
      return;
    }

    let loadTimer = setTimeout(() => {
      loadTimer = null;
      if (document.readyState !== 'complete') {
        root.setAttribute('data-page-loading', 'true');
      }
    }, 160);

    window.addEventListener('load', () => {
      if (loadTimer !== null) {
        clearTimeout(loadTimer);
        loadTimer = null;
      }
      root.removeAttribute('data-page-loading');
    }, { once: true });
  } catch {
    root.removeAttribute('data-page-loading');
  }
}

initPageSkeletonLoader();

// 4.1.3 El texto se anuncia en #statusMessage (role="status") sin mover el foco;
// 2.2.1 El toast no se cierra solo: se cierra con «Cerrar mensaje» o Esc.
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
    statusRegion.textContent = '';
    setTimeout(() => {
      statusRegion.textContent = message;
    }, 100);
  }
}

window.notify = notify;

// 2.1 Esc cierra el toast en fase de captura solo si no había un modal abierto.
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' || !feedbackToast || document.querySelector('.modal.show')) {
    return;
  }
  if (feedbackToast.isShown()) {
    feedbackToast.hide();
  }
}, true);

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
  const fullNameEl = document.getElementById('fullName');
  const roleEl = document.getElementById('role');
  const programEl = document.getElementById('program');
  if (!fullNameEl || !roleEl || !programEl) {
    return;
  }

  const name = fullNameEl.value.trim();
  const program = programEl.value.trim();
  const roleText = roleEl.options[roleEl.selectedIndex]?.text || '';

  const profileNameEl = document.getElementById('profileName');
  const profileAvatarEl = document.getElementById('profileAvatar');
  const profileSummaryEl = document.getElementById('profileSummary');

  if (profileNameEl) profileNameEl.textContent = name;
  if (profileAvatarEl) profileAvatarEl.textContent = getInitials(name);
  if (profileSummaryEl) profileSummaryEl.textContent = program ? `${roleText} · ${program}` : roleText;
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
  window.updateProfileHeader = updateProfileHeader;

  const fields = getValidatableFields(profileForm);
  const nameInput = document.getElementById('fullName');
  const roleSelect = document.getElementById('role');
  const registration = readJSON('sessionStorage', REGISTRATION_KEY);

  if (registration) {
    if (registration.name && nameInput) {
      nameInput.value = registration.name;
    }
    if (roleSelect && [...roleSelect.options].some((option) => option.value === registration.role)) {
      roleSelect.value = registration.role;
    }
    updateProfileHeader();
  }

  const takeSnapshot = () => Object.fromEntries(fields.map((field) => [field.id, field.value]));
  let savedValues = takeSnapshot();

  const confirmModalElement = document.getElementById('confirmProfileModal');
  const confirmModal = confirmModalElement && window.bootstrap
    ? bootstrap.Modal.getOrCreateInstance(confirmModalElement)
    : null;

  profileForm.addEventListener('profile:synced', () => {
    updateProfileHeader();
    savedValues = takeSnapshot();
  });

  const saveProfile = () => profileForm.dispatchEvent(new Event('profile:save'));

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

  confirmModalElement?.addEventListener('hidden.bs.modal', () => {
    document.getElementById('profileSubmit')?.focus();
  });
}

const SCHEDULE_STORAGE_KEY = 'edu-kt-free-disponibilidad';
const VALID_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const VALID_MODALITIES = ['Virtual', 'Presencial', 'Híbrida'];
const DEFAULT_SCHEDULES = [
  { id: 'slot-1', day: 'Lunes', start: '14:00', end: '16:00', modality: 'Virtual' },
  { id: 'slot-2', day: 'Miércoles', start: '10:00', end: '12:00', modality: 'Presencial' },
];

function parseTimeToMinutes(timeStr) {
  if (typeof timeStr !== 'string' || !/^\d{2}:\d{2}$/.test(timeStr)) {
    return null;
  }
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }
  return (hours * 60) + minutes;
}

function formatMinutesTo12h(totalMinutes) {
  const hours24 = Math.floor(totalMinutes / 60);
  const minutes = String(totalMinutes % 60).padStart(2, '0');
  if (hours24 === 12 && minutes === '00') {
    return '12:00 m.';
  }
  const period = hours24 >= 12 ? 'p. m.' : 'a. m.';
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${minutes} ${period}`;
}

function formatScheduleLabel(slot) {
  if (typeof slot === 'string') {
    return slot.trim();
  }
  if (slot && typeof slot.rawLabel === 'string' && (!slot.start || !slot.end)) {
    return slot.rawLabel;
  }
  const startMin = parseTimeToMinutes(slot.start);
  const endMin = parseTimeToMinutes(slot.end);
  if (startMin === null || endMin === null) {
    return `${slot.day} · ${slot.start}–${slot.end}`;
  }
  const modalitySuffix = slot.modality ? ` · ${slot.modality}` : '';
  return `${slot.day} · ${formatMinutesTo12h(startMin)}–${formatMinutesTo12h(endMin)}${modalitySuffix}`;
}

function parseClockTokenTo24h(token) {
  if (!token || typeof token !== 'string') return null;
  const clean = token.trim().toLowerCase();
  const match24 = clean.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const h = Number(match24[1]);
    const m = Number(match24[2]);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
  }
  const match12 = clean.match(/^(\d{1,2}):(\d{2})\s*(a\.\s*m\.|p\.\s*m\.|m\.|am|pm)$/);
  if (match12) {
    let h = Number(match12[1]);
    const m = Number(match12[2]);
    const period = match12[3].replace(/\s+/g, '');
    if (h < 1 || h > 12 || m < 0 || m > 59) return null;
    if (period === 'm.') {
      h = 12;
    } else if (period.startsWith('p') && h < 12) {
      h += 12;
    } else if (period.startsWith('a') && h === 12) {
      h = 0;
    }
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  return null;
}

function parseDbScheduleString(rawStr, index = 0) {
  const label = String(rawStr || '').trim();
  if (!label) return null;

  const parts = label.split('·').map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2 && VALID_DAYS.includes(parts[0])) {
    const timeRange = parts[1].split(/[–-]/).map((t) => t.trim());
    if (timeRange.length === 2) {
      const start24 = parseClockTokenTo24h(timeRange[0]);
      const end24 = parseClockTokenTo24h(timeRange[1]);
      const modality = VALID_MODALITIES.includes(parts[2]) ? parts[2] : 'Virtual';
      if (start24 && end24) {
        return {
          id: `db-slot-${index}-${Date.now()}`,
          day: parts[0],
          start: start24,
          end: end24,
          modality,
        };
      }
    }
  }

  const legacyMatch = label.match(/^(Lunes|Martes|Miércoles|Jueves|Viernes|Sábado)\s+(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})(?:\s*\((Virtual|Presencial|Híbrida)\))?$/i);
  if (legacyMatch) {
    const day = VALID_DAYS.find((d) => d.toLowerCase() === legacyMatch[1].toLowerCase()) || 'Lunes';
    const start24 = parseClockTokenTo24h(legacyMatch[2]);
    const end24 = parseClockTokenTo24h(legacyMatch[3]);
    const modality = VALID_MODALITIES.find((m) => m.toLowerCase() === (legacyMatch[4] || 'virtual').toLowerCase()) || 'Virtual';
    if (start24 && end24) {
      return {
        id: `db-slot-${index}-${Date.now()}`,
        day,
        start: start24,
        end: end24,
        modality,
      };
    }
  }

  return {
    id: `db-raw-${index}-${Date.now()}`,
    rawLabel: label,
  };
}

function loadSchedulesFromUserOrStorage(userObj = null) {
  const sessionUser = userObj || readJSON('sessionStorage', 'edu-kt-free-user');
  if (sessionUser && Array.isArray(sessionUser.disponibilidad)) {
    const parsedFromDb = sessionUser.disponibilidad
      .map((entry, idx) => parseDbScheduleString(entry, idx))
      .filter(Boolean);
    storage.set('localStorage', SCHEDULE_STORAGE_KEY, JSON.stringify(parsedFromDb));
    return parsedFromDb;
  }

  const stored = readJSON('localStorage', SCHEDULE_STORAGE_KEY);
  if (!Array.isArray(stored)) {
    return [...DEFAULT_SCHEDULES];
  }
  const valid = stored.filter((item) => (
    item &&
    typeof item === 'object' &&
    ((typeof item.rawLabel === 'string' && item.rawLabel.trim() !== '') ||
      (VALID_DAYS.includes(item.day) &&
        parseTimeToMinutes(item.start) !== null &&
        parseTimeToMinutes(item.end) !== null &&
        parseTimeToMinutes(item.end) > parseTimeToMinutes(item.start)))
  ));
  return valid.length > 0 || stored.length === 0 ? valid : [...DEFAULT_SCHEDULES];
}

async function persistSchedules(schedules) {
  storage.set('localStorage', SCHEDULE_STORAGE_KEY, JSON.stringify(schedules));
  const token = storage.get('sessionStorage', 'edu-kt-free-id-token');
  if (!token) {
    return true;
  }

  const disponibilidadStrings = schedules.map((slot) => formatScheduleLabel(slot)).filter(Boolean);
  const respuesta = await fetch('/api/auth/perfil', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ disponibilidad: disponibilidadStrings }),
  });

  const datosActualizados = await respuesta.json();
  if (!respuesta.ok) {
    throw new Error(datosActualizados.mensaje || 'No se pudo guardar la disponibilidad en la base de datos.');
  }

  storage.set('sessionStorage', 'edu-kt-free-user', JSON.stringify(datosActualizados));
  return true;
}

const scheduleListEl = document.getElementById('scheduleList');
const addScheduleBtn = document.getElementById('addSchedule');
const disponibilidadModalEl = document.getElementById('disponibilidadModal');
const scheduleFormEl = document.getElementById('scheduleForm');
const scheduleErrorEl = document.getElementById('scheduleError');

if (scheduleListEl) {
  let currentSchedules = loadSchedulesFromUserOrStorage();
  let scheduleSaving = false;

  const renderSchedules = () => {
    if (currentSchedules.length === 0) {
      const emptyItem = document.createElement('li');
      emptyItem.className = 'small muted-custom py-2';
      emptyItem.textContent = 'No tienes franjas horarias registradas. Agrega tu primer horario disponible.';
      scheduleListEl.replaceChildren(emptyItem);
      return;
    }

    const items = currentSchedules.map((slot) => {
      const li = document.createElement('li');
      li.className = 'schedule-slot';

      const textSpan = document.createElement('span');
      const label = formatScheduleLabel(slot);
      textSpan.textContent = label;

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'schedule-remove-btn';
      removeBtn.setAttribute('aria-label', `Eliminar horario ${label}`);
      removeBtn.title = 'Eliminar horario';
      removeBtn.disabled = scheduleSaving;

      const icon = document.createElement('i');
      icon.className = 'bi bi-x-lg';
      icon.setAttribute('aria-hidden', 'true');
      removeBtn.appendChild(icon);

      removeBtn.addEventListener('click', async () => {
        if (scheduleSaving) return;
        const previousSchedules = [...currentSchedules];
        currentSchedules = currentSchedules.filter((item) => item.id !== slot.id);
        scheduleSaving = true;
        renderSchedules();
        try {
          await persistSchedules(currentSchedules);
          notify(`Se eliminó el horario ${label}.`);
        } catch (err) {
          currentSchedules = previousSchedules;
          notify(err.message || 'No se pudo actualizar la disponibilidad en la base de datos.');
        } finally {
          scheduleSaving = false;
          renderSchedules();
        }
      });

      li.append(textSpan, removeBtn);
      return li;
    });

    scheduleListEl.replaceChildren(...items);
  };

  renderSchedules();

  window.addEventListener('edukt:user-synced', (event) => {
    if (event.detail && Array.isArray(event.detail.disponibilidad)) {
      currentSchedules = loadSchedulesFromUserOrStorage(event.detail);
      renderSchedules();
    }
  });

  const disponibilidadModal = disponibilidadModalEl && window.bootstrap
    ? bootstrap.Modal.getOrCreateInstance(disponibilidadModalEl)
    : null;

  const setScheduleError = (message = '') => {
    if (!scheduleErrorEl) return;
    scheduleErrorEl.textContent = message;
    scheduleErrorEl.hidden = !message;
  };

  addScheduleBtn?.addEventListener('click', () => {
    setScheduleError('');
    scheduleFormEl?.reset();
    disponibilidadModal?.show();
  });

  disponibilidadModalEl?.addEventListener('shown.bs.modal', () => {
    document.getElementById('scheduleDay')?.focus();
  });

  disponibilidadModalEl?.addEventListener('hidden.bs.modal', () => {
    setScheduleError('');
    addScheduleBtn?.focus();
  });

  scheduleFormEl?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (scheduleSaving) return;
    setScheduleError('');

    const day = document.getElementById('scheduleDay')?.value || '';
    const modality = document.getElementById('scheduleModality')?.value || '';
    const start = document.getElementById('scheduleStart')?.value || '';
    const end = document.getElementById('scheduleEnd')?.value || '';

    if (!VALID_DAYS.includes(day) || !VALID_MODALITIES.includes(modality)) {
      setScheduleError('Selecciona un día y una modalidad válidos.');
      return;
    }

    const startMin = parseTimeToMinutes(start);
    const endMin = parseTimeToMinutes(end);

    if (startMin === null || endMin === null) {
      setScheduleError('Ingresa una hora de inicio y una hora de finalización válidas.');
      return;
    }

    if (startMin < 360 || endMin > 1350) {
      setScheduleError('El horario debe estar comprendido entre las 6:00 a. m. y las 10:30 p. m.');
      return;
    }

    if (endMin <= startMin) {
      setScheduleError('La hora de finalización debe ser posterior a la hora de inicio.');
      document.getElementById('scheduleEnd')?.focus();
      return;
    }

    const duration = endMin - startMin;
    if (duration < 30 || duration > 240) {
      setScheduleError('Cada franja de disponibilidad debe durar entre 30 minutos y 4 horas.');
      document.getElementById('scheduleEnd')?.focus();
      return;
    }

    const overlaps = currentSchedules.some((existing) => {
      if (existing.day !== day) return false;
      const exStart = parseTimeToMinutes(existing.start);
      const exEnd = parseTimeToMinutes(existing.end);
      if (exStart === null || exEnd === null) return false;
      return startMin < exEnd && endMin > exStart;
    });

    if (overlaps) {
      setScheduleError(`El rango seleccionado se cruza con otro horario ya registrado el día ${day}.`);
      return;
    }

    const newSlot = {
      id: `slot-${Date.now()}`,
      day,
      start,
      end,
      modality,
    };

    const previousSchedules = [...currentSchedules];
    currentSchedules.push(newSlot);
    scheduleSaving = true;
    const saveBtn = document.getElementById('saveScheduleBtn');
    if (saveBtn) saveBtn.disabled = true;

    try {
      await persistSchedules(currentSchedules);
      renderSchedules();
      disponibilidadModal?.hide();
      notify(`Horario guardado: ${formatScheduleLabel(newSlot)}.`);
    } catch (err) {
      currentSchedules = previousSchedules;
      setScheduleError(err.message || 'No se pudo guardar el horario en la base de datos.');
    } finally {
      scheduleSaving = false;
      if (saveBtn) saveBtn.disabled = false;
      renderSchedules();
    }
  });
}

document.getElementById('viewMessages')?.addEventListener('click', () => {
  notify('La mensajería completa estará disponible en la siguiente fase del proyecto.');
});

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

const topNavLinks = [...document.querySelectorAll('.nav-pill-group a[href^="#"]')];

if (topNavLinks.length > 0) {
  const trackedTargets = topNavLinks
    .map((link) => {
      const targetId = link.getAttribute('href').slice(1);
      const section = targetId ? document.getElementById(targetId) : null;
      return section ? { link, hash: `#${targetId}`, section } : null;
    })
    .filter(Boolean);

  const setActiveTopLink = (activeHash) => {
    trackedTargets.forEach(({ link, hash }) => {
      const isActive = hash === activeHash;
      link.classList.toggle('active', isActive);
      if (isActive) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  };

  const detectSectionInView = () => {
    if (trackedTargets.length === 0) {
      return;
    }
    const offset = 120;
    const scrollPos = window.scrollY + offset;
    let currentHash = trackedTargets[0].hash;

    trackedTargets.forEach(({ hash, section }) => {
      if (section.offsetTop <= scrollPos) {
        currentHash = hash;
      }
    });

    if ((window.innerHeight + window.scrollY) >= (document.documentElement.scrollHeight - 40)) {
      currentHash = trackedTargets[trackedTargets.length - 1].hash;
    }

    setActiveTopLink(currentHash);
  };

  let scrollSpyScheduled = false;
  window.addEventListener('scroll', () => {
    if (scrollSpyScheduled) {
      return;
    }
    scrollSpyScheduled = true;
    window.requestAnimationFrame(() => {
      scrollSpyScheduled = false;
      detectSectionInView();
    });
  }, { passive: true });

  topNavLinks.forEach((link) => {
    link.addEventListener('click', () => setActiveTopLink(link.getAttribute('href')));
  });

  if (window.location.hash && trackedTargets.some((t) => t.hash === window.location.hash)) {
    setActiveTopLink(window.location.hash);
  } else {
    detectSectionInView();
  }
}
