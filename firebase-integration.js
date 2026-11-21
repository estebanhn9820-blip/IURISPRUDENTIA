import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
  getFirestore, collection, doc, getDocs, setDoc, deleteDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import {
  getStorage, ref, uploadBytes, getBlob, deleteObject
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js';

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
const storage = getStorage(app);
const provider = new GoogleAuthProvider();
const OWNER_EMAIL = 'estebanhn9820@gmail.com';
const DB_NAME = 'iurisprudentia';
const STORE = 'sentences';
const FIELDS = ['citation', 'corporation', 'chamber', 'caseType', 'decisionDate', 'magistrate', 'topic', 'subtopics', 'keywords', 'legalIssue', 'thesis', 'rules', 'reasoning', 'decision', 'otherDecision'];
let syncing = false;

function showMessage(text, kind = 'success') {
  const message = document.querySelector('#form-message');
  if (message) {
    message.className = `message ${kind}`;
    message.textContent = text;
  }
}

function ensureAuthControls() {
  const nav = document.querySelector('.navlinks');
  if (!nav) return null;
  const copies = [...document.querySelectorAll('#firebase-owner-controls')];
  let controls = copies.shift();
  copies.forEach(element => element.remove());
  if (!controls) {
    controls = document.createElement('span');
    controls.id = 'firebase-owner-controls';
  }
  if (controls.parentElement !== nav) nav.append(controls);
  controls.style.cssText = 'display:inline-flex;align-items:center;gap:8px;margin-left:12px;white-space:nowrap';
  return controls;
}

function removeDuplicateLoginButtons() {
  const controls = document.getElementById('firebase-owner-controls');
  document.querySelectorAll('.navlinks button, .navlinks a, .navlinks [role="button"]').forEach(element => {
    if (controls?.contains(element)) return;
    if (/^iniciar\s+sesi[oó]n\s+con\s+google$/i.test(element.textContent.trim())) element.remove();
  });
}

function openLocalDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function localRecords() {
  const database = await openLocalDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, 'readonly');
    const request = transaction.objectStore(STORE).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => { database.close(); reject(transaction.error); };
  });
}

async function writeLocal(record) {
  const database = await openLocalDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, 'readwrite');
    transaction.objectStore(STORE).put(record);
    transaction.oncomplete = () => { database.close(); resolve(); };
    transaction.onerror = () => { database.close(); reject(transaction.error); };
  });
}

async function removeLocal(id) {
  const database = await openLocalDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, 'readwrite');
    transaction.objectStore(STORE).delete(id);
    transaction.oncomplete = () => { database.close(); resolve(); };
    transaction.onerror = () => { database.close(); reject(transaction.error); };
  });
}

function fieldData(record) {
  return Object.fromEntries(FIELDS.map(field => [field, String(record[field] ?? '')]));
}

function remoteDiffers(remote, local) {
  if (!local) return true;
  return FIELDS.some(field => String(remote[field] ?? '') !== String(local[field] ?? '')) ||
    String(remote.filePath || '') !== String(local.filePath || '');
}

async function uploadPdf(file, user, id) {
  if (!file) return '';
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    throw new Error('El archivo adjunto debe ser un PDF.');
  }
  if (file.size > 25 * 1024 * 1024) throw new Error('El PDF supera el límite de 25 MB.');
  const path = `provenance/${user.uid}/${id}.pdf`;
  await uploadBytes(ref(storage, path), file, { contentType: 'application/pdf' });
  return path;
}

async function saveCloudRecord(record, user) {
  const id = record.id || crypto.randomUUID();
  let filePath = record.filePath || '';
  if (record.file instanceof Blob) filePath = await uploadPdf(record.file, user, id);

  const documentData = {
    ...fieldData(record),
    id,
    fileName: filePath ? (record.fileName || `${record.citation || 'providencia'}.pdf`) : '',
    filePath,
    ownerUid: user.uid,
    ownerEmail: user.email,
    createdAt: record.createdAt || serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  await setDoc(doc(db, 'provenance', id), documentData);
  return { ...documentData, id, createdAt: new Date().toISOString(), file: record.file || null };
}

async function syncLibrary(user) {
  if (syncing) return;
  syncing = true;
  try {
    // Migrate existing browser-only fichas and PDFs once into this Google user's cloud library.
    const initialSnapshot = await getDocs(collection(db, 'provenance'));
    const cloudById = new Map(initialSnapshot.docs.map(item => [item.id, item.data()]));
    const existingLocal = await localRecords();
    for (const local of existingLocal) {
      if (!cloudById.has(local.id)) {
        const uploaded = await saveCloudRecord(local, user);
        cloudById.set(local.id, uploaded);
      }
    }

    const snapshot = await getDocs(collection(db, 'provenance'));
    const cloudIds = new Set(snapshot.docs.map(item => item.id));
    const localById = new Map((await localRecords()).map(record => [record.id, record]));
    let changed = false;

    for (const item of snapshot.docs) {
      const data = item.data();
      const local = localById.get(item.id);
      let file = local?.file || null;
      if (data.filePath && (!file || local?.filePath !== data.filePath)) {
        file = await getBlob(ref(storage, data.filePath));
      }
      const createdAt = data.createdAt?.toDate?.()?.toISOString?.() || data.createdAt || new Date().toISOString();
      const record = { ...data, id: item.id, createdAt, file, fileName: data.fileName || '' };
      if (remoteDiffers(data, local) || (!local && file)) changed = true;
      await writeLocal(record);
    }

    // Cloud is authoritative after migration; remove stale local copies deleted elsewhere.
    for (const local of localById.values()) {
      if (!cloudIds.has(local.id)) {
        await removeLocal(local.id);
        changed = true;
      }
    }

    if (changed) {
      // The existing library renderer reads IndexedDB on startup. Reload once after
      // synchronization so it renders the cloud snapshot rather than stale local data.
      window.location.reload();
      return;
    }
    showMessage('Biblioteca sincronizada con la nube. Fichas y PDF disponibles en tus dispositivos.', 'success');
  } catch (error) {
    showMessage(`No se pudo sincronizar la biblioteca: ${error.message}`, 'error');
  } finally {
    syncing = false;
  }
}

async function login() {
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    alert(`No se pudo iniciar sesión: ${error.message}`);
  }
}

