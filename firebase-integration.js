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
let activeUser = null;
let activeView = 'dashboard';
let cardFilterObserver;

// Fail closed during Firebase's first auth-state check; private content must not flash publicly.
document.body.classList.add('auth-pending');

function installExperienceStyles() {
  if (document.getElementById('iurisprudencia-experience-styles')) return;
  const style = document.createElement('style');
  style.id = 'iurisprudencia-experience-styles';
  style.textContent = `
    body.auth-pending main, body.auth-pending footer, body.auth-public main, body.auth-public footer { display:none !important; }
    body.auth-public #public-landing { display:block; }
    body.auth-pending #public-landing { display:none; }
    #public-landing { display:none; color:#f7f4ee; background:#17283c; }
    body.auth-public .navlinks > a, body.auth-public .navlinks > button[data-view] { display:none !important; }
    .landing-hero { padding:clamp(64px,9vw,112px) 24px 78px; background:radial-gradient(ellipse at 82% 18%,#526a76 0,transparent 34%),linear-gradient(130deg,#17283c,#263d51 60%,#344b55); }
    .landing-inner { width:min(1120px,100%); margin:auto; }
    .landing-kicker { color:#d3b875; font-size:12px; font-weight:750; letter-spacing:.16em; text-transform:uppercase; }
    .landing-hero h1 { margin:18px 0 14px; color:#fff; font:600 clamp(42px,7vw,76px)/1.04 Georgia,serif; }
    .landing-lead { max-width:820px; margin:0; color:#f0eadc; font:500 clamp(20px,3vw,29px)/1.45 Georgia,serif; }
    .landing-copy { max-width:760px; margin:22px 0 28px; color:#d2dbe0; font-size:17px; line-height:1.8; }
    .landing-cta { padding:13px 20px; border:1px solid #d5bd80; border-radius:8px; background:#a48648; color:white; font-size:15px; font-weight:650; cursor:pointer; }
    .landing-benefits { padding:68px 24px 76px; background:#f7f5ef; color:#202a38; }
    .landing-benefits h2,.landing-audience h2 { margin:0 0 12px; font:600 clamp(28px,4vw,39px)/1.2 Georgia,serif; }
    .landing-section-copy { max-width:720px; margin:0 0 28px; color:#637080; line-height:1.7; }
    .landing-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:15px; }
    .landing-card { min-height:170px; padding:22px 19px; border:1px solid #e4dfd4; border-radius:12px; background:#fff; }
    .landing-icon { display:block; margin-bottom:18px; font-size:26px; }
    .landing-card h3 { margin:0 0 8px; color:#26384d; font:650 17px/1.35 Georgia,serif; }
    .landing-card p { margin:0; color:#6b7280; font-size:13px; line-height:1.6; }
    .landing-audience { padding:58px 24px 68px; background:#ede9df; color:#202a38; }
    .landing-audience p { max-width:900px; margin:0; color:#596575; font-size:16px; line-height:1.8; }
    .landing-footer { padding:20px; background:#17283c; color:#c4cbd0; text-align:center; font-size:12px; }
    .app-nav { display:flex; flex-wrap:wrap; gap:7px; align-items:center; }
    .app-nav button { border:0; border-radius:7px; padding:10px 13px; color:#334155; background:transparent; font:600 14px inherit; cursor:pointer; }
    .app-nav button:hover,.app-nav button[aria-current="page"] { color:#26384d; background:#f2eee4; }
    #dashboard { padding:34px 0 56px; }
    .dashboard-heading { margin:0 0 8px; color:#202a38; font:600 clamp(30px,4vw,42px)/1.2 Georgia,serif; }
    .dashboard-intro { margin:0 0 28px; color:#687385; line-height:1.7; }
    .dashboard-stats { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px; margin:24px 0 36px; }
    .dashboard-stat { padding:20px 22px; background:#fff; border:1px solid #e6e2d9; border-radius:10px; }
    .dashboard-stat strong { display:block; color:#26384d; font:600 30px/1.2 Georgia,serif; }
    .dashboard-stat span { display:block; margin-top:7px; color:#697586; font-size:13px; }
    .dashboard-columns { display:grid; grid-template-columns:minmax(0,2fr) minmax(230px,1fr); gap:28px; }
    .dashboard-panel { padding:22px 24px; background:#fff; border:1px solid #e6e2d9; border-radius:10px; }
    .dashboard-panel h2 { margin:0 0 18px; color:#26384d; font:600 21px/1.3 Georgia,serif; }
    .dashboard-recent { display:grid; gap:0; }
    .dashboard-record { padding:15px 0; border-top:1px solid #eeeae2; }
    .dashboard-record:first-child { border-top:0; padding-top:0; }
    .dashboard-record strong { display:block; color:#26384d; font:600 17px/1.4 Georgia,serif; }
    .dashboard-record span { display:block; margin-top:5px; color:#78808b; font-size:12px; }
    .dashboard-record p { margin:7px 0 0; color:#596575; font-size:13px; line-height:1.6; }
    .topic-list { display:flex; flex-wrap:wrap; gap:8px; }
    .topic-chip { padding:7px 10px; border-radius:20px; background:#f4f1e9; color:#475467; font-size:12px; }
    .dashboard-actions { display:flex; flex-wrap:wrap; gap:10px; margin-top:26px; }
    .dashboard-actions button,.dashboard-actions a { display:inline-block; padding:11px 15px; border:1px solid #d9d3c7; border-radius:7px; background:#fff; color:#26384d; font-weight:600; text-decoration:none; cursor:pointer; }
    #ia-view,#profile-view { padding:34px 0 55px; }
    .view-intro { max-width:760px; padding:25px; border:1px solid #e6e2d9; border-radius:10px; background:#fff; color:#5f6b7b; line-height:1.8; }
    .library-filters { display:flex; flex-wrap:wrap; gap:10px; margin:18px 0; }
    .library-filters select { min-width:190px; padding:10px 12px; border:1px solid #d9d6ce; border-radius:7px; background:#fff; color:#334155; }
    #cards > .card { margin-bottom:24px; }
    body.consultant #cards button[data-action="edit"], body.consultant #cards button[data-action="delete"] { display:none !important; }
    #cards { gap:42px !important; }
    #cards > .card { overflow:visible !important; border:0 !important; border-top:1px solid #dcd7cb !important; border-radius:0 !important; box-shadow:none !important; background:transparent !important; }
    #cards .case-head { padding:34px clamp(20px,5vw,58px) 28px !important; color:#202a38 !important; background:transparent !important; border-bottom:1px solid #e6e2d9 !important; }
    #cards .case-kicker { color:#8b6f33 !important; font-size:12px !important; letter-spacing:.13em !important; }
    #cards .case-citation { margin:10px 0 22px !important; color:#202a38 !important; font:600 clamp(27px,4vw,38px)/1.2 Georgia,serif !important; }
    #cards .meta-grid { grid-template-columns:repeat(auto-fit,minmax(170px,1fr)) !important; gap:20px 28px !important; }
    #cards .meta-label { color:#82765d !important; font-size:11px !important; letter-spacing:.1em !important; }
    #cards .meta-value { color:#394453 !important; font-size:15px !important; line-height:1.65 !important; }
    #cards .topic-line { margin-top:24px !important; padding-top:19px !important; border-top:1px solid #e6e2d9 !important; }
    #cards .topic-value { color:#26384d !important; font:600 20px/1.45 Georgia,serif !important; }
    #cards .thesis-card { margin:32px clamp(20px,5vw,58px) 28px !important; padding:25px 30px !important; background:#f5f2eb !important; border:0 !important; border-left:4px solid #8b6f33 !important; border-radius:0 8px 8px 0 !important; }
    #cards .thesis-text { color:#26384d !important; font:500 clamp(20px,2.4vw,25px)/1.65 Georgia,serif !important; }
    #cards .problem-feature { margin:0 clamp(20px,5vw,58px) 30px !important; padding:0 0 26px !important; background:transparent !important; border:0 !important; border-bottom:1px solid #e6e2d9 !important; }
    #cards .problem-text { color:#394453 !important; font:400 18px/1.85 Georgia,serif !important; }
    #cards .card-accordions { padding:0 clamp(20px,5vw,58px) 22px !important; }
    #cards .card-accordions details { margin:0 !important; border:0 !important; border-top:1px solid #e6e2d9 !important; border-radius:0 !important; background:transparent !important; }
    #cards .card-accordions summary { padding:19px 2px !important; color:#26384d !important; font:600 19px/1.4 Georgia,serif !important; }
    #cards .accordion-content { padding:0 4px 24px 38px !important; color:#394453 !important; font:400 16px/1.85 Georgia,serif !important; white-space:pre-wrap !important; }
    #cards .rule-list { gap:0 !important; margin:4px 0 0 !important; padding:0 !important; list-style:none !important; counter-reset:study-rule !important; }
    #cards .rule-list li { position:relative !important; margin:0 !important; padding:13px 0 13px 39px !important; border:0 !important; border-bottom:1px solid #ece8df !important; border-radius:0 !important; background:transparent !important; color:#303b49 !important; font:400 16px/1.8 Georgia,serif !important; counter-increment:study-rule !important; }
    #cards .rule-list li::before { content:counter(study-rule) !important; position:absolute !important; left:0 !important; top:14px !important; color:#8b6f33 !important; font:700 14px/1.6 Georgia,serif !important; }
    @media(max-width:850px) { .landing-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } .dashboard-columns { grid-template-columns:1fr; } }
    @media(max-width:600px) { .landing-grid,.dashboard-stats { grid-template-columns:1fr; } .landing-hero,.landing-benefits,.landing-audience { padding-left:20px; padding-right:20px; } #cards .case-head { padding:25px 20px 22px !important; } #cards .thesis-card { margin:24px 20px !important; padding:21px 22px !important; } #cards .problem-feature { margin-right:20px !important; margin-left:20px !important; } #cards .card-accordions { padding-right:20px !important; padding-left:20px !important; } #cards .accordion-content { padding-left:8px !important; } }
  `;
  document.head.append(style);
}

