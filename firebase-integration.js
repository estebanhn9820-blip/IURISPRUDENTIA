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

document.body.classList.add('auth-pending');

function installStyles() {
  if (document.getElementById('iurisprudencia-dashboard-styles')) return;
  const style = document.createElement('style');
  style.id = 'iurisprudencia-dashboard-styles';
  style.textContent = `
    body.auth-pending main,body.auth-pending footer,body.auth-public main,body.auth-public footer{display:none!important}
    body.auth-pending #public-landing{display:none}body.auth-public #public-landing{display:block}
    #public-landing{display:none;color:#f7f4ee;background:#17283c}
    body.auth-public .navlinks>a,body.auth-public .navlinks>[data-view]{display:none!important}
    .landing-hero{padding:clamp(64px,9vw,112px) 24px 78px;background:radial-gradient(ellipse at 82% 18%,#526a76 0,transparent 34%),linear-gradient(130deg,#17283c,#263d51 60%,#344b55)}
    .landing-inner{width:min(1120px,100%);margin:auto}.landing-kicker{color:#d3b875;font-size:12px;font-weight:750;letter-spacing:.16em;text-transform:uppercase}
    .landing-hero h1{margin:18px 0 14px;color:#fff;font:600 clamp(42px,7vw,76px)/1.04 Georgia,serif}
    .landing-lead{max-width:820px;margin:0;color:#f0eadc;font:500 clamp(20px,3vw,29px)/1.45 Georgia,serif}
    .landing-copy{max-width:760px;margin:22px 0 28px;color:#d2dbe0;font-size:17px;line-height:1.8}
    .landing-cta{padding:13px 20px;border:1px solid #d5bd80;border-radius:8px;background:#a48648;color:#fff;font-size:15px;font-weight:650;cursor:pointer}
    .landing-benefits{padding:68px 24px 76px;background:#f7f5ef;color:#202a38}.landing-benefits h2,.landing-audience h2{margin:0 0 12px;font:600 clamp(28px,4vw,39px)/1.2 Georgia,serif}
    .landing-section-copy{max-width:720px;margin:0 0 28px;color:#637080;line-height:1.7}.landing-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:15px}
    .landing-card{min-height:170px;padding:22px 19px;border:1px solid #e4dfd4;border-radius:12px;background:#fff}.landing-icon{display:block;margin-bottom:18px;font-size:26px}
    .landing-card h3{margin:0 0 8px;color:#26384d;font:650 17px/1.35 Georgia,serif}.landing-card p{margin:0;color:#6b7280;font-size:13px;line-height:1.6}
    .landing-audience{padding:58px 24px 68px;background:#ede9df;color:#202a38}.landing-audience p{max-width:900px;margin:0;color:#596575;font-size:16px;line-height:1.8}
    .landing-footer{padding:20px;background:#17283c;color:#c4cbd0;text-align:center;font-size:12px}
    .app-nav{display:flex;flex-wrap:wrap;gap:6px;align-items:center}.app-nav button{border:0;border-radius:7px;padding:10px 13px;color:#334155;background:transparent;font:600 14px Arial,sans-serif;cursor:pointer}
    .app-nav button:hover,.app-nav button[aria-current=page]{color:#26384d;background:#f2eee4}
    #dashboard{padding:30px 0 56px}.dashboard-title{margin:0;color:#202a38;font:600 clamp(30px,4vw,42px)/1.2 Georgia,serif}
    .dashboard-intro{margin:8px 0 22px;color:#687385;line-height:1.7}
    .dashboard-search{display:flex;gap:10px;margin:20px 0 34px;padding:10px;background:#fff;border:1px solid #ddd7ca;border-radius:12px;box-shadow:0 9px 28px #202a380b}
    .dashboard-search input{flex:1;min-width:0;padding:13px 14px;border:0;outline:0;color:#26384d;font-size:16px;background:transparent}
    .dashboard-search button{padding:0 20px;border:0;border-radius:8px;background:#26384d;color:white;font-weight:650;cursor:pointer}
    .dashboard-section{margin:0 0 30px}.dashboard-section-head{display:flex;align-items:end;justify-content:space-between;gap:14px;margin-bottom:14px}
    .dashboard-section h2{margin:0;color:#26384d;font:600 23px/1.3 Georgia,serif}.dashboard-section-head button{border:0;background:transparent;color:#80652e;font-weight:650;cursor:pointer}
    .dashboard-layout{display:grid;grid-template-columns:minmax(0,1.8fr) minmax(260px,1fr);gap:22px}
    .dashboard-panel{padding:22px 24px;border:1px solid #e6e2d9;border-radius:11px;background:#fff}
    .dashboard-panel h2{margin:0 0 17px;color:#26384d;font:600 20px/1.3 Georgia,serif}
    .recent-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}
    .recent-card{display:flex;flex-direction:column;min-height:235px;padding:19px;border:1px solid #ece8df;border-radius:9px;background:#fff}
    .recent-card .record-date{color:#8b6f33;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
    .recent-card h3{margin:9px 0 6px;color:#26384d;font:600 19px/1.35 Georgia,serif}.recent-card .record-topic{margin:0 0 12px;color:#80652e;font-size:13px;font-weight:650}
    .recent-card .record-problem{margin:0 0 9px;color:#596575;font-size:13px;line-height:1.55}.recent-card .record-thesis{display:-webkit-box;overflow:hidden;-webkit-line-clamp:3;-webkit-box-orient:vertical;margin:0 0 15px;color:#354254;font:15px/1.65 Georgia,serif}
    .recent-card button{align-self:flex-start;margin-top:auto;padding:8px 11px;border:1px solid #ddd7ca;border-radius:6px;background:#faf8f3;color:#26384d;font-weight:650;cursor:pointer}
    .topic-cloud{display:flex;flex-wrap:wrap;gap:9px}.topic-chip{padding:9px 12px;border:1px solid #e5dfd3;border-radius:22px;background:#faf8f3;color:#465365;font-size:13px;cursor:pointer}
    .topic-chip:hover,.topic-chip.active{border-color:#b8a36f;background:#f3eddd;color:#26384d}.topic-count{margin-left:5px;color:#8b6f33;font-weight:700}
    .topic-subheading{margin:17px 0 10px;color:#687385;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
    .activity-list{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:13px}.activity-item{padding:16px 18px;border-left:3px solid #b49a5e;background:#fff;border-radius:0 8px 8px 0}
    .activity-item strong{display:block;color:#26384d;font:600 16px/1.4 Georgia,serif}.activity-item span{display:block;margin-top:5px;color:#78808b;font-size:12px}.activity-item p{margin:8px 0 0;color:#596575;font-size:13px;line-height:1.55}
    .empty-state{grid-column:1/-1;padding:24px;border:1px dashed #d9d3c7;border-radius:9px;color:#687385;background:#fff;line-height:1.7}
    .library-filters{display:flex;flex-wrap:wrap;gap:10px;margin:18px 0}.library-filters select{min-width:190px;padding:10px 12px;border:1px solid #d9d6ce;border-radius:7px;background:#fff;color:#334155}
    #ia-view,#profile-view{padding:34px 0 55px}.view-intro{max-width:760px;padding:25px;border:1px solid #e6e2d9;border-radius:10px;background:#fff;color:#5f6b7b;line-height:1.8}
    body.consultant #cards button[data-action=edit],body.consultant #cards button[data-action=delete]{display:none!important}
    #cards{gap:42px!important}#cards>.card{overflow:visible!important;margin-bottom:24px;border:0!important;border-top:1px solid #dcd7cb!important;border-radius:0!important;box-shadow:none!important;background:transparent!important}
    #cards .case-head{padding:34px clamp(20px,5vw,58px) 28px!important;color:#202a38!important;background:transparent!important;border-bottom:1px solid #e6e2d9!important}
    #cards .case-kicker{color:#8b6f33!important;font-size:12px!important;letter-spacing:.13em!important}#cards .case-citation{margin:10px 0 22px!important;color:#202a38!important;font:600 clamp(27px,4vw,38px)/1.2 Georgia,serif!important}
    #cards .meta-grid{grid-template-columns:repeat(auto-fit,minmax(170px,1fr))!important;gap:20px 28px!important}#cards .meta-label{color:#82765d!important;font-size:11px!important;letter-spacing:.1em!important}
    #cards .meta-value{color:#394453!important;font-size:15px!important;line-height:1.65!important}#cards .topic-line{margin-top:24px!important;padding-top:19px!important;border-top:1px solid #e6e2d9!important}
    #cards .topic-value{color:#26384d!important;font:600 20px/1.45 Georgia,serif!important}#cards .thesis-card{margin:32px clamp(20px,5vw,58px) 28px!important;padding:25px 30px!important;background:#f5f2eb!important;border:0!important;border-left:4px solid #8b6f33!important;border-radius:0 8px 8px 0!important}
    #cards .thesis-text{color:#26384d!important;font:500 clamp(20px,2.4vw,25px)/1.65 Georgia,serif!important}#cards .problem-feature{margin:0 clamp(20px,5vw,58px) 30px!important;padding:0 0 26px!important;background:transparent!important;border:0!important;border-bottom:1px solid #e6e2d9!important}
    #cards .problem-text{color:#394453!important;font:400 18px/1.85 Georgia,serif!important}#cards .card-accordions{padding:0 clamp(20px,5vw,58px) 22px!important}
    #cards .card-accordions details{margin:0!important;border:0!important;border-top:1px solid #e6e2d9!important;border-radius:0!important;background:transparent!important}#cards .card-accordions summary{padding:19px 2px!important;color:#26384d!important;font:600 19px/1.4 Georgia,serif!important}
    #cards .accordion-content{padding:0 4px 24px 38px!important;color:#394453!important;font:400 16px/1.85 Georgia,serif!important;white-space:normal!important}
    #cards .rule-list{list-style:none!important;counter-reset:juris-rule!important;margin:8px 0 0!important;padding:0!important}
    #cards .rule-list li{position:relative!important;margin:0 0 18px!important;padding:0 0 0 42px!important;border:0!important;border-radius:0!important;background:transparent!important;color:#303b49!important;font:400 16px/1.75 Georgia,serif!important;counter-increment:juris-rule!important;white-space:normal!important;overflow-wrap:anywhere!important}
    #cards .rule-list li:before{content:counter(juris-rule) "."!important;position:absolute!important;left:0!important;top:0!important;color:#8b6f33!important;font:700 17px/1.75 Georgia,serif!important}
    @media(max-width:850px){.landing-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.dashboard-layout{grid-template-columns:1fr}.activity-list{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(max-width:600px){.landing-grid,.recent-grid,.activity-list{grid-template-columns:1fr}.landing-hero,.landing-benefits,.landing-audience{padding-left:20px;padding-right:20px}.dashboard-search{flex-direction:column}.dashboard-search button{padding:13px}.dashboard-panel{padding:18px}.dashboard-section-head{align-items:flex-start}#cards .case-head{padding:25px 20px 22px!important}#cards .thesis-card{margin:24px 20px!important;padding:21px 22px!important}#cards .problem-feature{margin-right:20px!important;margin-left:20px!important}#cards .card-accordions{padding-right:20px!important;padding-left:20px!important}#cards .accordion-content{padding-left:8px!important}}
  `;
  document.head.append(style);
}

