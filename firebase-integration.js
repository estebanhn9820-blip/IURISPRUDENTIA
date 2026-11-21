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
const DB_NAME = 'iurisprudentia';
const STORE = 'sentences';
const FIELDS = ['citation', 'corporation', 'chamber', 'caseType', 'decisionDate', 'magistrate', 'topic', 'subtopics', 'keywords', 'legalIssue', 'thesis', 'rules', 'reasoning', 'decision', 'otherDecision'];
let syncing = false;

function showMessage(text, kind = 'success') {
  const message = document.querySelector('#form-message');
  if (message) { message.className = `message ${kind}`; message.textContent = text; }
}

function installLandingPage() {
  document.body.classList.add('auth-pending');

  const styles = document.createElement('style');
  styles.id = 'landing-page-styles';
  styles.textContent = `
    body.auth-pending main, body.auth-pending footer,
    body.auth-public main, body.auth-public footer { display: none !important; }
    body.auth-public .navlinks > a { display: none !important; }
    #public-landing { display: none; }
    body.auth-public #public-landing { display: block; }
    #public-landing { color: #f7f4ee; background: #17283c; overflow: hidden; }
    .landing-hero { position: relative; padding: clamp(64px, 10vw, 128px) 24px 86px; background: radial-gradient(ellipse at 82% 18%, #526a76 0, transparent 34%), linear-gradient(130deg, #17283c, #263d51 60%, #344b55); }
    .landing-inner { width: min(1120px, 100%); margin: auto; }
    .landing-kicker { color: #d3b875; font-size: 12px; font-weight: 750; letter-spacing: .16em; text-transform: uppercase; }
    .landing-hero h1 { margin: 18px 0 14px; color: #fff; font: 600 clamp(42px, 7vw, 76px)/1.04 Georgia, serif; letter-spacing: .015em; }
    .landing-lead { max-width: 820px; margin: 0; color: #f0eadc; font: 500 clamp(20px, 3vw, 29px)/1.4 Georgia, serif; }
    .landing-copy { max-width: 720px; margin: 22px 0 30px; color: #d2dbe0; font-size: 17px; line-height: 1.8; }
    .landing-cta { display: inline-flex; align-items: center; gap: 10px; padding: 13px 20px; border: 1px solid #d5bd80; border-radius: 8px; background: #a48648; color: white; font: 650 15px inherit; text-decoration: none; cursor: pointer; }
    .landing-cta:hover { background: #92733b; }
    .landing-note { margin: 13px 0 0; color: #c2ccd1; font-size: 12px; }
    .landing-benefits { padding: 76px 24px 84px; background: #f7f5ef; color: #202a38; }
    .landing-benefits h2, .landing-audience h2 { margin: 0 0 12px; font: 600 clamp(29px, 4vw, 40px)/1.2 Georgia, serif; }
    .landing-section-copy { max-width: 720px; margin: 0 0 32px; color: #637080; line-height: 1.7; }
    .landing-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 15px; }
    .landing-card { min-height: 190px; padding: 22px 19px; border: 1px solid #e4dfd4; border-radius: 12px; background: #fff; box-shadow: 0 8px 26px #202a380b; }
    .landing-icon { display: block; margin-bottom: 20px; font-size: 27px; }
    .landing-card h3 { margin: 0 0 8px; color: #26384d; font: 650 17px/1.35 Georgia, serif; }
    .landing-card p { margin: 0; color: #6b7280; font-size: 13px; line-height: 1.6; }
    .landing-audience { padding: 68px 24px 76px; background: #ede9df; color: #202a38; }
    .landing-audience p { max-width: 900px; margin: 0; color: #596575; font-size: 16px; line-height: 1.8; }
    .landing-footer { padding: 22px 24px; background: #17283c; color: #c4cbd0; text-align: center; font-size: 12px; }
    @media (max-width: 900px) { .landing-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    @media (max-width: 520px) { .landing-grid { grid-template-columns: 1fr; } .landing-hero { padding-inline: 20px; } .landing-benefits, .landing-audience { padding-inline: 20px; } }
  `;
  document.head.append(styles);

  const landing = document.createElement('div');
  landing.id = 'public-landing';
  landing.innerHTML = `
    <section class="landing-hero">
      <div class="landing-inner">
        <span class="landing-kicker">Biblioteca personal · Jurisprudencia penal colombiana</span>
        <h1>IURISPRUDENTIA</h1>
        <p class="landing-lead">La biblioteca jurisprudencial inteligente para estudiar, organizar y consultar la jurisprudencia penal colombiana.</p>
        <p class="landing-copy">Construya su propio repositorio de decisiones judiciales, clasifique providencias por tema, identifique reglas jurisprudenciales y consulte su biblioteca desde cualquier lugar.</p>
        <button class="landing-cta" id="landing-login-button" type="button">Iniciar sesión con Google <span aria-hidden="true">→</span></button>
        <p class="landing-note">Su biblioteca personal, disponible en sus dispositivos al iniciar sesión.</p>
      </div>
    </section>
    <section class="landing-benefits">
      <div class="landing-inner">
        <h2>Jurisprudencia organizada para el trabajo jurídico</h2>
        <p class="landing-section-copy">Una herramienta de consulta personal para convertir providencias en conocimiento estructurado y fácil de recuperar.</p>
        <div class="landing-grid">
          <article class="landing-card"><span class="landing-icon" aria-hidden="true">📚</span><h3>Organice sentencias y autos</h3><p>Reúna providencias y fichas en una biblioteca personal, ordenada y accesible.</p></article>
          <article class="landing-card"><span class="landing-icon" aria-hidden="true">⚖️</span><h3>Identifique reglas jurisprudenciales</h3><p>Registre tesis, reglas, problemas jurídicos y fundamentos relevantes.</p></article>
          <article class="landing-card"><span class="landing-icon" aria-hidden="true">🔎</span><h3>Encuentre precedentes en segundos</h3><p>Busque por radicado, tema, palabras clave, magistratura o corporación.</p></article>
          <article class="landing-card"><span class="landing-icon" aria-hidden="true">🤖</span><h3>Consulte su biblioteca mediante IA</h3><p>Prepare su repositorio para explorar y consultar el conocimiento jurisprudencial.</p></article>
          <article class="landing-card"><span class="landing-icon" aria-hidden="true">☁️</span><h3>Acceda desde cualquier equipo</h3><p>Inicie sesión con Google para sincronizar fichas y documentos en la nube.</p></article>
        </div>
      </div>
    </section>
    <section class="landing-audience">
      <div class="landing-inner">
        <h2>Para quienes trabajan con jurisprudencia</h2>
        <p>IURISPRUDENTIA está pensada para jueces y empleados judiciales que estudian precedentes, litigantes que preparan sus argumentos e investigadores que analizan líneas jurisprudenciales. Una biblioteca clara y personal ayuda a dedicar menos tiempo a buscar y más tiempo a comprender el derecho.</p>
      </div>
    </section>
    <div class="landing-footer">IURISPRUDENTIA · Biblioteca jurisprudencial personal</div>
  `;
  document.querySelector('header')?.after(landing);
  document.querySelector('#landing-login-button')?.addEventListener('click', login);
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
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: 'id' });
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

