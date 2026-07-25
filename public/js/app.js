let currentUser = null;
let allGroups = [];
let allStudents = [];
let activeStudentId = null;

const el = {
  userLabel: document.getElementById('userLabel'),
  roleBadge: document.getElementById('roleBadge'),
  logoutBtn: document.getElementById('logoutBtn'),
  searchInput: document.getElementById('searchInput'),
  groupFilter: document.getElementById('groupFilter'),
  addStudentBtn: document.getElementById('addStudentBtn'),
  studentGrid: document.getElementById('studentGrid'),
  emptyState: document.getElementById('emptyState'),
  modalOverlay: document.getElementById('studentModal'),
  modalTitle: document.getElementById('modalTitle'),
  modalBody: document.getElementById('modalBody'),
  modalCloseBtn: document.getElementById('modalCloseBtn'),
  toast: document.getElementById('toast'),
};

function showToast(message, isError = false) {
  el.toast.textContent = message;
  el.toast.classList.toggle('error', isError);
  el.toast.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { el.toast.hidden = true; }, 3500);
}

async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (res.status === 401) {
    window.location.href = '/login.html';
    throw new Error('Kirilmagan');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Xatolik yuz berdi');
  return data;
}

function isAdmin() {
  return currentUser && currentUser.role === 'admin';
}

