// ==========================================
// STATE MANAGEMENT (KOSONG TANPA DUMMY)
// ==========================================
let attendanceLogs = JSON.parse(localStorage.getItem('attendanceLogs')) || [];
const currentUser = "Karyawan"; // Default nama log karena tanpa form login

// DOM Elements - Attendance Form
const attendanceForm = document.getElementById('attendanceForm');
const liveClockEl = document.getElementById('liveClock');
const txStatus = document.getElementById('txStatus');
const txNote = document.getElementById('txNote');
const btnGetLocation = document.getElementById('btnGetLocation');
const geoStatus = document.getElementById('geoStatus');
const txCoordinates = document.getElementById('txCoordinates');

// DOM Elements - Dashboard Stats & Filters
const statHadir = document.getElementById('statHadir');
const statIzinSakit = document.getElementById('statIzinSakit');
const statPersentase = document.getElementById('statPersentase');
const attendanceMonthFilter = document.getElementById('attendanceMonthFilter');
const attendanceLogContainer = document.getElementById('attendanceLogContainer');

// DOM Elements - Top Actions
const btnScanQr = document.getElementById('btnScanQr');
const btnExportExcel = document.getElementById('btnExportExcel');

// ==========================================
// INITIALIZATION
// ==========================================
function initApp() {
  startLiveClock();
  updateUI();
}

// ==========================================
// JAM MASUK OTOMATIS
// ==========================================
function startLiveClock() {
  setInterval(() => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('id-ID', { hour12: false });
    liveClockEl.textContent = timeString;
  }, 1000);
}

// ==========================================
// GEOLOCATION LOKASI GPS
// ==========================================
btnGetLocation.addEventListener('click', () => {
  if (!navigator.geolocation) {
    geoStatus.textContent = '❌ GPS tidak didukung oleh browser ini.';
    return;
  }

  geoStatus.textContent = '⏳ Mencari koordinat...';
  
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude.toFixed(6);
      const lng = position.coords.longitude.toFixed(6);
      txCoordinates.value = `${lat}, ${lng}`;
      geoStatus.textContent = `📍 Terkunci: ${lat}, ${lng}`;
    },
    (error) => {
      geoStatus.textContent = '❌ Gagal mengambil lokasi (Izinkan akses GPS).';
    }
  );
});

// ==========================================
// CORE LOGIC & REKAP BULANAN
// ==========================================
function saveToLocalStorage() {
  localStorage.setItem('attendanceLogs', JSON.stringify(attendanceLogs));
}

function updateUI() {
  saveToLocalStorage();
  renderStats();
  renderAttendanceLogs();
}

function renderStats() {
  let totalHadir = 0;
  let totalIzinSakit = 0;
  const currentMonthStr = new Date().toISOString().substring(5, 7);

  attendanceLogs.forEach(log => {
    const logMonth = log.date.split('-')[1];
    if (logMonth === currentMonthStr) {
      if (log.status === 'Hadir') totalHadir++;
      else if (log.status === 'Izin' || log.status === 'Sakit') totalIzinSakit++;
    }
  });

  const totalRecords = totalHadir + totalIzinSakit;
  const percentage = totalRecords > 0 ? Math.round((totalHadir / totalRecords) * 100) : 0;

  statHadir.textContent = totalHadir;
  statIzinSakit.textContent = totalIzinSakit;
  statPersentase.textContent = `${percentage}%`;
}

function renderAttendanceLogs() {
  attendanceLogContainer.innerHTML = '';
  const filterMonth = attendanceMonthFilter.value;

  const filtered = attendanceLogs.filter(log => {
    const logMonth = log.date.split('-')[1];
    return filterMonth === 'all' || logMonth === filterMonth;
  });

  if (filtered.length === 0) {
    attendanceLogContainer.innerHTML = `<p style="text-align:center; padding:1.5rem; font-weight:700;">Belum ada data rekap absensi.</p>`;
    return;
  }

  filtered.sort((a, b) => new Date(b.date + 'T' + b.time) - new Date(a.date + 'T' + a.time)).forEach(log => {
    const item = document.createElement('div');
    
    let statusClass = 'entry-income';
    if (log.status === 'Izin') statusClass = 'entry-warning';
    if (log.status === 'Sakit') statusClass = 'entry-expense';
    
    item.className = `transaction-item ${statusClass}`;

    const formattedDate = new Date(log.date).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric'
    });

    const gpsInfo = log.coords ? `• 📍 GPS: ${log.coords}` : '';

    item.innerHTML = `
      <div class="item-info">
        <h4>User: ${log.user} (${log.status})</h4>
        <p>Jam: <span>${log.time}</span> • ${formattedDate} ${gpsInfo}</p>
        ${log.note ? `<p style="font-style: italic; font-size: 0.8rem; margin-top: 0.25rem;">Ket: "${log.note}"</p>` : ''}
      </div>
      <div class="item-amount" style="font-size: 0.9rem;">
        ${log.status.toUpperCase()}
      </div>
    `;
    attendanceLogContainer.appendChild(item);
  });
}

// Form Submit Kehadiran
attendanceForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const now = new Date();
  const currentDate = now.toISOString().substring(0, 10);
  const currentTime = now.toLocaleTimeString('id-ID', { hour12: false });

  const newLog = {
    id: Date.now(),
    user: currentUser,
    date: currentDate,
    time: currentTime,
    status: txStatus.value,
    note: txNote.value.trim(),
    coords: txCoordinates.value || null
  };

  attendanceLogs.push(newLog);
  attendanceForm.reset();
  geoStatus.textContent = '📍 Lokasi belum didapatkan';
  updateUI();
});

attendanceMonthFilter.addEventListener('change', renderAttendanceLogs);

// SIMULASI QR CODE SCAN
btnScanQr.addEventListener('click', () => {
  const confirmScan = confirm('Arahkan kamera ke QR Code Absensi Toko/Kantor? \n\n[OK] untuk konfirmasi scan sukses.');
  if (confirmScan) {
    const now = new Date();
    const currentDate = now.toISOString().substring(0, 10);
    const currentTime = now.toLocaleTimeString('id-ID', { hour12: false });

    const qrLog = {
      id: Date.now(),
      user: currentUser,
      date: currentDate,
      time: currentTime,
      status: 'Hadir',
      note: 'Absen instan via QR Code Scanner',
      coords: txCoordinates.value || '-6.200000, 106.816667'
    };

    attendanceLogs.push(qrLog);
    updateUI();
    alert('✅ Presensi berhasil terekam via QR Code!');
  }
});

// EXPORT EXCEL (CSV FORMAT)
btnExportExcel.addEventListener('click', () => {
  if (attendanceLogs.length === 0) {
    alert('Tidak ada data absensi untuk diexport.');
    return;
  }

  let csvContent = 'data:text/csv;charset=utf-8,';
  csvContent += 'No,Nama User,Tanggal,Jam Masuk,Status,Keterangan,Koordinat GPS\r\n';

  attendanceLogs.forEach((log, index) => {
    const row = [
      index + 1,
      log.user,
      log.date,
      log.time,
      log.status,
      `"${log.note || '-'}"`,
      `"${log.coords || '-'}"`
    ].join(',');
    csvContent += row + '\r\n';
  });

  const encodedUri = encodeURI(csvContent);
  const downloadLink = document.createElement('a');
  downloadLink.setAttribute('href', encodedUri);
  downloadLink.setAttribute('download', `Rekap_Absensi_${currentUser}.csv`);
  document.body.appendChild(downloadLink);
  
  downloadLink.click();
  document.body.removeChild(downloadLink);
});

document.addEventListener('DOMContentLoaded', initApp);