function installLanding() {
  if (document.getElementById('public-landing')) return;
  const landing = document.createElement('div');
  landing.id = 'public-landing';
  landing.innerHTML = `<section class="landing-hero"><div class="landing-inner"><span class="landing-kicker">Biblioteca personal · Jurisprudencia penal colombiana</span><h1>IURISPRUDENTIA</h1><p class="landing-lead">La biblioteca jurisprudencial inteligente para estudiar, organizar y consultar la jurisprudencia penal colombiana.</p><p class="landing-copy">Construya su propio repositorio de decisiones judiciales, clasifique providencias por tema, identifique reglas jurisprudenciales y encuentre precedentes con una búsqueda diseñada para el lenguaje jurídico.</p><button id="landing-login" class="landing-cta" type="button">Iniciar sesión con Google&nbsp; →</button></div></section><section class="landing-benefits"><div class="landing-inner"><h2>Una biblioteca jurídica para su trabajo diario</h2><p class="landing-section-copy">Conserve el conocimiento jurisprudencial en un repositorio propio, organizado y fácil de consultar.</p><div class="landing-grid"><article class="landing-card"><span class="landing-icon">📚</span><h3>Organice providencias</h3><p>Clasifique sentencias y autos por tema, radicado y corporación.</p></article><article class="landing-card"><span class="landing-icon">⚖️</span><h3>Identifique reglas</h3><p>Registre problemas jurídicos, tesis, fundamentos y reglas jurisprudenciales.</p></article><article class="landing-card"><span class="landing-icon">🔎</span><h3>Búsqueda inteligente</h3><p>Localice precedentes y fichas con términos jurídicos y palabras clave.</p></article><article class="landing-card"><span class="landing-icon">☁️</span><h3>Su biblioteca, en sus equipos</h3><p>Acceda a sus fichas desde cualquier dispositivo al iniciar sesión.</p></article></div></div></section><section class="landing-audience"><div class="landing-inner"><h2>Conocimiento jurisprudencial, mejor organizado</h2><p>IURISPRUDENTIA está pensada para jueces, empleados judiciales, litigantes e investigadores que necesitan estudiar precedentes, construir repositorios temáticos y volver rápidamente a las decisiones relevantes. Cada ficha ayuda a convertir la lectura de providencias en una herramienta de consulta útil.</p></div></section><div class="landing-footer">IURISPRUDENTIA · Biblioteca jurisprudencial</div>`;
  document.querySelector('header')?.after(landing);
  landing.querySelector('#landing-login')?.addEventListener('click', login);
}

