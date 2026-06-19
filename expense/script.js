// ==========================================
// STATE MANAGEMENT & INITIALIZATION
// ==========================================
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let currentCurrency = localStorage.getItem('currency') || 'IDR';

// Kurs Statis untuk Multi-Currency API (Base IDR)
const EXCHANGE_RATES = {
  IDR: 1,
  USD: 0.000063, // 1 IDR = 0.000063 USD
  SGD: 0.000085  // 1 IDR = 0.000085 SGD
};

const CURRENCY_SYMBOLS = {
  IDR: 'Rp ',
  USD: '$ ',
  SGD: 'SGD$ '
};

// ==========================================
// DOM ELEMENTS
// ==========================================
const transactionForm = document.getElementById('transactionForm');
const txTitle = document.getElementById('txTitle');
const txAmount = document.getElementById('txAmount');
const txType = document.getElementById('txType');
const txCategory = document.getElementById('txCategory');
const txDate = document.getElementById('txDate');

const transactionContainer = document.getElementById('transactionContainer');
const totalSaldoEl = document.getElementById('totalSaldo');
const totalPemasukanEl = document.getElementById('totalPemasukan');
const totalPengeluaranEl = document.getElementById('totalPengeluaran');

const monthlyFilter = document.getElementById('monthlyFilter');
const searchTransaction = document.getElementById('searchTransaction');
const currencySelector = document.getElementById('currencySelector');

const exportPdfBtn = document.getElementById('exportPdfBtn');
const importJsonBtn = document.getElementById('importJsonBtn');
const canvas = document.getElementById('cashflowChart');

// ==========================================
// UTILITY FUNCTIONS
// ==========================================
function formatValue(amountInIDR) {
  const converted = amountInIDR * EXCHANGE_RATES[currentCurrency];
  const symbol = CURRENCY_SYMBOLS[currentCurrency];
  
  if (currentCurrency === 'IDR') {
    return symbol + Math.round(converted).toLocaleString('id-ID');
  } else {
    return symbol + converted.toFixed(2);
  }
}

function saveToLocalStorage() {
  localStorage.setItem('transactions', JSON.stringify(transactions));
  localStorage.setItem('currency', currentCurrency);
}

// ==========================================
// CORE LOGIC & RENDERERS
// ==========================================
function updateUI() {
  saveToLocalStorage();
  renderStats();
  renderTransactions();
  renderNeoChart();
}

function renderStats() {
  let saldo = 0;
  let pemasukanBulanIni = 0;
  let pengeluaranBulanIni = 0;
  
  const currentMonthStr = new Date().toISOString().substring(5, 7); // "06" (Juni)

  transactions.forEach(tx => {
    const txMonth = tx.date.split('-')[1];
    
    if (tx.type === 'income') {
      saldo += tx.amount;
      if (txMonth === currentMonthStr) pemasukanBulanIni += tx.amount;
    } else {
      saldo -= tx.amount;
      if (txMonth === currentMonthStr) pengeluaranBulanIni += tx.amount;
    }
  });

  totalSaldoEl.textContent = formatValue(saldo);
  totalPemasukanEl.textContent = formatValue(pemasukanBulanIni);
  totalPengeluaranEl.textContent = formatValue(pengeluaranBulanIni);
}

function renderTransactions() {
  transactionContainer.innerHTML = '';
  
  const filterMonth = monthlyFilter.value;
  const searchKey = searchTransaction.value.toLowerCase();

  const filtered = transactions.filter(tx => {
    const txMonth = tx.date.split('-')[1];
    const matchesMonth = filterMonth === 'all' || txMonth === filterMonth;
    const matchesSearch = tx.title.toLowerCase().includes(searchKey) || tx.category.toLowerCase().includes(searchKey);
    return matchesMonth && matchesSearch;
  });

  if (filtered.length === 0) {
    transactionContainer.innerHTML = `<p style="text-align:center; padding:1rem; font-weight:600;">Tidak ada transaksi ditemukan.</p>`;
    return;
  }

  filtered.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(tx => {
    const item = document.createElement('div');
    item.className = `transaction-item entry-${tx.type}`;
    
    const formattedDate = new Date(tx.date).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric'
    });

    item.innerHTML = `
      <div class="item-info">
        <h4>${tx.title}</h4>
        <p>Kategori: <span>${tx.category}</span> • ${formattedDate}</p>
      </div>
      <div class="item-amount">
        ${tx.type === 'income' ? '+' : '-'} ${formatValue(tx.amount)}
      </div>
    `;
    transactionContainer.appendChild(item);
  });
}