function renderAuth(user) {
  removeDuplicateLoginButtons();
  const controls = ensureAuthControls();
  if (!controls) return;
  controls.replaceChildren();
  const authorized = Boolean(user && user.email?.toLowerCase() === OWNER_EMAIL);

  if (user) {
    const identity = document.createElement('span');
    identity.className = 'hint';
    identity.textContent = user.displayName || user.email || 'Usuario conectado';
    const logout = document.createElement('button');
    logout.type = 'button';
    logout.className = 'btn secondary';
    logout.textContent = 'Cerrar sesión';
    logout.addEventListener('click', async () => {
      logout.disabled = true;
      try {
        await signOut(auth);
        window.location.assign('./');
      } catch (error) {
        showMessage(`No se pudo cerrar la sesión: ${error.message}`, 'error');
        logout.disabled = false;
      }
    });
    controls.append(identity, logout);
  } else {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn';
    button.textContent = 'Iniciar sesión con Google';
    button.addEventListener('click', login);
    controls.append(button);
  }

  document.querySelectorAll('#record-form input, #record-form textarea, #record-form select').forEach(element => {
    if (element.id !== 'file') element.disabled = !authorized;
  });
  const saveButton = document.querySelector('#save-button');
  if (saveButton) saveButton.disabled = !authorized;

  if (authorized) syncLibrary(user);
  else if (user) showMessage('Esta cuenta no está autorizada para acceder a la biblioteca.', 'error');
}

const pdfInput = document.querySelector('#file');
if (pdfInput) {
  pdfInput.required = false;
  const label = document.querySelector('label[for="file"]');
  if (label) label.textContent = 'PDF de la providencia (opcional; se guarda de forma privada en la nube)';
}

ensureAuthControls();
removeDuplicateLoginButtons();
new MutationObserver(() => {
  removeDuplicateLoginButtons();
  ensureAuthControls();
}).observe(document.documentElement, { childList: true, subtree: true });
onAuthStateChanged(auth, renderAuth);

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
  form.querySelectorAll('[data-key]').forEach(element => { data[element.dataset.key] = element.value.trim(); });
  if (!data.citation || !data.thesis) {
    showMessage('Completa el radicado y la tesis jurisprudencial.', 'error');
    return;
  }
  const file = document.querySelector('#file')?.files?.[0] || null;
  const button = document.querySelector('#save-button');
  if (button) button.disabled = true;
  try {
    showMessage(file ? 'Subiendo ficha y PDF a la nube…' : 'Guardando ficha en la nube…', 'success');
    const record = await saveCloudRecord({ ...data, id: crypto.randomUUID(), file, fileName: file?.name || '' }, user);
    await writeLocal(record);
    showMessage('Ficha y documento guardados en la nube.', 'success');
    form.reset();
    window.location.reload();
  } catch (error) {
    showMessage(`No se pudo guardar en la nube: ${error.message}`, 'error');
  } finally {
    if (button) button.disabled = false;
  }
}, true);

window.addEventListener('submit', async event => {
  if (event.target?.id !== 'edit-form') return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const user = auth.currentUser;
  if (!user || user.email?.toLowerCase() !== OWNER_EMAIL) return;
  const id = document.querySelector('#edit-id')?.value;
  const local = (await localRecords()).find(record => record.id === id);
  if (!local) return;
  const data = { ...local };
  event.target.querySelectorAll('[data-key]').forEach(element => { data[element.dataset.key] = element.value.trim(); });
  try {
    await saveCloudRecord(data, user);
    showMessage('Cambios guardados en la nube.', 'success');
    window.location.reload();
  } catch (error) {
    const message = document.querySelector('#edit-message');
    if (message) { message.className = 'message error'; message.textContent = error.message; }
  }
}, true);

window.addEventListener('click', async event => {
  const button = event.target.closest('button[data-action="delete"]');
  if (!button) return;
  const user = auth.currentUser;
  if (!user || user.email?.toLowerCase() !== OWNER_EMAIL) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const recordId = button.dataset.id;
  const record = (await localRecords()).find(item => item.id === recordId);
  if (!record || !confirm(`¿Eliminar la ficha “${record.citation || ''}” y su PDF de todos tus dispositivos?`)) return;
  try {
    await deleteDoc(doc(db, 'provenance', recordId));
    if (record.filePath) {
      try { await deleteObject(ref(storage, record.filePath)); } catch (error) { console.warn('No se pudo eliminar el PDF de Storage:', error); }
    }
    await removeLocal(recordId);
    window.location.reload();
  } catch (error) {
    showMessage(`No se pudo eliminar la ficha: ${error.message}`, 'error');
  }
}, true);