function installAppViews() {
  const main = document.querySelector('main');
  const nav = document.querySelector('.navlinks');
  if (!main || !nav) return;
  const dashboard = document.createElement('section');
  dashboard.id = 'dashboard';
  dashboard.className = 'container';
  dashboard.hidden = true;
  dashboard.innerHTML = `<h1 class="dashboard-heading">Mi biblioteca</h1><p class="dashboard-intro" id="dashboard-greeting">Resumen de sus providencias y actividad reciente.</p><div class="dashboard-stats" id="dashboard-stats"></div><div class="dashboard-columns"><section class="dashboard-panel"><h2>Últimas providencias agregadas</h2><div class="dashboard-recent" id="dashboard-recent"></div></section><section class="dashboard-panel"><h2>Temas frecuentes</h2><div class="topic-list" id="dashboard-topics"></div><div class="dashboard-actions"><button type="button" data-open-view="library">Ir a la biblioteca</button></div></section></div>`;
  main.prepend(dashboard);

  const ai = document.createElement('section');
  ai.id = 'ia-view'; ai.className = 'container'; ai.hidden = true;
  ai.innerHTML = `<h1 class="dashboard-heading">Consultar IA</h1><p class="dashboard-intro">Consulta asistida sobre el contenido de su biblioteca.</p><div class="view-intro"><strong>Este espacio está preparado para la consulta jurídica con IA.</strong><br>El chat aún no está conectado a un servicio de inteligencia artificial. Por ahora, utilice el buscador de la biblioteca para localizar providencias y reglas jurisprudenciales.</div><div class="dashboard-actions"><button type="button" data-open-view="library">Buscar en la biblioteca</button></div>`;
  main.append(ai);

  const profile = document.createElement('section');
  profile.id = 'profile-view'; profile.className = 'container'; profile.hidden = true;
  profile.innerHTML = `<h1 class="dashboard-heading">Mi perfil</h1><p class="dashboard-intro">Información de la cuenta activa.</p><div class="view-intro" id="profile-details"></div>`;
  main.append(profile);

  nav.replaceChildren();
  nav.classList.add('app-nav');
  const views = [
    ['dashboard', 'Inicio'], ['library', 'Biblioteca'], ['register', 'Registrar providencia'], ['ai', 'Consultar IA'], ['profile', 'Mi perfil']
  ];
  for (const [view, label] of views) {
    const button = document.createElement('button');
    button.type = 'button'; button.dataset.view = view; button.textContent = label;
    button.addEventListener('click', () => setView(view));
    nav.append(button);
  }
  const filters = document.createElement('div');
  filters.className = 'library-filters'; filters.id = 'library-filters';
  filters.innerHTML = `<select id="filter-topic" aria-label="Filtrar por tema"><option value="">Todos los temas</option></select><select id="filter-corporation" aria-label="Filtrar por corporación"><option value="">Todas las corporaciones</option></select>`;
  const library = document.querySelector('#biblioteca');
  const search = document.querySelector('#search');
  if (library && search) search.before(filters);
  filters.addEventListener('change', applyCardFilters);
  document.querySelector('[data-open-view="library"]')?.addEventListener('click', () => setView('library'));
  document.querySelectorAll('[data-open-view="library"]').forEach(button => button.addEventListener('click', () => setView('library')));
  cardFilterObserver = new MutationObserver(applyCardFilters);
  const cards = document.querySelector('#cards');
  if (cards) cardFilterObserver.observe(cards, { childList: true, subtree: false });

  document.querySelector('#inicio')?.setAttribute('hidden', '');
  document.querySelector('#registro')?.setAttribute('hidden', '');
  document.querySelector('#biblioteca')?.setAttribute('hidden', '');
}