async function init() {
  try {
    currentUser = await api('/api/auth/me');
  } catch {
    return;
  }

  el.userLabel.textContent = currentUser.username;
  el.roleBadge.textContent = currentUser.role === 'admin' ? 'Admin' : 'Foydalanuvchi';
  el.roleBadge.classList.add(currentUser.role);
  el.addStudentBtn.hidden = !isAdmin();

  await loadGroups();
  await loadStudents();

  el.searchInput.addEventListener('input', debounce(loadStudents, 250));
  el.groupFilter.addEventListener('change', loadStudents);
  el.logoutBtn.addEventListener('click', logout);
  el.modalCloseBtn.addEventListener('click', closeModal);
  el.modalOverlay.addEventListener('click', (e) => {
    if (e.target === el.modalOverlay) closeModal();
  });
  el.addStudentBtn.addEventListener('click', () => openStudentModal(null));
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

async function loadGroups() {
  allGroups = await api('/api/students/groups');
  el.groupFilter.innerHTML = '<option value="">Barcha guruhlar</option>' +
    allGroups.map((g) => `<option value="${g.id}">${escapeHtml(g.guruh_kod || g.raw_label)}</option>`).join('');
}

async function loadStudents() {
  const params = new URLSearchParams();
  if (el.searchInput.value.trim()) params.set('q', el.searchInput.value.trim());
  if (el.groupFilter.value) params.set('groupId', el.groupFilter.value);

  allStudents = await api(`/api/students?${params.toString()}`);
  renderGrid();
}

function renderGrid() {
  el.studentGrid.innerHTML = '';
  el.emptyState.hidden = allStudents.length > 0;

  const frag = document.createDocumentFragment();
  for (const s of allStudents) {
    const card = document.createElement('div');
    card.className = 'student-card';
    card.innerHTML = `
      <img class="photo" src="${s.photoPath || '/img/placeholder.svg'}" alt="${escapeHtml(s.fullName)}" loading="lazy" onerror="this.src='/img/placeholder.svg'" />
      <div class="info">
        <p class="name">${escapeHtml(s.fullName)}</p>
        <p class="group">${escapeHtml(s.guruhKod || s.groupLabel || '—')}</p>
      </div>
    `;
    card.addEventListener('click', () => openStudentModal(s.id));
    frag.appendChild(card);
  }
  el.studentGrid.appendChild(frag);
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function logout() {
  await api('/api/auth/logout', { method: 'POST' });
  window.location.href = '/login.html';
}

function closeModal() {
  el.modalOverlay.hidden = true;
  el.modalBody.innerHTML = '';
  activeStudentId = null;
}

async function openStudentModal(id) {
  activeStudentId = id;
  el.modalOverlay.hidden = false;

  if (id === null) {
    el.modalTitle.textContent = 'Yangi talaba';
    renderEditForm(null);
    return;
  }

  el.modalTitle.textContent = 'Yuklanmoqda...';
  el.modalBody.innerHTML = '';
  try {
    const student = await api(`/api/students/${id}`);
    el.modalTitle.textContent = student.fullName;
    if (isAdmin()) {
      renderEditForm(student);
    } else {
      renderViewOnly(student);
    }
  } catch (err) {
    showToast(err.message, true);
    closeModal();
  }
}

function renderViewOnly(s) {
  const phones = (s.phones || []).map((p) => `<span class="tag">${escapeHtml(p.phone_number)}</span>`).join('') || '<span class="tag">—</span>';
  const father = (s.guardians || []).find((g) => g.relation === 'father');
  const mother = (s.guardians || []).find((g) => g.relation === 'mother');

  el.modalBody.innerHTML = `
    <div class="modal-body-grid">
      <div class="modal-photo-col">
        <img src="${s.photoPath || '/img/placeholder.svg'}" onerror="this.src='/img/placeholder.svg'" alt="${escapeHtml(s.fullName)}" />
      </div>
      <div>
        <div class="field-group"><label>F.I.O</label><div class="view-value">${escapeHtml(s.fullName)}</div></div>
        <div class="two-col">
          <div class="field-group"><label>Tug'ilgan sana</label><div class="view-value">${escapeHtml(s.birthDate) || '—'}</div></div>
          <div class="field-group"><label>Jinsi</label><div class="view-value">${escapeHtml(s.gender) || '—'}</div></div>
        </div>
        <div class="field-group"><label>Guruh</label><div class="view-value">${escapeHtml(s.groupLabel) || '—'}</div></div>
      </div>
    </div>

    <div class="section-title">Aloqa</div>
    <div class="field-group"><label>Telefon</label><div class="tag-list">${phones}</div></div>
    <div class="two-col">
      <div class="field-group"><label>Tug'ilgan joyi</label><div class="view-value">${escapeHtml(s.birthPlace) || '—'}</div></div>
      <div class="field-group"><label>Yashash manzili</label><div class="view-value">${escapeHtml(s.residenceAddress) || '—'}</div></div>
    </div>

    <div class="section-title">Ota-ona</div>
    <div class="two-col">
      <div class="field-group"><label>Otasi</label><div class="view-value">${escapeHtml(father?.name) || '—'} ${father?.phone_raw ? '· ' + escapeHtml(father.phone_raw) : ''}</div></div>
      <div class="field-group"><label>Onasi</label><div class="view-value">${escapeHtml(mother?.name) || '—'} ${mother?.phone_raw ? '· ' + escapeHtml(mother.phone_raw) : ''}</div></div>
    </div>

    <div class="section-title">Qo'shimcha</div>
    <div class="two-col">
      <div class="field-group"><label>Oilaviy holati</label><div class="view-value">${escapeHtml(s.familyStatus) || '—'}</div></div>
      <div class="field-group"><label>Ijtimoiy toifa</label><div class="view-value">${escapeHtml(s.socialCategory) || '—'}</div></div>
    </div>
    <div class="field-group"><label>Yetimlik toifasi</label><div class="view-value">${escapeHtml(s.orphanCategory) || '—'}</div></div>
  `;
}

function renderEditForm(s) {
  const isNew = s === null;
  const father = (s?.guardians || []).find((g) => g.relation === 'father') || {};
  const mother = (s?.guardians || []).find((g) => g.relation === 'mother') || {};
  const phonesStr = (s?.phones || []).map((p) => p.phone_number).join(', ');

  const groupOptions = ['<option value="">— tanlang —</option>']
    .concat(allGroups.map((g) => `<option value="${g.id}" ${s?.groupId === g.id ? 'selected' : ''}>${escapeHtml(g.raw_label)}</option>`))
    .join('');

  el.modalBody.innerHTML = `
    <form id="studentForm">
      <div class="modal-body-grid">
        <div class="modal-photo-col">
          <img id="photoPreview" src="${s?.photoPath || '/img/placeholder.svg'}" onerror="this.src='/img/placeholder.svg'" alt="rasm" />
          ${!isNew ? '<input type="file" id="photoInput" accept="image/png,image/jpeg,image/webp" />' : ''}
        </div>
        <div>
          <div class="field-group"><label>F.I.O *</label><input name="fullName" required value="${escapeHtml(s?.fullName) || ''}" /></div>
          <div class="two-col">
            <div class="field-group"><label>Tug'ilgan sana</label><input type="date" name="birthDate" value="${escapeHtml(s?.birthDate) || ''}" /></div>
            <div class="field-group"><label>Jinsi</label>
              <select name="gender">
                <option value="">—</option>
                <option value="Erkak" ${s?.gender === 'Erkak' ? 'selected' : ''}>Erkak</option>
                <option value="Ayol" ${s?.gender === 'Ayol' ? 'selected' : ''}>Ayol</option>
              </select>
            </div>
          </div>
          <div class="field-group"><label>Guruh</label><select name="groupId">${groupOptions}</select></div>
        </div>
      </div>

      <div class="section-title">Aloqa</div>
      <div class="field-group"><label>Telefon raqam(lar)i (vergul bilan ajrating)</label><input name="phones" value="${escapeHtml(phonesStr)}" /></div>
      <div class="two-col">
        <div class="field-group"><label>Tug'ilgan joyi</label><input name="birthPlace" value="${escapeHtml(s?.birthPlace) || ''}" /></div>
        <div class="field-group"><label>Yashash manzili</label><input name="residenceAddress" value="${escapeHtml(s?.residenceAddress) || ''}" /></div>
      </div>

      <div class="section-title">Ota-ona</div>
      <div class="two-col">
        <div class="field-group"><label>Otasi (ism)</label><input name="fatherName" value="${escapeHtml(father.name) || ''}" /></div>
        <div class="field-group"><label>Otasi (tel)</label><input name="fatherPhone" value="${escapeHtml(father.phone_raw) || ''}" /></div>
      </div>
      <div class="two-col">
        <div class="field-group"><label>Onasi (ism)</label><input name="motherName" value="${escapeHtml(mother.name) || ''}" /></div>
        <div class="field-group"><label>Onasi (tel)</label><input name="motherPhone" value="${escapeHtml(mother.phone_raw) || ''}" /></div>
      </div>

      <div class="section-title">Qo'shimcha</div>
      <div class="two-col">
        <div class="field-group"><label>Oilaviy holati</label><input name="familyStatus" value="${escapeHtml(s?.familyStatus) || ''}" /></div>
        <div class="field-group"><label>Ijtimoiy toifa</label><input name="socialCategory" value="${escapeHtml(s?.socialCategory) || ''}" /></div>
      </div>
      <div class="field-group"><label>Yetimlik toifasi</label><input name="orphanCategory" value="${escapeHtml(s?.orphanCategory) || ''}" /></div>

      <div class="modal-actions">
        ${!isNew ? '<button type="button" class="btn btn-danger" id="deleteBtn">O\'chirish</button>' : ''}
        <div class="spacer"></div>
        <button type="button" class="btn" id="cancelBtn">Bekor qilish</button>
        <button type="submit" class="btn btn-primary">Saqlash</button>
      </div>
    </form>
  `;

  document.getElementById('cancelBtn').addEventListener('click', closeModal);
  if (!isNew) {
    document.getElementById('deleteBtn').addEventListener('click', () => deleteStudent(s.id));
    const photoInput = document.getElementById('photoInput');
    photoInput.addEventListener('change', () => uploadPhoto(s.id, photoInput));
  }

  document.getElementById('studentForm').addEventListener('submit', (e) => {
    e.preventDefault();
    saveStudent(isNew ? null : s.id, new FormData(e.target));
  });
}

async function saveStudent(id, formData) {
  const payload = {
    fullName: formData.get('fullName')?.trim(),
    birthDate: formData.get('birthDate') || '',
    gender: formData.get('gender') || '',
    groupId: formData.get('groupId') ? Number(formData.get('groupId')) : '',
    birthPlace: formData.get('birthPlace') || '',
    residenceAddress: formData.get('residenceAddress') || '',
    familyStatus: formData.get('familyStatus') || '',
    socialCategory: formData.get('socialCategory') || '',
    orphanCategory: formData.get('orphanCategory') || '',
  };

  try {
    let studentId = id;
    if (id === null) {
      const created = await api('/api/students', { method: 'POST', body: JSON.stringify(payload) });
      studentId = created.id;
    } else {
      await api(`/api/students/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    }

    const phones = (formData.get('phones') || '').split(',').map((p) => p.trim()).filter(Boolean);
    await api(`/api/students/${studentId}/phones`, { method: 'PUT', body: JSON.stringify({ phones }) });

    const guardians = [];
    const fatherName = formData.get('fatherName')?.trim();
    const fatherPhone = formData.get('fatherPhone')?.trim();
    if (fatherName || fatherPhone) guardians.push({ relation: 'father', name: fatherName, phoneRaw: fatherPhone });
    const motherName = formData.get('motherName')?.trim();
    const motherPhone = formData.get('motherPhone')?.trim();
    if (motherName || motherPhone) guardians.push({ relation: 'mother', name: motherName, phoneRaw: motherPhone });
    await api(`/api/students/${studentId}/guardians`, { method: 'PUT', body: JSON.stringify({ guardians }) });

    showToast('Saqlandi');
    closeModal();
    await loadStudents();
  } catch (err) {
    showToast(err.message, true);
  }
}

async function deleteStudent(id) {
  if (!confirm("Rostdan ham bu talabani o'chirmoqchimisiz?")) return;
  try {
    await api(`/api/students/${id}`, { method: 'DELETE' });
    showToast("O'chirildi");
    closeModal();
    await loadStudents();
  } catch (err) {
    showToast(err.message, true);
  }
}

async function uploadPhoto(id, input) {
  const file = input.files[0];
  if (!file) return;
  const formData = new FormData();
  formData.append('photo', file);

  try {
    const res = await fetch(`/api/students/${id}/photo`, { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Xatolik');
    document.getElementById('photoPreview').src = data.photoPath;
    showToast('Rasm yangilandi');
    await loadStudents();
  } catch (err) {
    showToast(err.message, true);
  }
}

init();