function login() { signInWithPopup(auth, provider).catch(error => alert(`No se pudo iniciar sesión: ${error.message}`)); }

function installLanding() {
  if (document.getElementById('public-landing')) return;
  const landing = document.createElement('div');
  landing.id = 'public-landing';
  landing.innerHTML = `<section class="landing-hero"><div class="landing-inner"><span class="landing-kicker">Biblioteca personal · Jurisprudencia penal colombiana</span><h1>IURISPRUDENTIA</h1><p class="landing-lead">La biblioteca jurisprudencial inteligente para estudiar, organizar y consultar la jurisprudencia penal colombiana.</p><p class="landing-copy">Construya su propio repositorio de decisiones judiciales, clasifique providencias por tema, identifique reglas jurisprudenciales y encuentre precedentes con una búsqueda diseñada para el lenguaje jurídico.</p><button id="landing-login" class="landing-cta" type="button">Iniciar sesión con Google&nbsp; →</button></div></section><section class="landing-benefits"><div class="landing-inner"><h2>Una biblioteca jurídica para su trabajo diario</h2><p class="landing-section-copy">Conserve el conocimiento jurisprudencial en un repositorio propio, organizado y fácil de consultar.</p><div class="landing-grid"><article class="landing-card"><span class="landing-icon">📚</span><h3>Organice providencias</h3><p>Clasifique sentencias y autos por tema, radicado y corporación.</p></article><article class="landing-card"><span class="landing-icon">⚖️</span><h3>Identifique reglas</h3><p>Registre problemas jurídicos, tesis, fundamentos y reglas jurisprudenciales.</p></article><article class="landing-card"><span class="landing-icon">🔎</span><h3>Búsqueda inteligente</h3><p>Localice precedentes y fichas con términos jurídicos y palabras clave.</p></article><article class="landing-card"><span class="landing-icon">☁️</span><h3>Su biblioteca, en sus equipos</h3><p>Acceda a sus fichas desde cualquier dispositivo al iniciar sesión.</p></article></div></div></section><section class="landing-audience"><div class="landing-inner"><h2>Conocimiento jurisprudencial, mejor organizado</h2><p>IURISPRUDENTIA está pensada para jueces, empleados judiciales, litigantes e investigadores que necesitan estudiar precedentes, construir repositorios temáticos y volver rápidamente a las decisiones relevantes.</p></div></section><div class="landing-footer">IURISPRUDENTIA · Biblioteca jurisprudencial</div>`;
  document.querySelector('header')?.after(landing);
  landing.querySelector('#landing-login')?.addEventListener('click', login);
}