function setView(view) {
  activeView = view;
  const ids = { dashboard: '#dashboard', library: '#biblioteca', register: '#registro', ai: '#ia-view', profile: '#profile-view' };
  for (const selector of Object.values(ids)) {
    const element = document.querySelector(selector);
    if (element) element.hidden = true;
  }
  const selected = document.querySelector(ids[view] || ids.dashboard);
  if (selected) selected.hidden = false;
  document.querySelectorAll('.app-nav [data-view]').forEach(button => {
    if (button.dataset.view === view) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  if (view === 'dashboard') refreshDashboard();
  if (view === 'library' && typeof window.loadRecords === 'function') window.loadRecords();
  if (view === 'profile') renderProfile();
  history.replaceState(null, '', `#${view}`);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
}

async function refreshDashboard() {
  if (!activeUser) return;
  try {
    const records = await getLocalRecords();
    records.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    const topicCounts = new Map();
    records.forEach(record => {
      const topic = String(record.topic || '').trim();
      if (topic) topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
    });
    const topics = [...topicCounts].sort((a, b) => b[1] - a[1]);
    const stats = document.querySelector('#dashboard-stats');
    if (stats) stats.innerHTML = `<div class="dashboard-stat"><strong>${records.length}</strong><span>Providencias en su biblioteca</span></div><div class="dashboard-stat"><strong>${topics.length}</strong><span>Temas clasificados</span></div><div class="dashboard-stat"><strong>${records.filter(record => record.filePath || record.file instanceof Blob).length}</strong><span>Documentos asociados</span></div>`;
    const recent = document.querySelector('#dashboard-recent');
    if (recent) recent.innerHTML = records.slice(0, 5).map(record => `<article class="dashboard-record"><strong>${escapeHtml(record.citation || 'Providencia sin radicado')}</strong><span>${escapeHtml([record.corporation, record.decisionDate].filter(Boolean).join(' · ') || 'Fecha o corporación no registrada')}</span><p>${escapeHtml(record.thesis || record.topic || 'Sin tesis registrada')}</p></article>`).join('') || '<p class="hint">Todavía no hay providencias guardadas en este navegador. Abra la Biblioteca para sincronizar o registre una providencia.</p>';
    const topicList = document.querySelector('#dashboard-topics');
    if (topicList) topicList.innerHTML = topics.slice(0, 8).map(([topic, count]) => `<span class="topic-chip">${escapeHtml(topic)} · ${count}</span>`).join('') || '<span class="hint">Aún no hay temas clasificados.</span>';
  } catch (error) { console.warn('No se pudo actualizar el panel:', error); }
}

function renderProfile() {
  const user = activeUser;
  const details = document.querySelector('#profile-details');
  if (!details || !user) return;
  details.innerHTML = `<strong>Cuenta:</strong> ${escapeHtml(user.displayName || 'Usuario')}<br><strong>Correo:</strong> ${escapeHtml(user.email || 'No disponible')}<br><strong>Proveedor:</strong> Google`;
}

async function refreshFilterOptions() {
  const topicSelect = document.querySelector('#filter-topic');
  const corporationSelect = document.querySelector('#filter-corporation');
  if (!topicSelect || !corporationSelect) return;
  const previousTopic = topicSelect.value, previousCorporation = corporationSelect.value;
  try {
    const records = await getLocalRecords();
    const topics = [...new Set(records.map(item => String(item.topic || '').trim()).filter(Boolean))].sort((a,b) => a.localeCompare(b, 'es'));
    const corps = [...new Set(records.map(item => String(item.corporation || '').trim()).filter(Boolean))].sort((a,b) => a.localeCompare(b, 'es'));
    topicSelect.innerHTML = '<option value="">Todos los temas</option>' + topics.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('');
    corporationSelect.innerHTML = '<option value="">Todas las corporaciones</option>' + corps.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('');
    topicSelect.value = previousTopic; corporationSelect.value = previousCorporation;
  } catch (error) { console.warn('No se pudieron cargar filtros:', error); }
}

function applyCardFilters() {
  const topic = (document.querySelector('#filter-topic')?.value || '').toLocaleLowerCase('es');
  const corporation = (document.querySelector('#filter-corporation')?.value || '').toLocaleLowerCase('es');
  document.querySelectorAll('#cards > .card').forEach(card => {
    const text = card.textContent.toLocaleLowerCase('es');
    card.hidden = Boolean((topic && !text.includes(topic)) || (corporation && !text.includes(corporation)));
  });
}

function showMessage(text, kind = 'success') {
  const message = document.querySelector('#form-message');
  if (message) { message.className = `message ${kind}`; message.textContent = text; }
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: 'id' }); };
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
    transaction.onerror = () => { database.close(); reject(transaction.error); };
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

