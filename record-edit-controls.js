const OWNER_EMAIL = 'estebanhn9820@gmail.com';

function openEditDialog(record) {
  const dialog = document.querySelector('#edit-dialog');
  const idInput = document.querySelector('#edit-id');
  if (!dialog || !idInput) return;
  idInput.value = record.id;
  dialog.querySelectorAll('[data-key]').forEach(field => {
    field.value = record[field.dataset.key] || '';
  });
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
}

async function openLocalDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('iurisprudentia', 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getLocalRecords() {
  const database = await openLocalDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('sentences', 'readonly');
    const request = transaction.objectStore('sentences').getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
  });
}

async function addEditButtons() {
  const user = window.firebaseAuth?.currentUser;
  if (user?.email?.toLowerCase() !== OWNER_EMAIL) return;
  const records = await getLocalRecords();

  document.querySelectorAll('#cards > .card').forEach(card => {
    if (card.querySelector('[data-record-edit-added]')) return;
    const record = records.find(item => card.textContent.includes(item.citation || '__'));
    if (!record) return;

    const existingActions = card.querySelector('.card-actions');
    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'btn secondary';
    editButton.textContent = 'Editar ficha';
    editButton.setAttribute('data-record-edit-added', 'true');
    editButton.addEventListener('click', () => openEditDialog(record));

    if (existingActions) {
      existingActions.append(editButton);
    } else {
      const actions = document.createElement('div');
      actions.className = 'card-actions';
      actions.append(editButton);
      card.append(actions);
    }
  });
}

const observer = new MutationObserver(() => addEditButtons());
observer.observe(document.documentElement, { childList: true, subtree: true });
addEditButtons();