function installNavigation() {
  const nav=document.querySelector('.navlinks'),main=document.querySelector('main');
  if(!nav||!main||document.getElementById('dashboard'))return;
  const dashboard=document.createElement('section');dashboard.id='dashboard';dashboard.className='container';dashboard.hidden=true;
  dashboard.innerHTML=`<header class="dashboard-section-head"><div><span class="landing-kicker">IURISPRUDENTIA · RELATORÍA DIGITAL</span><h1 class="dashboard-title">Biblioteca Jurisprudencial</h1><p class="dashboard-intro">Explore precedentes, estudie reglas y encuentre providencias relevantes para su investigación.</p></div></header><form class="dashboard-search" id="dashboard-search"><input id="dashboard-query" type="search" placeholder="Buscar por tema, radicado, magistrado, delito o palabra clave…" aria-label="Buscar jurisprudencia"><button type="submit">Buscar jurisprudencia</button></form><section class="dashboard-section"><div class="dashboard-section-head"><h2>Jurisprudencia reciente</h2><button type="button" data-open-library>Ver toda la biblioteca →</button></div><div class="recent-grid" id="dashboard-recent"></div></section><div class="dashboard-layout"><section class="dashboard-panel"><h2>Explorar por temas</h2><div class="topic-subheading">Temas de consulta</div><div class="topic-cloud" id="dashboard-topics"></div><div class="topic-subheading">Temas más desarrollados</div><div class="topic-cloud" id="dashboard-developed"></div></section><section class="dashboard-panel"><h2>Actividad reciente</h2><div class="activity-list" id="dashboard-activity"></div></section></div>`;
  main.prepend(dashboard);
  const ai=document.createElement('section');ai.id='ia-view';ai.className='container';ai.hidden=true;ai.innerHTML=`<h1 class="dashboard-title">Consultar IA</h1><p class="dashboard-intro">Consulta asistida sobre el contenido de su biblioteca.</p><div class="view-intro"><strong>El espacio de consulta con IA está preparado, pero el chat aún no está conectado a un servicio de inteligencia artificial.</strong><br>Por ahora, utilice el buscador para localizar providencias, tesis y reglas jurisprudenciales.</div>`;main.append(ai);
  const profile=document.createElement('section');profile.id='profile-view';profile.className='container';profile.hidden=true;profile.innerHTML=`<h1 class="dashboard-title">Mi perfil</h1><p class="dashboard-intro">Información de la cuenta activa.</p><div class="view-intro" id="profile-details"></div>`;main.append(profile);
  nav.replaceChildren();nav.classList.add('app-nav');
  for(const[view,label]of[['dashboard','Inicio'],['library','Biblioteca'],['register','Registrar providencia'],['ai','Consultar IA'],['profile','Mi perfil']]){const button=document.createElement('button');button.type='button';button.dataset.view=view;button.textContent=label;button.addEventListener('click',()=>setView(view));nav.append(button);}
  const library=document.querySelector('#biblioteca');if(library){const filters=document.createElement('div');filters.className='library-filters';filters.id='library-filters';filters.innerHTML='<select id="filter-topic" aria-label="Filtrar por tema"><option value="">Todos los temas</option></select><select id="filter-corporation" aria-label="Filtrar por corporación"><option value="">Todas las corporaciones</option></select>';document.querySelector('#search')?.before(filters);filters.addEventListener('change',applyCardFilters);}
  document.querySelectorAll('#inicio,#registro,#biblioteca').forEach(section=>section.hidden=true);
  document.querySelectorAll('[data-open-library]').forEach(button=>button.addEventListener('click',()=>setView('library')));
  document.querySelector('#dashboard-search')?.addEventListener('submit',event=>{event.preventDefault();const query=document.querySelector('#dashboard-query')?.value.trim();setView('library');const input=document.querySelector('#search');if(input){input.value=query||'';input.dispatchEvent(new Event('input',{bubbles:true}));}});
}