function fieldData(record) { return Object.fromEntries(FIELDS.map(field => [field, String(record[field] ?? '')])); }

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
  const data = { ...fieldData(record), id, fileName: filePath ? (record.fileName || `${record.citation || 'providencia'}.pdf`) : '', filePath, ownerUid: user.uid, ownerEmail: user.email, createdAt: record.createdAt || serverTimestamp(), updatedAt: serverTimestamp() };
  await setDoc(doc(db, 'provenance', id), data);
  return { ...data, id, createdAt: new Date().toISOString(), file: record.file || null };
}

async function syncLibrary(user) {
  if (syncing) return;
  syncing = true;
  try {
    const snapshot = await getDocs(query(collection(db, 'provenance'), where('ownerUid', '==', user.uid)));
    const local = await getLocalRecords();
    const localById = new Map(local.map(record => [record.id, record]));
    for (const item of snapshot.docs) {
      const data = item.data(), old = localById.get(item.id);
      let file = old?.file || null;
      if (data.filePath && (!file || old?.filePath !== data.filePath)) {
        try { file = await getBlob(ref(storage, data.filePath)); } catch (error) { console.warn('PDF no disponible:', error); }
      }
      const createdAt = data.createdAt?.toDate?.()?.toISOString?.() || data.createdAt || new Date().toISOString();
      await putLocal({ ...data, id: item.id, createdAt, file, fileName: data.fileName || '' });
    }
    if (typeof window.loadRecords === 'function') await window.loadRecords();
    await refreshDashboard(); await refreshFilterOptions(); applyCardFilters();
    showMessage('Biblioteca sincronizada con tu cuenta de Google.', 'success');
  } catch (error) { showMessage(`No se pudo sincronizar la biblioteca: ${error.message}`, 'error'); }
  finally { syncing = false; }
}

