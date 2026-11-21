import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getFirestore, collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js';

const firebaseConfig = {
  apiKey: 'AIzaSyAQl4ldky4k5GeRvqeztpjL5wr-mb-xJE',
  authDomain: 'iurisprudentia-40ac5.firebaseapp.com',
  projectId: 'iurisprudentia-40ac5',
  storageBucket: 'iurisprudentia-40ac5.firebasestorage.app',
  messagingSenderId: '358518113591',
  appId: '1:358518113591:web:7fb1497a724fe5e55dd862'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const provider = new GoogleAuthProvider();
const OWNER_EMAIL = 'estebanhn9820@gmail.com';

function createAuthControls() {
  const nav = document.querySelector('.navlinks');
  if (!nav || document.querySelector('#firebase-owner-controls')) return;
  const controls = document.createElement('span');
  controls.id = 'firebase-owner-controls';
  controls.style.cssText = 'display:flex;gap:8px;align-items:center';
  nav.after(controls);
}

createAuthControls();

async function login() {
  try { await signInWithPopup(auth, provider); }
  catch (error) { alert(error.message); }
}

onAuthStateChanged(auth, (user) => {
  const controls = document.querySelector('#firebase-owner-controls');
  if (!controls) return;
  controls.replaceChildren();

  if (user && user.email === OWNER_EMAIL) {
    const status = document.createElement('span');
    status.className = 'hint';
    status.textContent = user.email;

    const logout = document.createElement('button');
    logout.type = 'button';
    logout.className = 'btn secondary';
    logout.textContent = 'Cerrar sesión';
    logout.addEventListener('click', () => signOut(auth));
    controls.append(status, logout);
  } else {
    if (user) signOut(auth);
    const loginButton = document.createElement('button');
    loginButton.type = 'button';
    loginButton.className = 'btn';
    loginButton.textContent = 'Iniciar sesión con Google';
    loginButton.addEventListener('click', login);
    controls.append(loginButton);
  }

  const authorized = Boolean(user && user.email === OWNER_EMAIL);
  document.querySelectorAll('#record-form input, #record-form textarea, #record-form select').forEach(element => {
    element.disabled = !authorized;
  });
  const saveButton = document.querySelector('#save-button');
  if (saveButton) saveButton.disabled = !authorized;
});

window.addEventListener('submit', async (event) => {
  if (event.target?.id !== 'record-form') return;
  event.preventDefault();
  event.stopImmediatePropagation();

  const user = auth.currentUser;
  const message = document.querySelector('#form-message');
  if (!user || user.email !== OWNER_EMAIL) {
    if (message) { message.className = 'message error'; message.textContent = 'Debes iniciar sesión con la cuenta autorizada.'; }
    return;
  }

  const form = event.target;
  const file = document.querySelector('#file')?.files?.[0];
  const citation = form.querySelector('[data-key="citation"]')?.value.trim();
  const thesis = form.querySelector('[data-key="thesis"]')?.value.trim();
  if (!file || !citation || !thesis) {
    if (message) { message.className = 'message error'; message.textContent = 'Completa los campos obligatorios y selecciona el PDF.'; }
    return;
  }

  const button = document.querySelector('#save-button');
  if (button) button.disabled = true;

  try {
    const data = {};
    form.querySelectorAll('[data-key]').forEach(element => { data[element.dataset.key] = element.value.trim(); });

    const id = crypto.randomUUID();
    const fileRef = ref(storage, `provenance/${id}/${file.name}`);
    await uploadBytes(fileRef, file, { contentType: 'application/pdf' });

    data.ownerUid = user.uid;
    data.ownerEmail = user.email;
    data.fileName = file.name;
    data.filePath = fileRef.fullPath;
    data.fileUrl = await getDownloadURL(fileRef);
    data.createdAt = serverTimestamp();

    await addDoc(collection(db, 'provenance'), data);

    if (message) { message.className = 'message success'; message.textContent = 'Ficha y PDF guardados en la nube.'; }
    form.reset();
  } catch (error) {
    if (message) { message.className = 'message error'; message.textContent = error.message; }
  } finally {
    if (button) button.disabled = false;
  }
}, true);