function setView(view){if(view==='register'&&activeUser?.email?.toLowerCase()!==OWNER_EMAIL)view='dashboard';activeView=view;const sections={dashboard:'#dashboard',library:'#biblioteca',register:'#registro',ai:'#ia-view',profile:'#profile-view'};Object.values(sections).forEach(selector=>{const el=document.querySelector(selector);if(el)el.hidden=true;});const selected=document.querySelector(sections[view]||sections.dashboard);if(selected)selected.hidden=false;document.querySelectorAll('.app-nav [data-view]').forEach(button=>button.toggleAttribute('aria-current',button.dataset.view===view));if(view==='dashboard')refreshDashboard();if(view==='library'){refreshFilterOptions();if(typeof window.loadRecords==='function')window.loadRecords();}if(view==='profile')renderProfile();history.replaceState(null,'',`#${view}`);window.scrollTo({top:0,behavior:'smooth'});}

function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
function recordDate(record){const raw=record.decisionDate||record.createdAt||'';if(!raw)return 'Fecha no registrada';const date=new Date(raw);return Number.isNaN(date.getTime())?String(raw):date.toLocaleDateString('es-CO',{year:'numeric',month:'long',day:'numeric'});}

async function refreshDashboard(){if(!activeUser)return;try{const records=await getLocalRecords();records.sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));const grouped=new Map();records.forEach(record=>{const topic=String(record.topic||'').trim();if(topic){const item=grouped.get(topic)||{count:0,depth:0};item.count++;item.depth+=String(record.thesis||'').length+String(record.rules||'').length+String(record.reasoning||'').length;grouped.set(topic,item);}});const topics=[...grouped].sort((a,b)=>b[1].count-a[1].count),developed=[...grouped].sort((a,b)=>b[1].depth-a[1].depth);const recent=document.querySelector('#dashboard-recent');if(recent)recent.innerHTML=records.slice(0,4).map(record=>`<article class="recent-card"><span class="record-date">${escapeHtml(recordDate(record))}</span><h3>${escapeHtml(record.citation||'Providencia sin radicado')}</h3><p class="record-topic">${escapeHtml(record.topic||'Tema no clasificado')}</p><p class="record-problem"><strong>Problema jurídico:</strong> ${escapeHtml(record.legalIssue||'No registrado')}</p><p class="record-thesis">${escapeHtml(record.thesis||'Tesis jurisprudencial no registrada')}</p><button type="button" data-open-record="${escapeHtml(record.id)}">Ver ficha completa</button></article>`).join('')||'<div class="empty-state">Aún no hay providencias para mostrar. Registre una ficha o sincronice su biblioteca.</div>';const topicMarkup=topics.slice(0,12).map(([topic,item])=>`<button class="topic-chip" type="button" data-topic="${escapeHtml(topic)}">${escapeHtml(topic)}<span class="topic-count">${item.count}</span></button>`).join('')||'<span class="empty-state">Los temas aparecerán aquí cuando haya fichas clasificadas.</span>';const topicList=document.querySelector('#dashboard-topics');if(topicList)topicList.innerHTML=topicMarkup;const developedList=document.querySelector('#dashboard-developed');if(developedList)developedList.innerHTML=developed.slice(0,6).map(([topic,item])=>`<button class="topic-chip" type="button" data-topic="${escapeHtml(topic)}">${escapeHtml(topic)}<span class="topic-count">${item.depth?Math.max(1,Math.round(item.depth/1000)):0} pág.</span></button>`).join('')||'<span class="empty-state">Aún no hay temas suficientemente desarrollados.</span>';const activity=document.querySelector('#dashboard-activity');if(activity)activity.innerHTML=records.slice(0,3).map(record=>`<article class="activity-item"><strong>${escapeHtml(record.citation||'Providencia')}</strong><span>Incorporada · ${escapeHtml(recordDate(record))}</span><p>${escapeHtml(record.topic||record.corporation||'Providencia agregada a la biblioteca')}</p></article>`).join('')||'<div class="empty-state">Las últimas incorporaciones aparecerán aquí.</div>';document.querySelectorAll('[data-topic]').forEach(button=>button.addEventListener('click',()=>{setView('library');const search=document.querySelector('#search');if(search){search.value=button.dataset.topic;search.dispatchEvent(new Event('input',{bubbles:true}));}}));document.querySelectorAll('[data-open-record]').forEach(button=>button.addEventListener('click',()=>{const record=records.find(item=>item.id===button.dataset.openRecord);setView('library');const search=document.querySelector('#search');if(search){search.value=record?.citation||'';search.dispatchEvent(new Event('input',{bubbles:true}));}setTimeout(()=>{const card=[...document.querySelectorAll('#cards>.card')].find(item=>item.textContent.includes(record?.citation||'__'));card?.scrollIntoView({behavior:'smooth',block:'start'});},100);}));}catch(error){console.warn(error);}}