async function login() {
  try { await signInWithPopup(auth, provider); }
  catch (error) { alert(`No se pudo iniciar sesión: ${error.message}`); }
}

function renderAuth(user) {
  activeUser = user;
  const nav = document.querySelector('.navlinks');
  if (!nav) return;
  let controls = document.querySelector('#firebase-owner-controls');
  if (!controls) { controls = document.createElement('span'); controls.id = 'firebase-owner-controls'; nav.append(controls); }
  if (controls.parentElement !== nav) nav.append(controls);
  controls.style.cssText = 'display:inline-flex;align-items:center;gap:8px;margin-left:12px;white-space:nowrap';
  controls.replaceChildren();
  document.body.classList.remove('auth-pending', 'auth-public', 'consultant');
  document.body.classList.toggle('auth-user', Boolean(user));
  const main = document.querySelector('main');

  if (user) {
    const admin = user.email?.toLowerCase() === OWNER_EMAIL;
    document.body.classList.toggle('consultant', !admin);
    const identity = document.createElement('span'); identity.className = 'hint'; identity.textContent = user.displayName || user.email || 'Usuario conectado';
    const logout = document.createElement('button'); logout.type = 'button'; logout.className = 'btn secondary'; logout.textContent = 'Cerrar sesión';
    logout.addEventListener('click', async () => { await signOut(auth); window.location.assign('./'); });
    controls.append(identity, logout);
    if (main) main.style.display = '';
    const registerNav = nav.querySelector('[data-view="register"]');
    if (registerNav) registerNav.hidden = !admin;
    document.querySelectorAll('#record-form input, #record-form textarea, #record-form select').forEach(element => { if (element.id !== 'file') element.disabled = !admin; });
    const saveButton = document.querySelector('#save-button'); if (saveButton) saveButton.disabled = !admin;
    if (!admin && activeView === 'register') setView('dashboard');
    setView(activeView || 'dashboard');
    syncLibrary(user);
  } else {
    document.body.classList.add('auth-public');
    if (main) main.style.display = 'none';
    const button = document.createElement('button'); button.type = 'button'; button.className = 'btn'; button.textContent = 'Iniciar sesión con Google'; button.addEventListener('click', login);
    controls.append(button);
  }
}

