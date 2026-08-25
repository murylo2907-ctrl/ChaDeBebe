/**
 * Convite Digital — Chá do Bebê
 * URL do Web App do Google Apps Script (termina em /exec)
 */
const GAS_WEB_APP_URL =
  'https://script.google.com/macros/s/AKfycbw_V90iudsfFRL9J1gXQ_yA88nCInwJYBJ43rWaJ6hillHtuQoxuB8ap9mZO7fKEafq/exec';

document.addEventListener('DOMContentLoaded', () => {
  initSmoothScroll();
  initRevealAnimations();
  initRsvpForm();
  initPhoneMask();
});

function initPhoneMask() {
  const tel = document.getElementById('telefone');
  if (!tel) return;

  tel.addEventListener('input', () => {
    let v = tel.value.replace(/\D/g, '').slice(0, 11);
    if (v.length > 6) {
      v = `(${v.slice(0, 2)}) ${v.slice(2, v.length > 10 ? 7 : 6)}${v.length > 10 ? '-' : ''}${v.slice(v.length > 10 ? 7 : 6)}`;
    } else if (v.length > 2) {
      v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
    } else if (v.length > 0) {
      v = `(${v}`;
    }
    tel.value = v;
  });
}

function initSmoothScroll() {
  const btn = document.getElementById('btn-confirmar');
  const rsvp = document.getElementById('rsvp');

  btn?.addEventListener('click', () => {
    rsvp?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function initRevealAnimations() {
  const elements = document.querySelectorAll('.reveal');

  if (!('IntersectionObserver' in window)) {
    elements.forEach((el) => el.classList.add('visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  elements.forEach((el) => observer.observe(el));
}

function initRsvpForm() {
  const form = document.getElementById('rsvp-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const data = collectFormData();
    const errors = validateForm(data);

    if (Object.keys(errors).length > 0) {
      showErrors(errors);
      return;
    }

    await submitRsvp(data);
  });
}

function collectFormData() {
  const comparecer = document.querySelector('input[name="comparecer"]:checked');

  return {
    nome: document.getElementById('nome')?.value.trim() ?? '',
    acompanhantes: document.getElementById('acompanhantes')?.value.trim() ?? '',
    comparecer: comparecer?.value ?? '',
    telefone: document.getElementById('telefone')?.value.trim() ?? '',
  };
}

function validateForm(data) {
  const errors = {};

  if (!data.nome) {
    errors.nome = 'Por favor, informe seu nome completo.';
  }

  if (!data.comparecer) {
    errors.comparecer = 'Selecione se você vai comparecer.';
  }

  const phoneDigits = data.telefone.replace(/\D/g, '');
  if (!data.telefone) {
    errors.telefone = 'Por favor, informe seu telefone ou WhatsApp.';
  } else if (phoneDigits.length < 10 || phoneDigits.length > 11) {
    errors.telefone = 'Informe um telefone válido com DDD (10 ou 11 dígitos).';
  }

  return errors;
}

function clearErrors() {
  document.querySelectorAll('[data-error-for]').forEach((el) => {
    el.textContent = '';
    el.classList.add('hidden');
  });

  document.querySelectorAll('.input-field').forEach((el) => {
    el.classList.remove('error');
  });

  const global = document.getElementById('form-global-error');
  if (global) {
    global.textContent = '';
    global.classList.add('hidden');
  }
}

function showErrors(errors) {
  Object.entries(errors).forEach(([field, message]) => {
    const errorEl = document.querySelector(`[data-error-for="${field}"]`);
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.remove('hidden');
    }

    if (field === 'comparecer') return;

    const input = document.getElementById(field);
    input?.classList.add('error');
  });
}

function showGlobalError(message) {
  const global = document.getElementById('form-global-error');
  if (!global) return;
  global.textContent = message;
  global.classList.remove('hidden');
}

function setLoading(isLoading) {
  const btn = document.getElementById('btn-enviar');
  if (!btn) return;

  btn.disabled = isLoading;

  if (isLoading) {
    btn.innerHTML =
      '<span class="spinner" aria-hidden="true"></span><span> Enviando...</span>';
  } else {
    btn.innerHTML =
      '<span id="btn-enviar-text">Enviar Confirmação</span>';
  }
}

function buildRsvpParams(data) {
  return new URLSearchParams({
    action: 'save',
    nome: data.nome,
    acompanhantes: data.acompanhantes,
    comparecer: data.comparecer,
    telefone: data.telefone.replace(/\D/g, ''),
  });
}

function isSaveSuccess(text) {
  if (!text) return false;
  if (text.includes('"success":true') || text.includes('"success": true')) {
    return true;
  }
  try {
    const parsed = JSON.parse(text.trim());
    return parsed.success === true;
  } catch {
    return false;
  }
}

function isOldDeployment(text) {
  return text.includes('"status":"ok"') && !isSaveSuccess(text);
}

function getDeployErrorMessage() {
  return (
    'O Apps Script na nuvem está desatualizado. Abra a planilha → Extensões → Apps Script, ' +
    'cole o código do arquivo google-apps-script.gs, salve e clique em Implantar → Gerenciar implantações → ' +
    'Editar → Nova versão → Implantar. Depois teste abrindo no navegador: sua URL + ?action=save&nome=Teste&comparecer=Sim&telefone=41999999999 ' +
    '(deve aparecer {"success":true}).'
  );
}

function sendViaHiddenIframe(url) {
  return new Promise((resolve, reject) => {
    const iframe = document.getElementById('gas-frame');
    if (!iframe) {
      reject(new Error('Iframe de envio não encontrado.'));
      return;
    }

    let done = false;

    const finish = (ok) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      iframe.onload = null;
      iframe.onerror = null;
      ok ? resolve() : reject(new Error('Falha no envio.'));
    };

    const timer = setTimeout(() => finish(true), 8000);

    iframe.onload = () => {
      try {
        const text = iframe.contentDocument?.body?.innerText?.trim() || '';
        if (isOldDeployment(text)) {
          finish(false);
          return;
        }
        if (isSaveSuccess(text) || text === 'OK' || !text) {
          finish(true);
          return;
        }
      } catch {
        // Cross-origin: pedido foi enviado ao Google
      }
      finish(true);
    };

    iframe.onerror = () => finish(false);
    iframe.src = url;
  });
}

async function submitRsvp(data) {
  if (
    !GAS_WEB_APP_URL ||
    GAS_WEB_APP_URL.includes('COLE_AQUI') ||
    !GAS_WEB_APP_URL.startsWith('https://script.google.com/macros/s/')
  ) {
    showGlobalError(
      'A URL do formulário ainda não foi configurada. Atualize GAS_WEB_APP_URL em script.js.'
    );
    return;
  }

  setLoading(true);
  clearErrors();

  const url = `${GAS_WEB_APP_URL}?${buildRsvpParams(data).toString()}`;

  try {
    // Verifica se a implantação na nuvem está correta
    try {
      const check = await fetch(url, { method: 'GET', redirect: 'follow' });
      const text = await check.text();

      if (isOldDeployment(text)) {
        showGlobalError(getDeployErrorMessage());
        return;
      }

      if (isSaveSuccess(text)) {
        showSuccess();
        launchConfetti();
        return;
      }
    } catch {
      // Se fetch falhar (rede), tenta iframe
    }

    await sendViaHiddenIframe(url);
    showSuccess();
    launchConfetti();
  } catch (err) {
    console.error(err);
    showGlobalError(getDeployErrorMessage());
  } finally {
    setLoading(false);
  }
}

function showSuccess() {
  const form = document.getElementById('rsvp-form');
  const overlay = document.getElementById('success-overlay');

  form?.classList.add('opacity-0', 'pointer-events-none', 'h-0', 'overflow-hidden');
  overlay?.classList.add('show');
}

function launchConfetti() {
  if (typeof confetti !== 'function') return;

  const colors = ['#F8C1D6', '#E88FB1', '#FCE7F0', '#ffffff', '#D4AF37'];

  confetti({
    particleCount: 70,
    spread: 60,
    origin: { y: 0.65 },
    colors,
  });

  setTimeout(() => {
    confetti({
      particleCount: 40,
      spread: 80,
      origin: { y: 0.5, x: 0.2 },
      colors,
    });
    confetti({
      particleCount: 40,
      spread: 80,
      origin: { y: 0.5, x: 0.8 },
      colors,
    });
  }, 200);
}