async function refreshFilterOptions(){const topicSelect=document.querySelector('#filter-topic'),corporationSelect=document.querySelector('#filter-corporation');if(!topicSelect||!corporationSelect)return;try{const records=await getLocalRecords();const topics=[...new Set(records.map(item=>String(item.topic||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));const corps=[...new Set(records.map(item=>String(item.corporation||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));topicSelect.innerHTML='<option value="">Todos los temas</option>'+topics.map(value=>`<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('');corporationSelect.innerHTML='<option value="">Todas las corporaciones</option>'+corps.map(value=>`<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('');}catch(error){console.warn(error);}}
function applyCardFilters(){const topic=(document.querySelector('#filter-topic')?.value||'').toLocaleLowerCase('es'),corporation=(document.querySelector('#filter-corporation')?.value||'').toLocaleLowerCase('es');document.querySelectorAll('#cards>.card').forEach(card=>{const text=card.textContent.toLocaleLowerCase('es');card.hidden=Boolean((topic&&!text.includes(topic))||(corporation&&!text.includes(corporation)));});}
function renderProfile(){const details=document.querySelector('#profile-details');if(details&&activeUser)details.innerHTML=`<strong>Cuenta:</strong> ${escapeHtml(activeUser.displayName||'Usuario')}<br><strong>Correo:</strong> ${escapeHtml(activeUser.email||'No disponible')}<br><strong>Proveedor:</strong> Google`;} 
function showMessage(text,kind='success'){const message=document.querySelector('#form-message');if(message){message.className=`message ${kind}`;message.textContent=text;}}

function openDatabase(){return new Promise((resolve,reject)=>{const request=indexedDB.open(DB_NAME,1);request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE,{keyPath:'id'});};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
async function getLocalRecords(){const dbLocal=await openDatabase();return new Promise((resolve,reject)=>{const tx=dbLocal.transaction(STORE,'readonly'),request=tx.objectStore(STORE).getAll();request.onsuccess=()=>resolve(request.result||[]);request.onerror=()=>reject(request.error);tx.oncomplete=()=>dbLocal.close();tx.onerror=()=>{dbLocal.close();reject(tx.error);};});}
async function putLocal(record){const dbLocal=await openDatabase();return new Promise((resolve,reject)=>{const tx=dbLocal.transaction(STORE,'readwrite');tx.objectStore(STORE).put(record);tx.oncomplete=()=>{dbLocal.close();resolve();};tx.onerror=()=>{dbLocal.close();reject(tx.error);};});}
async function deleteLocal(id){const dbLocal=await openDatabase();return new Promise((resolve,reject)=>{const tx=dbLocal.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(id);tx.oncomplete=()=>{dbLocal.close();resolve();};tx.onerror=()=>{dbLocal.close();reject(tx.error);};});}
function fieldData(record){return Object.fromEntries(FIELDS.map(field=>[field,String(record[field]??'')]));}
async function uploadPdf(file,user,id){if(!file)return'';if(file.type!=='application/pdf'&&!file.name.toLowerCase().endsWith('.pdf'))throw new Error('El archivo adjunto debe ser un PDF.');if(file.size>25*1024*1024)throw new Error('El PDF supera el límite de 25 MB.');const path=`provenance/${user.uid}/${id}.pdf`;await uploadBytes(ref(storage,path),file,{contentType:'application/pdf'});return path;}
async function saveCloud(record,user){const id=record.id||crypto.randomUUID();let filePath=record.filePath||'';if(record.file instanceof Blob)filePath=await uploadPdf(record.file,user,id);const data={...fieldData(record),id,fileName:filePath?(record.fileName||`${record.citation||'providencia'}.pdf`):'',filePath,ownerUid:user.uid,ownerEmail:user.email,createdAt:record.createdAt||serverTimestamp(),updatedAt:serverTimestamp()};await setDoc(doc(db,'provenance',id),data);return{...data,id,createdAt:new Date().toISOString(),file:record.file||null};}
async function syncLibrary(user){if(syncing)return;syncing=true;try{const snapshot=await getDocs(query(collection(db,'provenance'),where('ownerUid','==',user.uid))),local=await getLocalRecords(),localById=new Map(local.map(record=>[record.id,record]));for(const item of snapshot.docs){const data=item.data(),old=localById.get(item.id);let file=old?.file||null;if(data.filePath&&(!file||old?.filePath!==data.filePath)){try{file=await getBlob(ref(storage,data.filePath));}catch(error){console.warn('PDF no disponible:',error);}}const createdAt=data.createdAt?.toDate?.()?.toISOString?.()||data.createdAt||new Date().toISOString();await putLocal({...data,id:item.id,createdAt,file,fileName:data.fileName||''});}if(typeof window.loadRecords==='function')await window.loadRecords();await refreshDashboard();await refreshFilterOptions();applyCardFilters();showMessage('Biblioteca sincronizada con tu cuenta de Google.','success');}catch(error){showMessage(`No se pudo sincronizar la biblioteca: ${error.message}`,'error');}finally{syncing=false;}}

function renderAuth(user){activeUser=user;const nav=document.querySelector('.navlinks');if(!nav)return;let controls=document.querySelector('#firebase-owner-controls');if(!controls){controls=document.createElement('span');controls.id='firebase-owner-controls';nav.append(controls);}if(controls.parentElement!==nav)nav.append(controls);controls.style.cssText='display:inline-flex;align-items:center;gap:8px;margin-left:12px;white-space:nowrap';controls.replaceChildren();document.body.classList.remove('auth-pending','auth-public','consultant');document.body.classList.toggle('auth-user',Boolean(user));const main=document.querySelector('main');if(user){const admin=user.email?.toLowerCase()===OWNER_EMAIL;document.body.classList.toggle('consultant',!admin);const identity=document.createElement('span');identity.className='hint';identity.textContent=user.displayName||user.email||'Usuario conectado';const logout=document.createElement('button');logout.type='button';logout.className='btn secondary';logout.textContent='Cerrar sesión';logout.addEventListener('click',async()=>{await signOut(auth);window.location.assign('./');});controls.append(identity,logout);if(main)main.style.display='';const register=nav.querySelector('[data-view="register"]');if(register)register.hidden=!admin;document.querySelectorAll('#record-form input,#record-form textarea,#record-form select').forEach(element=>{if(element.id!=='file')element.disabled=!admin;});const save=document.querySelector('#save-button');if(save)save.disabled=!admin;if(!admin&&activeView==='register')activeView='dashboard';setView(activeView||'dashboard');syncLibrary(user);}else{document.body.classList.add('auth-public');if(main)main.style.display='none';const loginButton=document.createElement('button');loginButton.type='button';loginButton.className='btn';loginButton.textContent='Iniciar sesión con Google';loginButton.addEventListener('click',login);controls.append(loginButton);}}

installStyles();installLanding();installNavigation();onAuthStateChanged(auth,renderAuth);
const fileInput=document.querySelector('#file');if(fileInput){fileInput.required=false;const label=document.querySelector('label[for="file"]');if(label)label.textContent='PDF de la providencia (opcional; se guarda en la nube)';}

// Rebuild rule lists from the complete jurisprudential field. Each visual line remains
// inside the same LI; only explicit numbered items or clearly separate complete sentences
// begin a new LI.
function splitJurisprudentialRules(raw) {
  const text = String(raw ?? '').replace(/\r/g, '').trim();
  if (!text) return [];

  const explicit = text.match(/(?:^|\n)\s*(?:\d+[.)]|[a-zA-Z]\))[\s\S]*?(?=(?:\n\s*(?:\d+[.)]|[a-zA-Z]\))|$))/g);
  if (explicit && explicit.length > 1) {
    return explicit.map(item => item.replace(/^\s*(?:\d+[.)]|[a-zA-Z]\))\s*/, '').replace(/\s+/g, ' ').trim()).filter(Boolean);
  }

  const paragraphs = text.split(/\n\s*\n+/).map(item => item.trim()).filter(Boolean);
  if (paragraphs.length > 1) return paragraphs.map(item => item.replace(/\s*\n\s*/g, ' ').replace(/\s+/g, ' ').trim());

  const semicolonParts = text.split(/\s*;\s+/).map(item => item.trim()).filter(Boolean);
  if (semicolonParts.length > 1) return semicolonParts.map(item => item.replace(/\s*\n\s*/g, ' ').replace(/\s+/g, ' ').trim());

  return [text.replace(/\s*\n\s*/g, ' ').replace(/\s+/g, ' ').trim()];
}

