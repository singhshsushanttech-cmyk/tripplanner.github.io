const CAT_META = {
  place:    { label: 'Place to Visit', emoji: '📍', badge: 'badge-place',    border: 'cat-place' },
  food:     { label: 'Food & Drink',   emoji: '🍽️', badge: 'badge-food',     border: 'cat-food' },
  activity: { label: 'Activity',       emoji: '🎯', badge: 'badge-activity', border: 'cat-activity' },
  stay:     { label: 'Stay',           emoji: '🏨', badge: 'badge-stay',     border: 'cat-stay' },
  other:    { label: 'Other',          emoji: '📌', badge: 'badge-other',    border: 'cat-other' },
};

let items = [];
let currentFilter = 'all';
let editingId = null;

// --- STORAGE ---
function save() {
  const data = {
    tripName: document.getElementById('tripNameDisplay').textContent,
    dateFrom: document.getElementById('dateFrom').value,
    dateTo:   document.getElementById('dateTo').value,
    items,
  };
  localStorage.setItem('tripPlanner_v1', JSON.stringify(data));
}

function load() {
  try {
    const raw = localStorage.getItem('tripPlanner_v1');
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data.tripName) document.getElementById('tripNameDisplay').textContent = data.tripName;
    if (data.dateFrom) document.getElementById('dateFrom').value = data.dateFrom;
    if (data.dateTo)   document.getElementById('dateTo').value   = data.dateTo;
    items = data.items || [];
  } catch (e) {
    items = [];
  }
}

// --- TRIP NAME INLINE EDIT ---
const nameDisplay = document.getElementById('tripNameDisplay');
const nameInput   = document.getElementById('tripNameInput');

nameDisplay.addEventListener('click', () => {
  nameInput.value = nameDisplay.textContent;
  nameDisplay.style.display = 'none';
  nameInput.style.display = 'block';
  nameInput.focus();
  nameInput.select();
});
nameInput.addEventListener('blur', commitName);
nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') commitName(); });

function commitName() {
  const val = nameInput.value.trim();
  if (val) nameDisplay.textContent = val;
  nameInput.style.display = 'none';
  nameDisplay.style.display = '';
  save();
}

document.getElementById('dateFrom').addEventListener('change', save);
document.getElementById('dateTo').addEventListener('change', save);

// --- ADD ITEM ---
function addItem() {
  const name = document.getElementById('newName').value.trim();
  if (!name) { document.getElementById('newName').focus(); return; }

  const item = {
    id:   Date.now(),
    name,
    cat:  document.getElementById('newCat').value,
    date: document.getElementById('newDate').value,
    note: document.getElementById('newNote').value.trim(),
    done: false,
  };

  items.unshift(item);
  document.getElementById('newName').value = '';
  document.getElementById('newNote').value = '';
  document.getElementById('newDate').value = '';
  save();
  render();
  document.getElementById('newName').focus();
}

document.getElementById('newName').addEventListener('keydown', e => {
  if (e.key === 'Enter') addItem();
});

// --- TOGGLE DONE ---
function toggleDone(id) {
  const item = items.find(i => i.id === id);
  if (item) { item.done = !item.done; save(); render(); }
}

// --- DELETE ---
function deleteItem(id) {
  items = items.filter(i => i.id !== id);
  save();
  render();
}

// --- EDIT MODAL ---
function openEdit(id) {
  editingId = id;
  const item = items.find(i => i.id === id);
  document.getElementById('editName').value = item.name;
  document.getElementById('editCat').value  = item.cat;
  document.getElementById('editDate').value = item.date || '';
  document.getElementById('editNote').value = item.note || '';
  document.getElementById('editModal').classList.add('open');
}

function closeModal() {
  document.getElementById('editModal').classList.remove('open');
  editingId = null;
}

document.getElementById('editModal').addEventListener('click', e => {
  if (e.target === document.getElementById('editModal')) closeModal();
});

function saveEdit() {
  const item = items.find(i => i.id === editingId);
  if (!item) return;
  const name = document.getElementById('editName').value.trim();
  if (!name) return;
  item.name = name;
  item.cat  = document.getElementById('editCat').value;
  item.date = document.getElementById('editDate').value;
  item.note = document.getElementById('editNote').value.trim();
  closeModal();
  save();
  render();
}

// --- FILTER ---
function setFilter(filter, el) {
  currentFilter = filter;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  render();
}

// --- PROGRESS ---
function updateProgress() {
  const total = items.length;
  const done  = items.filter(i => i.done).length;
  const pct   = total ? Math.round((done / total) * 100) : 0;

  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('progressPct').textContent  = pct + '%';

  if (!total) {
    document.getElementById('progressText').textContent   = 'No items yet — add your first one!';
    document.getElementById('progressEmoji').textContent  = '🗺️';
  } else {
    document.getElementById('progressText').textContent  = `${done} of ${total} completed`;
    const emojis = ['🗺️', '✈️', '🧳', '🌍', '🎉'];
    document.getElementById('progressEmoji').textContent = emojis[Math.min(Math.floor(pct / 25), 4)];
  }
}

// --- RENDER ---
function render() {
  updateProgress();
  const container = document.getElementById('itemsContainer');

  let filtered = items;
  if (currentFilter === 'done') {
    filtered = items.filter(i => i.done);
  } else if (currentFilter !== 'all') {
    filtered = items.filter(i => i.cat === currentFilter);
  }

  if (!filtered.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="emoji">${currentFilter === 'done' ? '✅' : '🌟'}</div>
        <p>${currentFilter === 'done'
          ? 'Nothing checked off yet — go explore!'
          : 'No items here yet. Add something above!'}</p>
      </div>`;
    return;
  }

  if (currentFilter === 'all') {
    const order = ['place', 'food', 'activity', 'stay', 'other'];
    let html = '';
    for (const cat of order) {
      const group = filtered.filter(i => i.cat === cat);
      if (!group.length) continue;
      const meta = CAT_META[cat];
      html += `
        <div class="section">
          <div class="section-header">
            <span class="section-icon">${meta.emoji}</span>
            <span class="section-title">${meta.label}</span>
            <span class="section-count">${group.filter(i => !i.done).length} left</span>
          </div>
          <div class="item-list">${group.map(itemHTML).join('')}</div>
        </div>`;
    }
    container.innerHTML = html;
  } else {
    container.innerHTML = `<div class="item-list">${filtered.map(itemHTML).join('')}</div>`;
  }
}

function itemHTML(item) {
  const meta    = CAT_META[item.cat];
  const dateStr = item.date ? `<span class="item-date-badge">📅 ${formatDate(item.date)}</span>` : '';
  const noteStr = item.note ? `<div class="item-note-text">${escHtml(item.note)}</div>` : '';

  return `
    <div class="item ${item.done ? 'done' : ''} ${meta.border}">
      <div class="item-check ${item.done ? 'checked' : ''}" onclick="toggleDone(${item.id})"></div>
      <div class="item-body">
        <div class="item-name-text">${escHtml(item.name)}</div>
        <div class="item-meta">
          <span class="item-cat-badge ${meta.badge}">${meta.label}</span>
          ${dateStr}
        </div>
        ${noteStr}
      </div>
      <div class="item-actions">
        <button class="icon-btn" onclick="openEdit(${item.id})" title="Edit">✏️</button>
        <button class="icon-btn del" onclick="deleteItem(${item.id})" title="Delete">🗑️</button>
      </div>
    </div>`;
}

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d} ${months[parseInt(m) - 1]} ${y}`;
}

// INIT
load();
render();
