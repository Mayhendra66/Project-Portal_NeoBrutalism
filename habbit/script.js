/* =========================================================
   HABIT TRACKER — script.js
   Fitur: localStorage CRUD, Fetch API (daily quote),
   Chart.js (weekly progress), SweetAlert2 (neo-brutalism)
   ========================================================= */

(() => {
  "use strict";

  /* ---------------------------------------------------------
     CONFIG & STATE
  --------------------------------------------------------- */
  const STORAGE_KEY = "habitTracker_habits_v1";
  const SESSION_KEY = "habitTracker_session";
  const BADGE_KEY = "habitTracker_badges_v1";
  const CREATED_COUNT_KEY = "habitTracker_totalCreated_v1";
  const REMINDER_ENABLED_KEY = "habitTracker_reminderEnabled_v1";
  const REMINDER_DISMISS_KEY = "habitTracker_reminderDismissedDate";
  const REMINDER_INTERVAL_MS = 30 * 60 * 1000; // 30 menit
  const DAY_MS = 24 * 60 * 60 * 1000;

  const BADGE_DEFS = [
    {
      id: "starter",
      name: "Starter",
      desc: "Checklist habit pertama lo",
      color: "yellow",
      icon: '<path d="M12 2l2.4 6.8L21 11l-6.6 2.2L12 20l-2.4-6.8L3 11l6.6-2.2L12 2z" fill="currentColor"/>',
      condition: (s) => s.totalCompletions >= 1
    },
    {
      id: "streak3",
      name: "Hot Streak",
      desc: "Streak 3 hari beruntun",
      color: "orange",
      icon: '<path d="M12 2c1 4-3 5-3 9a3 3 0 006 0c2 0 3-2 2-4 3 2 4 6 4 8a7 7 0 11-14 0c0-5 3-8 5-13z" fill="currentColor"/>',
      condition: (s) => s.bestStreak >= 3
    },
    {
      id: "streak7",
      name: "On Fire",
      desc: "Streak 7 hari beruntun",
      color: "orange",
      icon: '<path d="M12 2c1 4-3 5-3 9a3 3 0 006 0c2 0 3-2 2-4 3 2 4 6 4 8a7 7 0 11-14 0c0-5 3-8 5-13z" fill="currentColor"/>',
      condition: (s) => s.bestStreak >= 7
    },
    {
      id: "streak30",
      name: "Unstoppable",
      desc: "Streak 30 hari beruntun",
      color: "pink",
      icon: '<path d="M12 2c1 4-3 5-3 9a3 3 0 006 0c2 0 3-2 2-4 3 2 4 6 4 8a7 7 0 11-14 0c0-5 3-8 5-13z" fill="currentColor"/>',
      condition: (s) => s.bestStreak >= 30
    },
    {
      id: "collector",
      name: "Kolektor Habit",
      desc: "Bikin 3+ habit",
      color: "blue",
      icon: '<path d="M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 006.5 22H20V2H6.5A2.5 2.5 0 004 4.5v15z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
      condition: (s) => s.totalCreated >= 3
    },
    {
      id: "grinder",
      name: "Grinder",
      desc: "20x checklist selesai",
      color: "green",
      icon: '<path d="M13 2L3 14h7l-1 8 11-14h-7l1-6z" fill="currentColor"/>',
      condition: (s) => s.totalCompletions >= 20
    },
    {
      id: "perfectday",
      name: "Hari Sempurna",
      desc: "Semua habit checklist 1 hari",
      color: "purple",
      icon: '<path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
      condition: (s) => s.total > 0 && s.doneToday === s.total
    }
  ];

  const ICON_BY_COLOR = {
    blue:   '<path d="M12 6.5v11M16.5 9.5c0-1.66-2-2.5-4.5-2.5s-4.5.84-4.5 2.5 2 2 4.5 2.5 4.5.84 4.5 2.5-2 2.5-4.5 2.5-4.5-.84-4.5-2.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    green:  '<path d="M12 21c-4.5-3-8-6.5-8-10.5A4.5 4.5 0 0112 7a4.5 4.5 0 018 3.5c0 4-3.5 7.5-8 10.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    orange: '<path d="M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 006.5 22H20V2H6.5A2.5 2.5 0 004 4.5v15z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    pink:   '<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    purple: '<path d="M13 2L3 14h7l-1 8 11-14h-7l1-6z" fill="currentColor"/>'
  };

  let habits = [];          // array of habit objects
  let chartInstance = null; // Chart.js instance
  let editingId = null;     // id habit yang lagi diedit (null = mode tambah)

  /* ---------------------------------------------------------
     UTILS — tanggal
  --------------------------------------------------------- */
  function todayKey(offsetDays = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().slice(0, 10); // YYYY-MM-DD (cukup akurat utk demo)
  }

  function formatTodayLabel() {
    const opts = { weekday: "long", day: "numeric", month: "short" };
    return new Date().toLocaleDateString("id-ID", opts);
  }

  function uid() {
    return "h_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  /* ---------------------------------------------------------
     LOCAL STORAGE
  --------------------------------------------------------- */
  function loadHabits() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      habits = raw ? JSON.parse(raw) : seedDefaultHabits();
    } catch (err) {
      console.error("Gagal load localStorage:", err);
      habits = seedDefaultHabits();
    }
  }

  function saveHabits() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
    } catch (err) {
      console.error("Gagal simpan localStorage:", err);
      Swal.fire({
        title: "Storage Penuh!",
        text: "Gagal nyimpen data ke browser lo.",
        icon: "error",
        customClass: swalNeoClasses()
      });
    }
  }

  function seedDefaultHabits() {
    // dipakai cuma kalau localStorage masih kosong (first run)
    const seeded = [
      mkHabit("Nabung 20rb", "daily", "blue", { [todayKey(-1)]: true, [todayKey(-2)]: true }),
      mkHabit("Minum 2L Air", "daily", "green", { [todayKey(-1)]: true }),
      mkHabit("Baca 10 Halaman", "daily", "orange", {}),
      mkHabit("Tidur Sebelum 23.00", "daily", "pink", {})
    ];
    if (localStorage.getItem(CREATED_COUNT_KEY) === null) {
      localStorage.setItem(CREATED_COUNT_KEY, String(seeded.length));
    }
    return seeded;
  }

  function mkHabit(name, frequency, color, history = {}) {
    return {
      id: uid(),
      name,
      frequency,
      color,
      history,           // { "2026-06-19": true, ... }
      createdAt: Date.now()
    };
  }

  /* ---------------------------------------------------------
     STREAK & STATS HELPERS
  --------------------------------------------------------- */
  function isDoneToday(habit) {
    return !!habit.history[todayKey()];
  }

  function getStreak(habit) {
    let count = 0;
    let offset = isDoneToday(habit) ? 0 : -1;
    while (habit.history[todayKey(offset)]) {
      count++;
      offset--;
    }
    return count;
  }

  function getCompletionRate(habit, days = 7) {
    let done = 0;
    for (let i = 0; i > -days; i--) {
      if (habit.history[todayKey(i)]) done++;
    }
    return Math.round((done / days) * 100);
  }

  function getGlobalStats() {
    const total = habits.length;
    const doneToday = habits.filter(isDoneToday).length;
    const bestStreak = habits.reduce((max, h) => Math.max(max, getStreak(h)), 0);
    const totalCompletions = habits.reduce(
      (sum, h) => sum + Object.keys(h.history).length, 0
    );
    return { total, doneToday, bestStreak, totalCompletions, totalCreated: getCreatedCount() };
  }

  /* ---------------------------------------------------------
     RENDER — STATS
  --------------------------------------------------------- */
  function renderStats() {
    const total = habits.length;
    const doneToday = habits.filter(isDoneToday).length;
    const bestStreak = habits.reduce((max, h) => Math.max(max, getStreak(h)), 0);
    const rate = total ? Math.round((doneToday / total) * 100) : 0;

    document.getElementById("statTotal").textContent = total;
    document.getElementById("statDone").innerHTML = `${doneToday}<span class="stat-sub">/${total}</span>`;
    document.getElementById("statStreak").textContent = bestStreak;
    document.getElementById("statRate").innerHTML = `${rate}<span class="stat-sub">%</span>`;
  }

  /* ---------------------------------------------------------
     RENDER — HABIT GRID
  --------------------------------------------------------- */
  function habitCardTemplate(habit) {
    const streak = getStreak(habit);
    const done = isDoneToday(habit);
    const freqLabel = {
      daily: "Setiap hari",
      weekdays: "Hari kerja (Sen-Jum)",
      weekly: "Seminggu sekali"
    }[habit.frequency] || "Setiap hari";

    return `
      <article class="habit-card" data-id="${habit.id}">
        <div class="habit-card-top">
          <div class="habit-icon icon-${habit.color}">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              ${ICON_BY_COLOR[habit.color] || ICON_BY_COLOR.blue}
            </svg>
          </div>
          <div class="habit-actions">
            <button class="icon-btn" data-action="edit" title="Edit">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <button class="icon-btn" data-action="delete" title="Hapus">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        <h3 class="habit-name">${escapeHTML(habit.name)}</h3>
        <p class="habit-meta">${freqLabel}</p>

        <div class="habit-footer">
          <div class="streak-badge ${streak === 0 ? "streak-cold" : ""}">
            <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2c1 4-3 5-3 9a3 3 0 006 0c2 0 3-2 2-4 3 2 4 6 4 8a7 7 0 11-14 0c0-5 3-8 5-13z"/>
            </svg>
            <span>${streak} hari</span>
          </div>
          <button class="check-btn ${done ? "checked" : ""}" data-action="toggle">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </article>
    `;
  }

  function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function renderHabitGrid() {
    const grid = document.getElementById("habitGrid");
    const emptyState = document.getElementById("emptyState");

    if (habits.length === 0) {
      grid.innerHTML = "";
      emptyState.classList.remove("hidden");
      return;
    }

    emptyState.classList.add("hidden");
    grid.innerHTML = habits.map(habitCardTemplate).join("");
  }

  /* ---------------------------------------------------------
     RENDER — CHART (Chart.js)
  --------------------------------------------------------- */
  function renderChart() {
    const ctx = document.getElementById("weeklyChart");
    if (!ctx) return;

    const labels = [];
    const data = [];
    for (let i = -6; i <= 0; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      labels.push(d.toLocaleDateString("id-ID", { weekday: "short" }));

      const key = todayKey(i);
      const total = habits.length;
      const done = habits.filter(h => h.history[key]).length;
      data.push(total ? Math.round((done / total) * 100) : 0);
    }

    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: "Completion %",
          data,
          backgroundColor: "#7C5CFC",
          borderColor: "#14110F",
          borderWidth: 2.5,
          borderRadius: 6,
          maxBarThickness: 38
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            grid: { color: "#E5DEFB" },
            ticks: { callback: v => v + "%", font: { family: "Inter", weight: 600 } }
          },
          x: {
            grid: { display: false },
            ticks: { font: { family: "Inter", weight: 700 } }
          }
        }
      }
    });
  }

  /* ---------------------------------------------------------
     RENDER — MASTER
  --------------------------------------------------------- */
  function renderAll() {
    renderStats();
    renderHabitGrid();
    renderChart();
    renderBadges();
    renderReminderBar();
    document.getElementById("todayChip").textContent = formatTodayLabel();
  }

  /* ---------------------------------------------------------
     SWEETALERT2 — neo brutalism helper
  --------------------------------------------------------- */
  function swalNeoClasses() {
    return {
      popup: "swal-neo-popup",
      title: "swal-neo-title",
      confirmButton: "swal-neo-confirm",
      cancelButton: "swal-neo-cancel",
      icon: "swal-neo-icon"
    };
  }

  function toastSuccess(msg) {
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: msg,
      showConfirmButton: false,
      timer: 1800,
      timerProgressBar: true,
      customClass: { popup: "swal-neo-toast" }
    });
  }

  /* ---------------------------------------------------------
     MODAL — open / close
  --------------------------------------------------------- */
  const modalOverlay = document.getElementById("habitModalOverlay");
  const modalTitle = document.getElementById("modalTitle");
  const habitForm = document.getElementById("habitForm");
  const habitIdInput = document.getElementById("habitId");
  const habitNameInput = document.getElementById("habitName");
  const habitFrequencyInput = document.getElementById("habitFrequency");
  const colorPicker = document.getElementById("colorPicker");

  function openModal(habit = null) {
    editingId = habit ? habit.id : null;
    modalTitle.textContent = habit ? "Edit Habit" : "New Habit";
    habitIdInput.value = habit ? habit.id : "";
    habitNameInput.value = habit ? habit.name : "";
    habitFrequencyInput.value = habit ? habit.frequency : "daily";
    setSelectedColor(habit ? habit.color : "blue");

    modalOverlay.classList.remove("hidden");
    setTimeout(() => habitNameInput.focus(), 50);
  }

  function closeModal() {
    modalOverlay.classList.add("hidden");
    habitForm.reset();
    editingId = null;
  }

  function setSelectedColor(color) {
    [...colorPicker.children].forEach(dot => {
      dot.classList.toggle("selected", dot.dataset.color === color);
    });
  }

  function getSelectedColor() {
    const el = colorPicker.querySelector(".color-dot.selected");
    return el ? el.dataset.color : "blue";
  }

  /* ---------------------------------------------------------
     CRUD HANDLERS
  --------------------------------------------------------- */
  function handleFormSubmit(e) {
    e.preventDefault();
    const name = habitNameInput.value.trim();
    if (!name) return;

    if (editingId) {
      const habit = habits.find(h => h.id === editingId);
      if (habit) {
        habit.name = name;
        habit.frequency = habitFrequencyInput.value;
        habit.color = getSelectedColor();
      }
      saveHabits();
      renderAll();
      closeModal();
      toastSuccess("Habit berhasil diupdate!");
    } else {
      const newHabit = mkHabit(name, habitFrequencyInput.value, getSelectedColor());
      habits.push(newHabit);
      incrementCreatedCount();
      saveHabits();
      renderAll();
      closeModal();
      toastSuccess("Habit baru ditambahin!");
      checkAndUnlockBadges();
    }
  }

  function incrementCreatedCount() {
    const current = parseInt(localStorage.getItem(CREATED_COUNT_KEY) || "0", 10);
    localStorage.setItem(CREATED_COUNT_KEY, String(current + 1));
  }

  function getCreatedCount() {
    return parseInt(localStorage.getItem(CREATED_COUNT_KEY) || "0", 10);
  }

  function handleDelete(id) {
    const habit = habits.find(h => h.id === id);
    if (!habit) return;

    Swal.fire({
      title: "Yakin hapus?",
      text: `"${habit.name}" bakal hilang permanen.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
      reverseButtons: true,
      customClass: swalNeoClasses()
    }).then(result => {
      if (result.isConfirmed) {
        habits = habits.filter(h => h.id !== id);
        saveHabits();
        renderAll();
        toastSuccess("Habit dihapus.");
      }
    });
  }

  function handleToggle(id) {
    const habit = habits.find(h => h.id === id);
    if (!habit) return;

    const key = todayKey();
    if (habit.history[key]) {
      delete habit.history[key];
    } else {
      habit.history[key] = true;
      // confetti-ish toast pas berhasil checklist
      toastSuccess("Mantap, lanjutin streak-nya! 🔥".replace(" 🔥", ""));
    }
    saveHabits();
    renderAll();
    checkAndUnlockBadges();
  }
  document.getElementById("habitGrid").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const card = e.target.closest(".habit-card");
    const id = card?.dataset.id;
    if (!id) return;

    const action = btn.dataset.action;
    if (action === "edit") {
      const habit = habits.find(h => h.id === id);
      if (habit) openModal(habit);
    } else if (action === "delete") {
      handleDelete(id);
    } else if (action === "toggle") {
      handleToggle(id);
    }
  });

  /* ---------------------------------------------------------
     EVENT — modal controls
  --------------------------------------------------------- */
  document.getElementById("openAddModalBtn").addEventListener("click", () => openModal());
  document.getElementById("closeModalBtn").addEventListener("click", closeModal);
  document.getElementById("cancelModalBtn").addEventListener("click", closeModal);
  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modalOverlay.classList.contains("hidden")) closeModal();
  });

  colorPicker.addEventListener("click", (e) => {
    const dot = e.target.closest(".color-dot");
    if (!dot) return;
    setSelectedColor(dot.dataset.color);
  });

  habitForm.addEventListener("submit", handleFormSubmit);

  /* ---------------------------------------------------------
     FETCH API — daily motivation quote
  --------------------------------------------------------- */
  const FALLBACK_QUOTES = [
    "Konsisten itu lebih penting daripada sempurna.",
    "Habit kecil hari ini, hasil gede nanti.",
    "Jangan putusin streak lo, bro.",
    "Progress > perfection."
  ];

  async function loadDailyQuote() {
    const quoteEl = document.getElementById("quoteText");
    try {
      const res = await fetch("https://dummyjson.com/quotes/random");
      if (!res.ok) throw new Error("Network response not ok");
      const data = await res.json();
      quoteEl.textContent = `"${data.quote}" — ${data.author}`;
    } catch (err) {
      console.warn("Fetch quote gagal, pakai fallback:", err);
      const random = FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)];
      quoteEl.textContent = `"${random}"`;
    }
  }

  
  /* ---------------------------------------------------------
     BADGE REWARD SYSTEM (Bonus)
  --------------------------------------------------------- */
  function loadUnlockedBadges() {
    try {
      const raw = localStorage.getItem(BADGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveUnlockedBadges(list) {
    localStorage.setItem(BADGE_KEY, JSON.stringify(list));
  }

  function renderBadges() {
    const grid = document.getElementById("badgeGrid");
    const chip = document.getElementById("badgeCountChip");
    const unlocked = loadUnlockedBadges();

    chip.textContent = `${unlocked.length}/${BADGE_DEFS.length} unlocked`;

    grid.innerHTML = BADGE_DEFS.map(badge => {
      const isUnlocked = unlocked.includes(badge.id);
      return `
        <div class="badge-card ${isUnlocked ? `unlocked b-${badge.color}` : "locked"}">
          ${!isUnlocked ? `
            <div class="lock-overlay">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" stroke-width="2.5"/>
                <path d="M8 11V7a4 4 0 018 0v4" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
              </svg>
            </div>` : ""}
          <div class="badge-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">${badge.icon}</svg>
          </div>
          <h3 class="badge-name">${badge.name}</h3>
          <p class="badge-desc">${badge.desc}</p>
        </div>
      `;
    }).join("");
  }

  async function checkAndUnlockBadges() {
    const stats = getGlobalStats();
    const unlocked = loadUnlockedBadges();
    const newlyUnlocked = [];

    BADGE_DEFS.forEach(badge => {
      if (!unlocked.includes(badge.id) && badge.condition(stats)) {
        unlocked.push(badge.id);
        newlyUnlocked.push(badge);
      }
    });

    if (newlyUnlocked.length === 0) return;

    saveUnlockedBadges(unlocked);
    renderBadges();

    // tampilin celebration popup satu-satu biar gak numpuk
    for (const badge of newlyUnlocked) {
      await Swal.fire({
        title: "Badge Baru! 🎉",
        html: `<b>${badge.name}</b><br><span style="font-size:13px;opacity:.7">${badge.desc}</span>`,
        icon: "success",
        confirmButtonText: "Sip!",
        customClass: swalNeoClasses()
      });
    }
  }

  /* ---------------------------------------------------------
     REMINDER SYSTEM (Bonus — in-page alert)
  --------------------------------------------------------- */
  function isReminderEnabled() {
    return localStorage.getItem(REMINDER_ENABLED_KEY) !== "false"; // default ON
  }

  function setReminderEnabled(val) {
    localStorage.setItem(REMINDER_ENABLED_KEY, String(val));
  }

  function renderReminderBar() {
    const bar = document.getElementById("reminderBar");
    const text = document.getElementById("reminderText");
    const incomplete = habits.filter(h => !isDoneToday(h)).length;
    const dismissedToday = sessionStorage.getItem(REMINDER_DISMISS_KEY) === todayKey();

    if (!isReminderEnabled() || incomplete === 0 || dismissedToday) {
      bar.classList.add("hidden");
      return;
    }

    text.textContent = incomplete === 1
      ? "Masih ada 1 habit yang belum dicheck hari ini. Gas selesain!"
      : `Masih ada ${incomplete} habit yang belum dicheck hari ini. Gas selesain!`;
    bar.classList.remove("hidden");
  }

  function startReminderInterval() {
    setInterval(() => {
      if (!isReminderEnabled()) return;
      const incomplete = habits.filter(h => !isDoneToday(h)).length;
      if (incomplete === 0) return;

      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "warning",
        title: `Reminder: ${incomplete} habit belum dicheck hari ini!`,
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true,
        customClass: { popup: "swal-neo-toast" }
      });
    }, REMINDER_INTERVAL_MS);
  }

  function setupReminderControls() {
    const dismissBtn = document.getElementById("dismissReminderBtn");
    const muteBtn = document.getElementById("muteReminderBtn");

    dismissBtn.addEventListener("click", () => {
      sessionStorage.setItem(REMINDER_DISMISS_KEY, todayKey());
      renderReminderBar();
    });

    muteBtn.addEventListener("click", () => {
      setReminderEnabled(false);
      renderReminderBar();
      toastSuccess("Reminder dimatiin. Bisa diaktifin lagi lewat localStorage.");
    });
  }

  /* ---------------------------------------------------------
     INIT
  --------------------------------------------------------- */
  function init() {
    if (!checkAuth()) return;
    setupLogout();
    setupReminderControls();
    loadHabits();
    renderAll();
    loadDailyQuote();
    checkAndUnlockBadges();
    startReminderInterval();
  }

  document.addEventListener("DOMContentLoaded", init);
})();