function rebuildRuleLists() {
  document.querySelectorAll('#cards .rule-list').forEach(list => {
    if (list.dataset.rulesNormalized === '1') return;
    const fragments = [...list.children].map(item => item.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean);
    if (!fragments.length) return;

    const combined = [];
    for (const fragment of fragments) {
      if (!combined.length) {
        combined.push(fragment);
        continue;
      }
      const previous = combined[combined.length - 1];
      const previousEndsComplete = /[.!?]$/.test(previous);
      const startsLowercase = /^[a-záéíóúüñ]/.test(fragment);
      const isExplicitRule = /^(?:\d+[.)]|[a-zA-Z]\))\s/.test(fragment);
      if (!previousEndsComplete && (startsLowercase || /^[sS]uficiente|^[cC]ircunstanciada|^[yY]|^[oO]|^[eE]n /.test(fragment)) && !isExplicitRule) {
        combined[combined.length - 1] = `${previous} ${fragment}`.replace(/\s+/g, ' ').trim();
      } else {
        combined.push(fragment.replace(/^\d+[.)]\s*/, '').trim());
      }
    }

    list.replaceChildren(...combined.map(rule => {
      const li = document.createElement('li');
      li.textContent = rule.replace(/^\d+[.)]\s*/, '').trim();
      return li;
    }));
    list.dataset.rulesNormalized = '1';
  });
}