async function uploadPdf(file, user, id) {
  if (!file) return '';
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) throw new Error('El archivo adjunto debe ser un PDF.');
  if (file.size > 25 * 1024 * 1024) throw new Error('El PDF supera el límite de 25 MB.');
  const path = `provenance/${user.uid}/${id}.pdf`;
  await uploadBytes(ref(storage, path), file, { contentType: 'application/pdf' });
  return path;
}

async function saveCloudRecord(record, user) {
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

async function syncLibrary(user) {
  if (syncing) return;
  syncing = true;
  try {
    const ownedQuery = query(collection(db, 'provenance'), where('ownerUid', '==', user.uid));
    const initialSnapshot = await getDocs(ownedQuery);
    const cloudIds = new Set(initialSnapshot.docs.map(item => item.id));
    const existingLocal = await localRecords();

    for (const local of existingLocal) {
      if (!cloudIds.has(local.id)) await saveCloudRecord(local, user);
    }

    const snapshot = await getDocs(ownedQuery);
    const localById = new Map((await localRecords()).map(record => [record.id, record]));
    const cloudById = new Set(snapshot.docs.map(item => item.id));
    let changed = false;

    for (const item of snapshot.docs) {
      const data = item.data();
      const local = localById.get(item.id);
      let file = local?.file || null;
      if (data.filePath && (!file || local.filePath !== data.filePath)) file = await getBlob(ref(storage, data.filePath));
      const createdAt = data.createdAt?.toDate?.()?.toISOString?.() || data.createdAt || new Date().toISOString();
      await writeLocal({ ...data, id: item.id, createdAt, file, fileName: data.fileName || '' });
      changed = true;
    }

    for (const local of localById.values()) {
      if (!cloudById.has(local.id)) { await removeLocal(local.id); changed = true; }
    }
    if (changed) window.location.reload();
    else showMessage('Biblioteca sincronizada con tu cuenta de Google.', 'success');
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
  removeDuplicateLoginButtons();
  const controls = ensureAuthControls();
  if (!controls) return;
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
    logout.addEventListener('click', async () => {
      logout.disabled = true;
      try { await signOut(auth); window.location.assign('./'); }
      catch (error) { showMessage(`No se pudo cerrar la sesión: ${error.message}`, 'error'); logout.disabled = false; }
    });
    controls.append(identity, logout);

    document.querySelectorAll('#record-form input, #record-form textarea, #record-form select').forEach(element => {
      if (element.id !== 'file') element.disabled = false;
    });
    const saveButton = document.querySelector('#save-button');
    if (saveButton) saveButton.disabled = false;
    syncLibrary(user);
  } else {
    document.body.classList.add('auth-public');
    const loginButton = document.createElement('button');
    loginButton.id = 'firebase-login-button';
    loginButton.type = 'button';
    loginButton.className = 'btn';
    loginButton.textContent = 'Iniciar sesión con Google';
    loginButton.addEventListener('click', login);
    controls.append(loginButton);

    document.querySelectorAll('#record-form input, #record-form textarea, #record-form select').forEach(element => {
      if (element.id !== 'file') element.disabled = true;
    });
    const saveButton = document.querySelector('#save-button');
    if (saveButton) saveButton.disabled = true;
  }
}

installLandingPage();

const pdfInput = document.querySelector('#file');
if (pdfInput) {
  pdfInput.required = false;
  const label = document.querySelector('label[for="file"]');
  if (label) label.textContent = 'PDF de la providencia (opcional; se guarda de forma privada en la nube)';
}

ensureAuthControls();
removeDuplicateLoginButtons();
new MutationObserver(() => { removeDuplicateLoginButtons(); ensureAuthControls(); }).observe(document.documentElement, { childList: true, subtree: true });
onAuthStateChanged(auth, renderAuth);

window.addEventListener('submit', async event => {
  if (event.target?.id !== 'record-form') return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const user = auth.currentUser;
  if (!user) { showMessage('Inicia sesión con Google para guardar una ficha.', 'error'); return; }

  const form = event.target;
  const data = {};
  form.querySelectorAll('[data-key]').forEach(element => { data[element.dataset.key] = element.value.trim(); });
  if (!data.citation || !data.thesis) { showMessage('Completa el radicado y la tesis jurisprudencial.', 'error'); return; }

  const file = document.querySelector('#file')?.files?.[0] || null;
  const button = document.querySelector('#save-button');
  if (button) button.disabled = true;
  try {
    showMessage(file ? 'Subiendo ficha y PDF a la nube…' : 'Guardando ficha en la nube…', 'success');
    await saveCloudRecord({ ...data, id: crypto.randomUUID(), file, fileName: file?.name || '' }, user);
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
  if (!user) return;
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
  if (!user) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const recordId = button.dataset.id;
  const record = (await localRecords()).find(item => item.id === recordId);
  if (!record || !confirm(`¿Eliminar la ficha “${record.citation || ''}” y su PDF de todos tus dispositivos?`)) return;
  try {
    await deleteDoc(doc(db, 'provenance', recordId));
    if (record.filePath) {
      try { await deleteObject(ref(storage, record.filePath)); }
      catch (error) { console.warn('No se pudo eliminar el PDF de Storage:', error); }
    }
    await removeLocal(recordId);
    window.location.reload();
  } catch (error) {
    showMessage(`No se pudo eliminar la ficha: ${error.message}`, 'error');
  }
}, true);