installExperienceStyles();
installLanding();
installAppViews();
onAuthStateChanged(auth, renderAuth);

const fileInput = document.querySelector('#file');
if (fileInput) { fileInput.required = false; const label = document.querySelector('label[for="file"]'); if (label) label.textContent = 'PDF de la providencia (opcional; se guarda en la nube)'; }

window.addEventListener('submit', async event => {
  if (event.target?.id !== 'record-form') return;
  event.preventDefault(); event.stopImmediatePropagation();
  const user = auth.currentUser;
  if (!user || user.email?.toLowerCase() !== OWNER_EMAIL) { showMessage('Inicia sesión con la cuenta autorizada para guardar una ficha.', 'error'); return; }
  const form = event.target, data = {};
  form.querySelectorAll('[data-key]').forEach(element => { data[element.dataset.key] = element.value.trim(); });
  if (!data.citation || !data.thesis) { showMessage('Completa el radicado y la tesis jurisprudencial.', 'error'); return; }
  const file = document.querySelector('#file')?.files?.[0] || null, button = document.querySelector('#save-button');
  if (button) button.disabled = true;
  try {
    showMessage(file ? 'Subiendo ficha y PDF…' : 'Guardando ficha…', 'success');
    const saved = await saveCloud({ ...data, id: crypto.randomUUID(), file, fileName: file?.name || '' }, user);
    await putLocal(saved); showMessage('Ficha y documento guardados en la nube.', 'success'); form.reset();
    if (typeof window.loadRecords === 'function') await window.loadRecords();
    await refreshDashboard(); await refreshFilterOptions(); applyCardFilters(); setView('library');
  } catch (error) { showMessage(`No se pudo guardar en la nube: ${error.message}`, 'error'); }
  finally { if (button) button.disabled = false; }
}, true);

window.addEventListener('submit', async event => {
  if (event.target?.id !== 'edit-form') return;
  event.preventDefault(); event.stopImmediatePropagation();
  const user = auth.currentUser; if (!user || user.email?.toLowerCase() !== OWNER_EMAIL) return;
  const id = document.querySelector('#edit-id')?.value, old = (await getLocalRecords()).find(record => record.id === id); if (!old) return;
  const data = { ...old }; event.target.querySelectorAll('[data-key]').forEach(element => { data[element.dataset.key] = element.value.trim(); });
  try { const saved = await saveCloud(data, user); await putLocal(saved); if (typeof window.loadRecords === 'function') await window.loadRecords(); await refreshDashboard(); }
  catch (error) { const message = document.querySelector('#edit-message'); if (message) { message.className = 'message error'; message.textContent = error.message; } }
}, true);

window.addEventListener('click', async event => {
  const button = event.target.closest('button[data-action="delete"]'); if (!button) return;
  const user = auth.currentUser; if (!user || user.email?.toLowerCase() !== OWNER_EMAIL) return;
  event.preventDefault(); event.stopImmediatePropagation();
  const record = (await getLocalRecords()).find(item => item.id === button.dataset.id);
  if (!record || !confirm(`¿Eliminar la ficha “${record.citation || ''}” y su PDF?`)) return;
  try {
    await deleteDoc(doc(db, 'provenance', record.id));
    if (record.filePath) { try { await deleteObject(ref(storage, record.filePath)); } catch (error) { console.warn(error); } }
    await deleteLocal(record.id); if (typeof window.loadRecords === 'function') await window.loadRecords(); await refreshDashboard(); await refreshFilterOptions();
  } catch (error) { showMessage(`No se pudo eliminar la ficha: ${error.message}`, 'error'); }
}, true);