const ruleObserver = new MutationObserver(() => rebuildRuleLists());
const cardsContainer = document.querySelector('#cards');
if (cardsContainer) ruleObserver.observe(cardsContainer, { childList: true, subtree: true });
rebuildRuleLists();

window.addEventListener('submit',async event=>{if(event.target?.id!=='record-form')return;event.preventDefault();event.stopImmediatePropagation();const user=auth.currentUser;if(!user||user.email?.toLowerCase()!==OWNER_EMAIL){showMessage('Inicia sesión con la cuenta autorizada para guardar una ficha.','error');return;}const form=event.target,data={};form.querySelectorAll('[data-key]').forEach(element=>{data[element.dataset.key]=element.value.trim();});if(!data.citation||!data.thesis){showMessage('Completa el radicado y la tesis jurisprudencial.','error');return;}const file=document.querySelector('#file')?.files?.[0]||null,button=document.querySelector('#save-button');if(button)button.disabled=true;try{showMessage(file?'Subiendo ficha y PDF…':'Guardando ficha…','success');const saved=await saveCloud({...data,id:crypto.randomUUID(),file,fileName:file?.name||''},user);await putLocal(saved);showMessage('Ficha y documento guardados en la nube.','success');form.reset();if(typeof window.loadRecords==='function')await window.loadRecords();await refreshDashboard();await refreshFilterOptions();applyCardFilters();setView('library');rebuildRuleLists();}catch(error){showMessage(`No se pudo guardar en la nube: ${error.message}`,'error');}finally{if(button)button.disabled=false;}},true);
window.addEventListener('submit',async event=>{if(event.target?.id!=='edit-form')return;event.preventDefault();event.stopImmediatePropagation();const user=auth.currentUser;if(!user||user.email?.toLowerCase()!==OWNER_EMAIL)return;const id=document.querySelector('#edit-id')?.value,old=(await getLocalRecords()).find(record=>record.id===id);if(!old)return;const data={...old};event.target.querySelectorAll('[data-key]').forEach(element=>{data[element.dataset.key]=element.value.trim();});try{const saved=await saveCloud(data,user);await putLocal(saved);if(typeof window.loadRecords==='function')await window.loadRecords();await refreshDashboard();rebuildRuleLists();}catch(error){const message=document.querySelector('#edit-message');if(message){message.className='message error';message.textContent=error.message;}}},true);
window.addEventListener('click',async event=>{const button=event.target.closest('button[data-action="delete"]');if(!button)return;const user=auth.currentUser;if(!user||user.email?.toLowerCase()!==OWNER_EMAIL)return;event.preventDefault();event.stopImmediatePropagation();const record=(await getLocalRecords()).find(item=>item.id===button.dataset.id);if(!record||!confirm(`¿Eliminar la ficha “${record.citation||''}” y su PDF?`))return;try{await deleteDoc(doc(db,'provenance',record.id));if(record.filePath){try{await deleteObject(ref(storage,record.filePath));}catch(error){console.warn(error);}}await deleteLocal(record.id);if(typeof window.loadRecords==='function')await window.loadRecords();await refreshDashboard();await refreshFilterOptions();rebuildRuleLists();}catch(error){showMessage(`No se pudo eliminar la ficha: ${error.message}`,'error');}},true);