// Custom Neo-Brutalism Canvas Chart Drawer (Bebas Dependency Eksternal)
function renderNeoChart() {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  let totalIncome = 0;
  let totalExpense = 0;

  transactions.forEach(tx => {
    if (tx.type === 'income') totalIncome += tx.amount;
    else totalExpense += tx.amount;
  });

  const maxVal = Math.max(totalIncome, totalExpense, 1);
  const pad = 40;
  const chartH = canvas.height - pad * 2;
  
  const incH = (totalIncome / maxVal) * chartH;
  const expH = (totalExpense / maxVal) * chartH;

  ctx.lineWidth = 3;
  ctx.strokeStyle = '#000000';
  ctx.font = 'bold 12px Inter, sans-serif';

  // Batang Pemasukan (Hijau)
  ctx.fillStyle = '#34d399';
  ctx.fillRect(60, canvas.height - pad - incH, 80, incH);
  ctx.strokeRect(60, canvas.height - pad - incH, 80, incH);
  ctx.fillStyle = '#000000';
  ctx.fillText(formatValue(totalIncome), 60, canvas.height - pad - incH - 10);
  ctx.fillText('INCOME', 75, canvas.height - pad + 20);

  // Batang Pengeluaran (Pink)
  ctx.fillStyle = '#ff8df3';
  ctx.fillRect(180, canvas.height - pad - expH, 80, expH);
  ctx.strokeRect(180, canvas.height - pad - expH, 80, expH);
  ctx.fillStyle = '#000000';
  ctx.fillText(formatValue(totalExpense), 180, canvas.height - pad - expH - 10);
  ctx.fillText('EXPENSE', 195, canvas.height - pad + 20);
}

// ==========================================
// EVENT LISTENERS
// ==========================================

// Tambah Transaksi Baru
transactionForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const newTx = {
    id: Date.now(),
    title: txTitle.value.trim(),
    amount: parseFloat(txAmount.value),
    type: txType.value,
    category: txCategory.value,
    date: txDate.value
  };

  transactions.push(newTx);
  transactionForm.reset();
  updateUI();
});

// Sistem Filter & Pencarian
monthlyFilter.addEventListener('change', renderTransactions);
searchTransaction.addEventListener('input', renderTransactions);

// Deteksi Switch Multi Currency
currencySelector.value = currentCurrency;
currencySelector.addEventListener('change', (e) => {
  currentCurrency = e.target.value;
  updateUI();
});

// ==========================================
// BONUS FEATURES: EXPORT PDF & IMPORT JSON
// ==========================================

// Export PDF (Menggunakan Print Window Khusus Neo-Brutalism)
exportPdfBtn.addEventListener('click', () => {
  const printWindow = window.open('', '_blank');
  let rowsHtml = '';
  
  transactions.forEach(tx => {
    rowsHtml += `
      <tr style="border: 3px solid #000;">
        <td style="padding: 10px; border: 3px solid #000;">${tx.date}</td>
        <td style="padding: 10px; border: 3px solid #000;">${tx.title}</td>
        <td style="padding: 10px; border: 3px solid #000;">${tx.category}</td>
        <td style="padding: 10px; border: 3px solid #000; font-weight: bold; background: ${tx.type === 'income' ? '#e6fffa' : '#fff5f5'}">
          ${tx.type === 'income' ? '+' : '-'} ${formatValue(tx.amount)}
        </td>
      </tr>
    `;
  });

  printWindow.document.write(`
    <html>
    <head>
      <title>Laporan Transaksi Keuangan</title>
      <style>
        body { font-family: sans-serif; padding: 40px; background: #fff; color: #000; }
        .box { border: 4px solid #000; padding: 20px; box-shadow: 8px 8px 0px #000; border-radius: 12px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="box">
        <h2>EXPENSE TRACKER REPORT</h2>
        <p>Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}</p>
        <table>
          <thead>
            <tr style="background: #fcd34d; border: 3px solid #000;">
              <th style="padding: 10px; border: 3px solid #000; text-align: left;">Tanggal</th>
              <th style="padding: 10px; border: 3px solid #000; text-align: left;">Deskripsi</th>
              <th style="padding: 10px; border: 3px solid #000; text-align: left;">Kategori</th>
              <th style="padding: 10px; border: 3px solid #000; text-align: left;">Nominal</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
      <script>window.print();</script>
    </body>
    </html>
  `);
  printWindow.document.close();
});

// Import JSON Backup Data
importJsonBtn.addEventListener('click', () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  
  input.onchange = e => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.readAsText(file, 'UTF-8');
    
    reader.onload = readerEvent => {
      try {
        const content = JSON.parse(readerEvent.target.result);
        if (Array.isArray(content)) {
          transactions = content;
          updateUI();
          alert('Data JSON Berhasil Diimport!');
        } else {
          alert('Format data JSON tidak valid.');
        }
      } catch (err) {
        alert('Gagal membaca file JSON.');
      }
    }
  }
  input.click();
});

// Load Aplikasi Pertama Kali
document.addEventListener('DOMContentLoaded', () => {
  // Set default input tanggal ke hari ini
  txDate.value = new Date().toISOString().substring(0, 10);
  updateUI();
});