// ==========================================
// STATE MANAGEMENT & INITIALIZATION
// ==========================================
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let isMuted = false;
let progressChartInstance = null;

// DOM Elements
const taskModalOverlay = document.getElementById('taskModalOverlay');
const taskForm = document.getElementById('taskForm');
const modalTitle = document.getElementById('modalTitle');
const taskIdInput = document.getElementById('taskId');
const taskTitleInput = document.getElementById('taskTitle');
const taskDescInput = document.getElementById('taskDesc');
const taskStatusSelect = document.getElementById('taskStatus');
const taskDeadlineInput = document.getElementById('taskDeadline');

const searchInput = document.getElementById('searchInput');
const deadlineFilter = document.getElementById('deadlineFilter');
const filterChips = document.querySelectorAll('.filter-chip');

const reminderBar = document.getElementById('reminderBar');
const reminderText = document.getElementById('reminderText');

// Current Filter State
let currentStatusFilter = 'all';

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  initChart();
  initEventListeners();
  render();
});

// ==========================================
// EVENT LISTENERS
// ==========================================
function initEventListeners() {
  // Modal Actions
  document.getElementById('openAddModalBtn').addEventListener('click', () => openModal());
  document.getElementById('closeModalBtn').addEventListener('click', closeModal);
  document.getElementById('cancelModalBtn').addEventListener('click', closeModal);
  taskForm.addEventListener('submit', handleFormSubmit);

  // Filter Actions
  searchInput.addEventListener('input', render);
  deadlineFilter.addEventListener('change', render);
  
  filterChips.forEach(chip => {
    chip.addEventListener('click', (e) => {
      filterChips.forEach(c => c.classList.remove('active'));
      e.target.classList.add('active');
      currentStatusFilter = e.target.dataset.filter;
      render();
    });
  });

  // Reminder Actions
  document.getElementById('dismissReminderBtn').addEventListener('click', () => reminderBar.classList.add('hidden'));
  document.getElementById('muteReminderBtn').addEventListener('click', () => {
    isMuted = true;
    reminderBar.classList.add('hidden');
  });

  // Drag and Drop Dropzones
  const dropzones = document.querySelectorAll('.board-dropzone');
  dropzones.forEach(zone => {
    zone.addEventListener('dragover', (e) => e.preventDefault());
    zone.addEventListener('drop', handleDrop);
  });
}

// ==========================================
// MODAL FUNCTIONS
// ==========================================
function openModal(task = null) {
  taskModalOverlay.classList.remove('hidden');
  if (task) {
    modalTitle.textContent = 'Edit Task';
    taskIdInput.value = task.id;
    taskTitleInput.value = task.title;
    taskDescInput.value = task.desc;
    taskStatusSelect.value = task.status;
    taskDeadlineInput.value = task.deadline || '';
  } else {
    modalTitle.textContent = 'New Task';
    taskForm.reset();
    taskIdInput.value = '';
  }
}

function closeModal() {
  taskModalOverlay.classList.add('hidden');
  taskForm.reset();
}

function handleFormSubmit(e) {
  e.preventDefault();
  
  const id = taskIdInput.value;
  const taskData = {
    id: id || Date.now().toString(),
    title: taskTitleInput.value,
    desc: taskDescInput.value,
    status: taskStatusSelect.value,
    deadline: taskDeadlineInput.value,
    completedDate: id ? (tasks.find(t => t.id === id)?.completedDate || null) : null
  };

  if (taskData.status === 'done' && !taskData.completedDate) {
    taskData.completedDate = new Date().toISOString().split('T')[0];
  } else if (taskData.status !== 'done') {
    taskData.completedDate = null;
  }

  if (id) {
    tasks = tasks.map(t => t.id === id ? taskData : t);
  } else {
    tasks.push(taskData);
  }

  saveAndSync();
  closeModal();
  Swal.fire({ icon: 'success', title: 'Task Berhasil Disimpan', showConfirmButton: false, timer: 1500 });
}

// ==========================================
// DATA RENDERING & FILTERING
// ==========================================
function render() {
  const query = searchInput.value.toLowerCase();
  const deadlineVal = deadlineFilter.value;
  const todayStr = new Date().toISOString().split('T')[0];

  // Clear Columns
  const zones = {
    todo: document.getElementById('dropzone-todo'),
    doing: document.getElementById('dropzone-doing'),
    done: document.getElementById('dropzone-done')
  };
  Object.values(zones).forEach(z => z.innerHTML = '');

  let counts = { todo: 0, doing: 0, done: 0 };

  tasks.forEach(task => {
    // 1. Filter Status (Top Chip Component)
    if (currentStatusFilter !== 'all' && task.status !== currentStatusFilter) return;

    // 2. Filter Search Text
    if (!task.title.toLowerCase().includes(query) && !task.desc.toLowerCase().includes(query)) return;

    // 3. Filter Deadline
    if (deadlineVal !== 'all') {
      if (deadlineVal === 'none' && task.deadline) return;
      if (deadlineVal === 'overdue' && (!task.deadline || task.deadline >= todayStr || task.status === 'done')) return;
      if (deadlineVal === 'today' && task.deadline !== todayStr) return;
      if (deadlineVal === 'upcoming' && (!task.deadline || task.deadline <= todayStr)) return;
    }

    counts[task.status]++;
    
    // Create Task Element
    if (zones[task.status]) {
      zones[task.status].appendChild(createTaskCard(task));
    }
  });

  // Update Counters & Stats
  document.getElementById('countTodo').textContent = counts.todo;
  document.getElementById('countDoing').textContent = counts.doing;
  document.getElementById('countDone').textContent = counts.done;
  
  updateStats();
  checkDeadlines();
  updateChart();
}

