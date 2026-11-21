import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getFirestore, collection, doc, getDocs, setDoc, deleteDoc, serverTimestamp, query, where } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { getStorage, ref, uploadBytes, getBlob, deleteObject } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js';

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
  if (message) { message.className = `message ${kind}`; message.textContent = text; }
}

function ensureAuthControls() {
  const nav = document.querySelector('.navlinks');
  if (!nav) return null;
  const copies = [...document.querySelectorAll('#firebase-owner-controls')];
  let controls = copies.shift();
  copies.forEach(element => element.remove());
  if (!controls) { controls = document.createElement('span'); controls.id = 'firebase-owner-controls'; }
  if (controls.parentElement !== nav) nav.append(controls);
  controls.style.cssText = 'display:inline-flex;align-items:center;gap:8px;margin-left:12px;white-space:nowrap';
  return controls;
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getLocalRecords() {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, 'readonly');
    const request = transaction.objectStore(STORE).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
  });
}

async function putLocal(record) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, 'readwrite');
    transaction.objectStore(STORE).put(record);
    transaction.oncomplete = () => { database.close(); resolve(); };
    transaction.onerror = () => { database.close(); reject(transaction.error); };
  });
}

async function deleteLocal(id) {
  const database = await openDatabase();
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

async function uploadPdf(file, user, id) {
  if (!file) return '';
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) throw new Error('El archivo adjunto debe ser un PDF.');
  if (file.size > 25 * 1024 * 1024) throw new Error('El PDF supera el límite de 25 MB.');
  const path = `provenance/${user.uid}/${id}.pdf`;
  await uploadBytes(ref(storage, path), file, { contentType: 'application/pdf' });
  return path;
}

async function saveCloud(record, user) {
  const id = record.id || crypto.randomUUID();
  let filePath = record.filePath || '';
  if (record.file instanceof Blob) filePath = await uploadPdf(record.file, user, id);
  const data = {
    ...fieldData(record), id,
    fileName: filePath ? (record.fileName || `${record.citation || 'providencia'}.pdf`) : '',
    filePath,
    ownerUid: user.uid,
    ownerEmail: user.email,
    createdAt: record.createdAt || serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  await setDoc(doc(db, 'provenance', id), data);
  return { ...data, id, createdAt: new Date().toISOString(), file: record.file || null };
}

// No automatic reload: synchronize once and refresh the existing library in place.
async function syncLibrary(user) {
  if (syncing) return;
  syncing = true;
  try {
    const ownedQuery = query(collection(db, 'provenance'), where('ownerUid', '==', user.uid));
    const snapshot = await getDocs(ownedQuery);
    const local = await getLocalRecords();
    const localById = new Map(local.map(record => [record.id, record]));

    for (const item of snapshot.docs) {
      const data = item.data();
      const old = localById.get(item.id);
      let file = old?.file || null;
      if (data.filePath && (!file || old?.filePath !== data.filePath)) {
        try { file = await getBlob(ref(storage, data.filePath)); }
        catch (error) { console.warn('PDF no disponible:', error); }
      }
      const createdAt = data.createdAt?.toDate?.()?.toISOString?.() || data.createdAt || new Date().toISOString();
      await putLocal({ ...data, id: item.id, createdAt, file, fileName: data.fileName || '' });
    }

    if (typeof window.loadRecords === 'function') await window.loadRecords();
    showMessage('Biblioteca sincronizada con tu cuenta de Google.', 'success');
  } catch (error) {
    showMessage(`No se pudo sincronizar la biblioteca: ${error.message}`, 'error');
  } finally {
    syncing = false;
  }
}

async function login() {
  try { await signInWithPopup(auth, provider); }
  catch (error) { alert(`No se pudo iniciar sesión: ${error.message}`); }
}

function renderAuth(user) {
  const nav = document.querySelector('.navlinks');
  if (!nav) return;
  const existing = [...document.querySelectorAll('#firebase-owner-controls')];
  let controls = existing.shift();
  existing.forEach(element => element.remove());
  if (!controls) { controls = document.createElement('span'); controls.id = 'firebase-owner-controls'; }
  if (controls.parentElement !== nav) nav.append(controls);
  controls.style.cssText = 'display:inline-flex;align-items:center;gap:8px;margin-left:12px;white-space:nowrap';
  controls.replaceChildren();

  document.body.classList.remove('auth-pending', 'auth-public');
  document.body.classList.toggle('auth-user', Boolean(user));

  if (user) {
    const identity = document.createElement('span');
    identity.className = 'hint';
    identity.textContent = user.displayName || user.email || 'Usuario conectado';
    const logout = document.createElement('button');
    logout.type = 'button';
    logout.className = 'btn secondary';
    logout.textContent = 'Cerrar sesión';
    logout.addEventListener('click', async () => { await signOut(auth); window.location.assign('./'); });
    controls.append(identity, logout);

    const authorized = user.email?.toLowerCase() === OWNER_EMAIL;
    document.querySelectorAll('#record-form input, #record-form textarea, #record-form select').forEach(element => {
      if (element.id !== 'file') element.disabled = !authorized;
    });
    const saveButton = document.querySelector('#save-button');
    if (saveButton) saveButton.disabled = !authorized;
    if (authorized) syncLibrary(user);
  } else {
    document.body.classList.add('auth-public');
    const loginButton = document.createElement('button');
    loginButton.type = 'button';
    loginButton.className = 'btn';
    loginButton.textContent = 'Iniciar sesión con Google';
    loginButton.addEventListener('click', login);
    controls.append(loginButton);
  }
}

onAuthStateChanged(auth, renderAuth);

const pdfInput = document.querySelector('#file');
if (pdfInput) {
  pdfInput.required = false;
  const label = document.querySelector('label[for="file"]');
  if (label) label.textContent = 'PDF de la providencia (opcional; se guarda en la nube)';
}

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
  if (!data.citation || !data.thesis) { showMessage('Completa el radicado y la tesis jurisprudencial.', 'error'); return; }
  const file = document.querySelector('#file')?.files?.[0] || null;
  const button = document.querySelector('#save-button');
  if (button) button.disabled = true;
  try {
    showMessage(file ? 'Subiendo ficha y PDF…' : 'Guardando ficha…', 'success');
    const saved = await saveCloud({ ...data, id: crypto.randomUUID(), file, fileName: file?.name || '' }, user);
    await putLocal(saved);
    showMessage('Ficha y documento guardados en la nube.', 'success');
    form.reset();
    if (typeof window.loadRecords === 'function') await window.loadRecords();
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
  const old = (await getLocalRecords()).find(record => record.id === id);
  if (!old) return;
  const data = { ...old };
  event.target.querySelectorAll('[data-key]').forEach(element => { data[element.dataset.key] = element.value.trim(); });
  try {
    const saved = await saveCloud(data, user);
    await putLocal(saved);
    if (typeof window.loadRecords === 'function') await window.loadRecords();
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
  const record = (await getLocalRecords()).find(item => item.id === button.dataset.id);
  if (!record || !confirm(`¿Eliminar la ficha “${record.citation || ''}” y su PDF?`)) return;
  try {
    await deleteDoc(doc(db, 'provenance', record.id));
    if (record.filePath) {
      try { await deleteObject(ref(storage, record.filePath)); } catch (error) { console.warn(error); }
    }
    await deleteLocal(record.id);
    if (typeof window.loadRecords === 'function') await window.loadRecords();
  } catch (error) { showMessage(`No se pudo eliminar la ficha: ${error.message}`, 'error'); }
}, true);
