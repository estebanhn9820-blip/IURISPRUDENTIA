import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getFirestore, collection, doc, getDocs, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyAQl4ldky4k5GCeRvoaztpjLISw-mb-xJE',
  authDomain: 'iurisprudentia-40ac5.firebaseapp.com',
  projectId: 'iurisprudentia-40ac5',
  storageBucket: 'iurisprudentia-40ac5.firebasestorage.app',
  messagingSenderId: '358518113591',
  appId: '1:358518113591:web:9b1497a724fe5e55dd862'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();
const OWNER_EMAIL = 'estebanhn9820@gmail.com';

function removeAllLoginButtons() {
  document.querySelectorAll('button, a, [role="button"]').forEach(element => {
    if (element.textContent.trim().toLowerCase().includes('iniciar sesión')) element.remove();
  });
  document.querySelectorAll('#firebase-owner-controls').forEach((element, index) => {
    if (index > 0) element.remove();
  });
}

function ensureAuthControls() {
  const nav = document.querySelector('.navlinks');
  if (!nav) return null;
  let controls = document.querySelector('#firebase-owner-controls');
  if (!controls) {
    controls = document.createElement('span');
    controls.id = 'firebase-owner-controls';
  }
  if (controls.parentElement !== nav) nav.append(controls);
  controls.style.cssText = 'display:inline-flex;gap:8px;align-items:center;margin-left:12px';
  return controls;
}

async function login() {
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    alert(`No se pudo iniciar sesión: ${error.message}`);
  }
}

onAuthStateChanged(auth, async user => {
  removeAllLoginButtons();
  const controls = ensureAuthControls();
  if (!controls) return;
  controls.replaceChildren();

  const authorized = Boolean(user && user.email?.toLowerCase() === OWNER_EMAIL);

  if (authorized) {
    const status = document.createElement('span');
    status.className = 'hint';
    status.style.cssText = 'white-space:nowrap';
    status.textContent = user.email;

    const logout = document.createElement('button');
    logout.id = 'firebase-logout-button';
    logout.type = 'button';
    logout.className = 'btn secondary';
    logout.textContent = 'Cerrar sesión';
    logout.setAttribute('aria-label', 'Cerrar sesión de Google');
    logout.title = 'Cerrar sesión';
    logout.addEventListener('click', async () => {
      logout.disabled = true;
      await signOut(auth);
    });

    controls.append(status, logout);
  } else {
    if (user) await signOut(auth);

    const loginButton = document.createElement('button');
    loginButton.id = 'firebase-login-button';
    loginButton.type = 'button';
    loginButton.className = 'btn';
    loginButton.textContent = 'Iniciar sesión con Google';
    loginButton.addEventListener('click', login);
    controls.append(loginButton);
  }

  document.querySelectorAll('#record-form input, #record-form textarea, #record-form select').forEach(element => {
    if (element.id !== 'file') element.disabled = !authorized;
  });
  const saveButton = document.querySelector('#save-button');
  if (saveButton) saveButton.disabled = !authorized;
});

window.addEventListener('submit', async event => {
  if (event.target?.id !== 'record-form') return;
  event.preventDefault();
  event.stopImmediatePropagation();

  const user = auth.currentUser;
  if (!user || user.email?.toLowerCase() !== OWNER_EMAIL) {
    const message = document.querySelector('#form-message');
    if (message) {
      message.className = 'message error';
      message.textContent = 'Inicia sesión con la cuenta autorizada para guardar una ficha.';
    }
    return;
  }

  const form = event.target;
  const data = {};
  form.querySelectorAll('[data-key]').forEach(element => {
    data[element.dataset.key] = element.value.trim();
  });

  if (!data.citation || !data.thesis) {
    const message = document.querySelector('#form-message');
    if (message) {
      message.className = 'message error';
      message.textContent = 'Completa el radicado y la tesis jurisprudencial.';
    }
    return;
  }

  const button = document.querySelector('#save-button');
  if (button) button.disabled = true;

  try {
    const id = crypto.randomUUID();
    await setDoc(doc(db, 'provenance', id), {
      citation: data.citation,
      corporation: data.corporation,
      chamber: data.chamber,
      caseType: data.caseType,
      decisionDate: data.decisionDate,
      magistrate: data.magistrate,
      topic: data.topic,
      subtopics: data.subtopics,
      keywords: data.keywords,
      legalIssue: data.legalIssue,
      thesis: data.thesis,
      rules: data.rules,
      reasoning: data.reasoning,
      decision: data.decision,
      otherDecision: data.otherDecision,
      ownerUid: user.uid,
      ownerEmail: user.email,
      createdAt: serverTimestamp()
    });

    const message = document.querySelector('#form-message');
    if (message) {
      message.className = 'message success';
      message.textContent = 'Ficha guardada en Firestore.';
    }
    form.reset();
  } catch (error) {
    const message = document.querySelector('#form-message');
    if (message) {
      message.className = 'message error';
      message.textContent = `No se pudo guardar la ficha: ${error.message}`;
    }
  } finally {
    if (button) button.disabled = false;
  }
}, true);
