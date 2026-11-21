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
const DB_NAME = 'iurisprudentia';
const STORE = 'sentences';
const FIELDS = ['citation', 'corporation', 'chamber', 'caseType', 'decisionDate', 'magistrate', 'topic', 'subtopics', 'keywords', 'legalIssue', 'thesis', 'rules', 'reasoning', 'decision', 'otherDecision'];

function ensureAuthControls() {
  const nav = document.querySelector('.navlinks');
  if (!nav) return null;

  let controls = document.getElementById('firebase-owner-controls');
  if (!controls) {
    controls = document.createElement('span');
    controls.id = 'firebase-owner-controls';
  }
  if (controls.parentElement !== nav) nav.append(controls);
  controls.style.cssText = 'display:inline-flex;gap:8px;align-items:center;margin-left:12px;white-space:nowrap';
  return controls;
}

function removeStaticLoginButtons() {
  const controls = document.getElementById('firebase-owner-controls');
  document.querySelectorAll('button, a, [role="button"]').forEach(element => {
    if (controls?.contains(element)) return;
    if (/iniciar\s+sesi[oó]n\s+con\s+google/i.test(element.textContent.trim())) element.remove();
  });
  document.querySelectorAll('#firebase-owner-controls').forEach((element, index) => {
    if (index > 0) element.remove();
  });
}

function openLocalDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function putLocalRecord(record) {
  const database = await openLocalDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, 'readwrite');
    transaction.objectStore(STORE).put(record);
    transaction.oncomplete = () => { database.close(); resolve(); };
    transaction.onerror = () => { database.close(); reject(transaction.error); };
  });
}

function showMessage(text, kind = 'success') {
  const message = document.querySelector('#form-message');
  if (message) {
    message.className = `message ${kind}`;
    message.textContent = text;
  }
}

async function loadCloudRecords() {
  const snapshot = await getDocs(collection(db, 'provenance'));
  const records = snapshot.docs.map(item => {
    const data = item.data();
    const createdAt = data.createdAt?.toDate?.()?.toISOString?.() || data.createdAt || new Date().toISOString();
    return { ...data, id: item.id, createdAt, file: null, fileName: '' };
  });
  for (const record of records) await putLocalRecord(record);
}

async function login() {
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    alert(`No se pudo iniciar sesión: ${error.message}`);
  }
}

const controls = ensureAuthControls();
removeStaticLoginButtons();

const pdfInput = document.querySelector('#file');
if (pdfInput) {
  pdfInput.required = false;
  const label = document.querySelector('label[for="file"]');
  if (label) label.textContent = 'PDF de la providencia (opcional; no se guarda en la nube)';
}

onAuthStateChanged(auth, async user => {
  removeStaticLoginButtons();
  const authControls = ensureAuthControls();
  if (!authControls) return;
  authControls.replaceChildren();

  const authorized = Boolean(user && user.email?.toLowerCase() === OWNER_EMAIL);

  if (authorized) {
    const status = document.createElement('span');
    status.className = 'hint';
    status.textContent = user.email;

    const logout = document.createElement('button');
    logout.id = 'firebase-logout-button';
    logout.type = 'button';
    logout.className = 'btn secondary';
    logout.textContent = 'Cerrar sesión';
    logout.addEventListener('click', async () => {
      logout.disabled = true;
      try {
        await signOut(auth);
        showMessage('Sesión cerrada correctamente.', 'success');
      } catch (error) {
        showMessage(`No se pudo cerrar la sesión: ${error.message}`, 'error');
        logout.disabled = false;
      }
    });
    authControls.append(status, logout);

    try {
      await loadCloudRecords();
      showMessage('Conectado: las fichas se sincronizan con Firestore. Los PDF no se guardan.', 'success');
    } catch (error) {
      showMessage(`No se pudieron cargar las fichas de la nube: ${error.message}`, 'error');
    }
  } else {
    if (user) await signOut(auth);
    const loginButton = document.createElement('button');
    loginButton.id = 'firebase-login-button';
    loginButton.type = 'button';
    loginButton.className = 'btn';
    loginButton.textContent = 'Iniciar sesión con Google';
    loginButton.addEventListener('click', login);
    authControls.append(loginButton);
  }

  document.querySelectorAll('#record-form input, #record-form textarea, #record-form select').forEach(element => {
    if (element.id !== 'file') element.disabled = !authorized;
  });
  const saveButton = document.querySelector('#save-button');
  if (saveButton) saveButton.disabled = !authorized;
});

// Also remove any duplicate login control inserted later by static page markup.
new MutationObserver(() => removeStaticLoginButtons()).observe(document.documentElement, {
  childList: true,
  subtree: true
});

window.addEventListener('submit', async event => {
  if (event.target?.id !== 'record-form') return;
  event.preventDefault();
  event.stopImmediatePropagation();

  const user = auth.currentUser;
  if (!user || user.email?.toLowerCase() !== OWNER_EMAIL) {
    showMessage('Inicia sesión con la cuenta autorizada para guardar una ficha.', 'error');
    return;
  }

  const form = event.target;
  const data = {};
  form.querySelectorAll('[data-key]').forEach(element => {
    data[element.dataset.key] = element.value.trim();
  });
  if (!data.citation || !data.thesis) {
    showMessage('Completa el radicado y la tesis jurisprudencial.', 'error');
    return;
  }

  const button = document.querySelector('#save-button');
  if (button) button.disabled = true;
  try {
    const id = crypto.randomUUID();
    await setDoc(doc(db, 'provenance', id), {
      ...Object.fromEntries(FIELDS.map(field => [field, String(data[field] ?? '')])),
      ownerUid: user.uid,
      ownerEmail: user.email,
      createdAt: serverTimestamp()
    });
    showMessage('Ficha guardada en Firestore. No se subió ningún PDF.', 'success');
    form.reset();
  } catch (error) {
    showMessage(`No se pudo guardar la ficha: ${error.message}`, 'error');
  } finally {
    if (button) button.disabled = false;
  }
}, true);