function createTaskCard(task) {
  const card = document.createElement('div');
  card.className = 'panel';
  card.style.padding = '1rem';
  card.style.cursor = 'grab';
  card.style.display = 'flex';
  card.style.flexDirection = 'column';
  card.style.gap = '0.5rem';
  card.draggable = true;
  card.dataset.id = task.id;

  card.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', task.id);
    card.style.opacity = '0.5';
  });
  card.addEventListener('dragend', () => card.style.opacity = '1');

  const todayStr = new Date().toISOString().split('T')[0];
  const isOverdue = task.deadline && task.deadline < todayStr && task.status !== 'done';

  card.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
      <h4 style="font-family:'Space Grotesk', sans-serif; font-weight:700; ${task.status === 'done' ? 'text-decoration: line-through;' : ''}">${task.title}</h4>
      <div style="display:flex; gap:0.25rem;">
        <button class="filter-chip" style="padding:0.2rem 0.4rem; font-size:0.75rem;" onclick="editTask('${task.id}')">✏️</button>
        <button class="filter-chip" style="padding:0.2rem 0.4rem; font-size:0.75rem; background:#ff6b35;" onclick="deleteTask('${task.id}')">❌</button>
      </div>
    </div>
    <p style="font-size:0.85rem; color:#555;">${task.desc || '<i>Tanpa deskripsi</i>'}</p>
    ${task.deadline ? `<span class="chip" style="align-self:flex-start; font-size:0.7rem; background:${isOverdue ? '#ff6b35' : '#fcd34d'}">${isOverdue ? '⚠️ Overdue: ' : '📅 '} ${task.deadline}</span>` : ''}
  `;

  return card;
}

// ==========================================
// DRAG & DROP LOGIC
// ==========================================
function handleDrop(e) {
  e.preventDefault();
  const id = e.dataTransfer.getData('text/plain');
  const targetCol = e.currentTarget.closest('.board-col').dataset.status;
  
  tasks = tasks.map(t => {
    if (t.id === id) {
      t.status = targetCol;
      if (targetCol === 'done') {
        t.completedDate = t.completedDate || new Date().toISOString().split('T')[0];
      } else {
        t.completedDate = null;
      }
    }
    return t;
  });

  saveAndSync();
}

// ==========================================
// UTILITIES (CRUD HELPERS, STATS, ACTIONS)
// ==========================================
window.editTask = function(id) {
  const task = tasks.find(t => t.id === id);
  if (task) openModal(task);
};

window.deleteTask = function(id) {
  Swal.fire({
    title: 'Hapus Task?',
    text: "Task yang dihapus tidak bisa dikembalikan!",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ff6b35',
    cancelButtonColor: '#000000',
    confirmButtonText: 'Ya, Hapus!'
  }).then((result) => {
    if (result.isConfirmed) {
      tasks = tasks.filter(t => t.id !== id);
      saveAndSync();
      Swal.fire({ title: 'Terhapus!', icon: 'success', showConfirmButton: false, timer: 1000 });
    }
  });
};

function updateStats() {
  const todayStr = new Date().toISOString().split('T')[0];
  const total = tasks.length;
  const done = tasks.filter(t => t.status === 'done').length;
  const overdue = tasks.filter(t => t.deadline && t.deadline < todayStr && t.status !== 'done').length;
  const rate = total > 0 ? Math.round((done / total) * 100) : 0;

  document.getElementById('statTotal').textContent = total;
  document.getElementById('statDone').textContent = done;
  document.getElementById('statOverdue').textContent = overdue;
  document.getElementById('statRate').innerHTML = `${rate}<span class="stat-sub">%</span>`;
}

function checkDeadlines() {
  if (isMuted) return;
  const todayStr = new Date().toISOString().split('T')[0];
  const urgentCount = tasks.filter(t => t.deadline && t.deadline <= todayStr && t.status !== 'done').length;

  if (urgentCount > 0) {
    reminderText.textContent = `Ada ${urgentCount} task yang overdue atau jatuh tempo hari ini!`;
    reminderBar.classList.remove('hidden');
  } else {
    reminderBar.classList.add('hidden');
  }
}

function saveAndSync() {
  localStorage.setItem('tasks', JSON.stringify(tasks));
  render();
}

// ==========================================
// CHART.JS FUNCTION
// ==========================================
function initChart() {
  const ctx = document.getElementById('progressChart').getContext('2d');
  progressChartInstance = new Chart(ctx, {
    type: 'bar',
    data: { labels: [], datasets: [{ label: 'Task Selesai', data: [], backgroundColor: '#6a55fa', borderColor: '#000000', borderWidth: 2, borderRadius: 4 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1, color: '#000' }, grid: { color: '#000', borderDash: [2, 4] } },
        x: { ticks: { color: '#000' } }
      }
    }
  });
}

function updateChart() {
  if (!progressChartInstance) return;

  const labels = [];
  const data = [];
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    
    // Label format DD/MM
    const labelStr = d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' });
    labels.push(labelStr);

    const count = tasks.filter(t => t.status === 'done' && t.completedDate === dateStr).length;
    data.push(count);
  }

  progressChartInstance.data.labels = labels;
  progressChartInstance.data.datasets[0].data = data;
  progressChartInstance.update();
}