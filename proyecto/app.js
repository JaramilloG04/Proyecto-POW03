const root = document.documentElement;
const themeToggle = document.getElementById('themeToggle');
const savedTheme = localStorage.getItem('edu-ks-free-theme');

function setTheme(theme) {
  root.setAttribute('data-bs-theme', theme);

  if (themeToggle) {
    const themeIcon = themeToggle.querySelector('i');
    themeIcon.className = theme === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-stars-fill';
    themeToggle.setAttribute('aria-label', theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
    themeToggle.title = themeToggle.getAttribute('aria-label');
  }

  localStorage.setItem('edu-ks-free-theme', theme);
}

setTheme(savedTheme || 'light');

themeToggle?.addEventListener('click', () => {
  const currentTheme = root.getAttribute('data-bs-theme');
  setTheme(currentTheme === 'dark' ? 'light' : 'dark');
});

const toastElement = document.getElementById('feedbackToast');
const feedbackToast = toastElement && window.bootstrap ? new bootstrap.Toast(toastElement) : null;

function notify(message) {
  const toastMessage = document.getElementById('toastMessage');

  if (toastMessage && feedbackToast) {
    toastMessage.textContent = message;
    feedbackToast.show();
  }
}

const loginForm = document.getElementById('loginForm');

loginForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  notify('Inicio de sesión simulado. Redirigiendo al panel...');

  setTimeout(() => {
    window.location.href = 'inicio.html';
  }, 650);
});

const registerForm = document.getElementById('registerForm');

registerForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  notify('Cuenta de prueba creada. Completa tu perfil académico.');

  setTimeout(() => {
    window.location.href = 'perfil.html';
  }, 650);
});

const profileForm = document.getElementById('profileForm');

profileForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  notify('Cambios de perfil guardados solo para esta demostración.');
});

const requestForm = document.getElementById('requestForm');

requestForm?.addEventListener('submit', (event) => {
  event.preventDefault();

  const modalElement = document.getElementById('solicitudModal');
  const modal = modalElement && window.bootstrap ? bootstrap.Modal.getInstance(modalElement) : null;

  modal?.hide();
  requestForm.reset();
  notify('Solicitud enviada. En una versión completa llegará al tutor seleccionado.');
});

document.querySelectorAll('.solicitar-btn').forEach((button) => {
  button.addEventListener('click', () => {
    const tutor = button.dataset.tutor;
    const modalTitle = document.getElementById('solicitudModalLabel');
    const modalElement = document.getElementById('solicitudModal');

    if (modalTitle) {
      modalTitle.textContent = `Solicitar tutoría con ${tutor}`;
    }

    if (modalElement && window.bootstrap) {
      new bootstrap.Modal(modalElement).show();
    }
  });
});

const addSchedule = document.getElementById('addSchedule');

addSchedule?.addEventListener('click', () => {
  const scheduleList = document.getElementById('scheduleList');

  if (scheduleList) {
    const schedule = document.createElement('div');
    schedule.className = 'schedule-slot';
    schedule.textContent = 'Viernes · 3:00–5:00 p. m.';
    scheduleList.appendChild(schedule);
    notify('Se agregó un horario de ejemplo a tu disponibilidad.');
  }
});

const viewMessages = document.getElementById('viewMessages');

viewMessages?.addEventListener('click', () => {
  notify('La mensajería completa estará disponible en la siguiente fase del proyecto.');
});
