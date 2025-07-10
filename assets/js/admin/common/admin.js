// admin.js

import { AuthService } from "../../auth/auth.js";
import { FirestoreService } from "../../common/firestore-service.js";
import { handleBnbFilter } from "../bnb/bnb-form.js";
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';
import { db } from "../../common/firebase-config.js";
import { exportToExcel } from "../../common/export-excel.js";
import {
  calculateTotalMinutes,
  formatDecimalHours
} from '../../common/time-utilis.js';


let currentData = {};

// Inizializza quando il DOM è pronto
document.addEventListener('DOMContentLoaded', async () => {
  // Controlla autenticazione
  if (!AuthService.checkAuth() || !AuthService.isAdmin()) {
    window.location.href = 'login.html';
    return;
  }

  // UI elements
  const userDisplay = document.getElementById('userDisplay');
  const logoutBtn = document.getElementById('logoutBtn');
  const empSelect = document.getElementById('employeeSelect');
  const monthSelect = document.getElementById('monthSelect');
  const exportBtn = document.getElementById('exportBtn');
  const summaryDiv = document.getElementById('summaryContainer');
  const detailDiv = document.getElementById('dayDetail');

  // Mostra utente e logout
  const user = AuthService.getCurrentUser();
  userDisplay.textContent = `${user} (Admin)`;
  logoutBtn.onclick = () => AuthService.logout();

  // Popola employee select da Firestore
  try {
    const employees = await FirestoreService.getEmployees();
    empSelect.add(new Option('Tutti i dipendenti', 'all'));
    employees.sort((a, b) => a.name.localeCompare(b.name, 'it'))
      .forEach(emp => empSelect.add(new Option(emp.name, emp.name)));
  } catch (err) {
    console.error('Errore caricamento dipendenti:', err);
    showAlert('Impossibile caricare elenco dipendenti', 'danger');
  }

  // Popola ultimi 12 mesi
  (function populateMonths() {
    const today = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('it-IT', { month: 'long', year: 'numeric' });
      const opt = new Option(label, val);
      if (i === 0) opt.selected = true;
      monthSelect.add(opt);
    }
  })();

  // Event listeners
  empSelect.onchange = loadData;
  monthSelect.onchange = loadData;
  exportBtn.onclick = () => {
    if (!currentData || !Object.keys(currentData).length) {
      showAlert('Nessun dato da esportare', 'warning');
      return;
    }
    const [year, month] = monthSelect.value.split('-');
    exportToExcel(currentData, year, Number(month));
  };

  // Carica dati iniziali
  await loadData();
  initBnBSection();
});

/**
 * Carica e visualizza il summary mensile
 */
async function loadData() {
  const summaryDiv = document.getElementById('summaryContainer');
  summaryDiv.innerHTML = '<p class="text-center">Caricamento...</p>';
  const empSelect = document.getElementById('employeeSelect');
  const monthSelect = document.getElementById('monthSelect');
  const emp = empSelect.value;
  const [year, month] = monthSelect.value.split('-');

  try {
    let result;
    if (emp === 'all') {
      result = await FirestoreService.getAllEmployeesMonth(year, Number(month));
    } else {
      const r = await FirestoreService.getEmployeeMonth(emp, year, Number(month));
      result = { success: r.success, data: { [emp]: r.data } };
    }
    if (!result.success) throw new Error('Fetch fallita');

    // include tutti i dipendenti (anche con days = {})
    currentData = result.data;
    renderSummary(currentData, year, Number(month));
  } catch (err) {
    console.error('Errore loadData:', err);
    document.getElementById('summaryContainer').innerHTML = '<p class="text-danger text-center">Errore caricamento dati</p>';
  }
}

/**
 * Renderizza il summary nella pagina
 */
function renderSummary(data, year, month) {
  const summaryDiv = document.getElementById('summaryContainer');
  const detailDiv = document.getElementById('dayDetail');

  if (!Object.keys(data).length) {
    summaryDiv.innerHTML = '<p class="text-center text-muted">Nessun dato disponibile</p>';
    detailDiv.innerHTML = '<p class="text-center text-muted">Seleziona un giorno</p>';
    return;
  }

  summaryDiv.innerHTML = Object.entries(data)
    .map(([name, days], idx) => {
      const stats = calcStats(days);
      const cardsHtml = [
        ['Ore Lavorate', stats.hoursDec, 'text-primary'],
        ['Malattia', stats.sick, 'text-danger'],
        ['Ferie', stats.vac, 'text-info'],
        ['Riposo', stats.rest, 'text-warning']
      ].map(([label, value, cls]) => `
      <div class="col">
        <div class="card text-center">
          <div class="card-body">
            <h6 class="card-title ${cls}">${label}</h6>
            <p class="display-6 mb-0">${value}</p>
          </div>
        </div>
      </div>`).join('');

      const rowsHtml = Array.from(
        { length: new Date(year, month, 0).getDate() },
        (_, i) => i + 1
      )
        .filter(d => new Date(year, month - 1, d) <= new Date())
        .map(d => formatRow(name, days, year, month, d))
        .join('');

      const toggleId = `details-${idx}`;

      return `
      <div class="mb-5">
        <h4>${name}</h4>

        <div class="row row-cols-1 row-cols-md-4 g-3 mb-4">
          ${cardsHtml}
        </div>

        <button class="btn btn-sm btn-outline-secondary mb-3"
                type="button"
                data-bs-toggle="collapse"
                data-bs-target="#${toggleId}"
                aria-expanded="false"
                aria-controls="${toggleId}">
          Mostra dettagli ▼
        </button>

        <div class="collapse" id="${toggleId}">
          <div class="table-responsive">
            <table class="table table-dark table-striped mb-0">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Ore</th>
                  <th>Status</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </div>
        </div>
      </div>`;
    })
    .join('');


  // Attacca listener bottoni di dettaglio
  summaryDiv.querySelectorAll('.view-btn').forEach(btn => btn.onclick = onViewDetail);
}

/**
 * Calcola statistiche mensili
 */
function calcStats(days) {
  let rawTotal = 0, sick = 0, vac = 0, rest = 0;

  Object.values(days).forEach(d => {
    if (d.malattia) {
      sick++;
    } else if (d.ferie) {
      vac++;
    } else if (d.riposo) {
      rest++;
    } else if (Array.isArray(d.attività) && d.attività.length) {
      const flat = d.attività.map(a => ({
        minutes: parseInt(a.minuti, 10) || 0,
        multiplier: parseInt(a.moltiplicatore, 10) || 1,
        people: parseInt(a.persone, 10) || 1
      }));
      rawTotal += calculateTotalMinutes(flat);
    }
  });

  // Ore decimali a 2 cifre
  const decimal = formatDecimalHours(rawTotal, 2);
  // Formattato in italiano con 2 decimali
  const formatted = decimal.toLocaleString('it-IT', { minimumFractionDigits: 2 });

  return { hoursDec: formatted, sick, vac, rest };
}


/**
 * Genera una riga per il giorno
 */
function formatRow(name, days, year, month, dayNum) {
  const date = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
  const weekday = new Date(date).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' });
  const d = days[date] || {};
  let status = '', hours = '';
  if (d.malattia) status = '<span class="badge bg-danger">Malattia</span>';
  else if (d.ferie) status = '<span class="badge bg-info">Ferie</span>';
  else if (d.riposo) status = '<span class="badge bg-warning text-dark">Riposo</span>';
  else if (Array.isArray(d.attività) && d.attività.length) {
    const flat = d.attività.map(a => ({
      minutes: parseInt(a.minuti, 10) || 0,
      multiplier: parseInt(a.moltiplicatore, 10) || 1,
      people: parseInt(a.persone, 10) || 1
    }));
    const raw = calculateTotalMinutes(flat);
    const dec = formatDecimalHours(raw, 2);
    hours = dec.toLocaleString('it-IT', { minimumFractionDigits: 2 });
  }

  return `
    <tr data-date="${date}" data-emp="${name}">
      <td>${weekday}</td>
      <td>${hours}</td>
      <td>${status}</td>
      <td><button class="btn btn-sm btn-outline-secondary view-btn">Visualizza</button></td>
    </tr>`;
}

/**
 * Mostra il modal di dettaglio giorno
 */
async function onViewDetail(e) {
  const tr = e.currentTarget.closest('tr');
  const date = tr.dataset.date;
  const emp = tr.dataset.emp;
  let dayData = {};
  try {
    const res = await FirestoreService.getEmployeeDay(emp, date);
    dayData = res.success ? res.data : {};
  } catch { }
  showDayModal(emp, date, dayData);
}

/**
 * Costruisce e mostra il modal per edit
 */
function showDayModal(emp, date, day) {
  const container = document.getElementById('dayDetail');
  const title = new Date(date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  let html = `<h4>${emp} - ${title}</h4>`;
  ['riposo', 'ferie', 'malattia'].forEach(key => {
    if (day[key]) {
      const cls = key === 'ferie' ? 'info' : key === 'malattia' ? 'danger' : 'warning';
      html += `<div class="alert alert-${cls}">${key.charAt(0).toUpperCase() + key.slice(1)}</div>`;
    }
  });
  html += `
    <form id="editForm">
      <div class="table-responsive">
        <table class="table table-bordered">
          <thead><tr><th>Attività</th><th>Min</th><th>Pers</th><th>Mol</th><th>Azioni</th></tr></thead>
          <tbody id="actBody">
`;
  (day.attività || []).forEach((a, i) => {
    html += `
      <tr>
        <td><input type="text" name="nome_${i}" class="form-control" value="${a.nome || ''}"></td>
        <td><input type="number" name="minuti_${i}" class="form-control" value="${a.minuti || 0}"></td>
        <td><input type="number" name="persone_${i}" class="form-control" value="${a.persone || 1}"></td>
        <td><input type="number" step="0.1" name="moltiplicatore_${i}" class="form-control" value="${a.moltiplicatore || 1}"></td>
        <td><button type="button" class="btn btn-outline-secondary btn-sm" onclick="this.closest('tr').remove()">Elim</button></td>
      </tr>`;
  });
  html += `
          </tbody>
        </table>
      </div>
      <button type="button" id="addAct" class="btn btn-outline-secondary mb-2">Aggiungi</button>
      <button type="submit" class="btn btn-success">Salva</button>
    </form>`;
  container.innerHTML = html;
  const modalEl = document.getElementById('dayDetailModal');
  new bootstrap.Modal(modalEl).show();

  document.getElementById('addAct').onclick = () => {
    const body = document.getElementById('actBody');
    const idx = body.children.length;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="text" name="nome_${idx}" class="form-control"></td>
      <td><input type="number" name="minuti_${idx}" class="form-control" value="0"></td>
      <td><input type="number" name="persone_${idx}" class="form-control" value="1"></td>
      <td><input type="number" step="0.1" name="moltiplicatore_${idx}" class="form-control" value="1"></td>
      <td><button type="button" class="btn btn-outline-secondary btn-sm" onclick="this.closest('tr').remove()">Elim</button></td>
    `;
    body.appendChild(tr);
  };

  document.getElementById('editForm').onsubmit = async ev => {
    ev.preventDefault();
    const fm = new FormData(ev.target);
    const acts = Array.from(document.getElementById('actBody').children).map((r, i) => ({
      nome: fm.get(`nome_${i}`),
      minuti: +fm.get(`minuti_${i}`),
      persone: +fm.get(`persone_${i}`),
      moltiplicatore: +fm.get(`moltiplicatore_${i}`)
    })).filter(a => a.nome);
    try {
      await FirestoreService.saveEmployeeDay(emp, date, { ...day, attività: acts });
      alert('Salvato');
      loadData();
      bootstrap.Modal.getInstance(modalEl).hide();
    } catch {
      alert('Errore salvataggio');
    }
  };
}

/**
 * Mostra alert temporaneo
 */
function showAlert(msg, type = 'info') {
  const a = document.createElement('div');
  a.className = `alert alert-${type} fixed-top m-3`;
  a.textContent = msg;
  document.body.append(a);
  setTimeout(() => a.remove(), 4000);
}

/**
 * Inizializza sezione BnB con filtro
 */
function initBnBSection() {
  const filterBtn = document.getElementById('bnbFilterBtn');
  const dateInput = document.getElementById('bnbFilterDate');
  const container = document.getElementById('bnbEntriesContainer');
  if (!filterBtn || !dateInput || !container) return;

  filterBtn.onclick = async () => {
    container.innerHTML = '';
    const date = dateInput.value;
    if (!date) {
      container.innerHTML = '<p class="text-muted">Seleziona data</p>';
      return;
    }
    try {
      const rows = await handleBnbFilter(date);
      if (!rows.length) {
        container.innerHTML = `<p class="text-center text-muted">Nessun bigliettino per ${date}.</p>`;
        return;
      }
      const wrapper = document.createElement('div'); wrapper.className = 'table-responsive';
      const table = document.createElement('table'); table.className = 'table table-bordered custom mb-0';
      const thead = document.createElement('thead');
      const headRow = document.createElement('tr');
      ['Data', 'Dip1', 'Dip2', 'BnB', 'Azioni'].forEach(text => {
        const th = document.createElement('th'); th.className = 'fw-bold text-center'; th.textContent = text;
        headRow.appendChild(th);
      }); thead.appendChild(headRow); table.appendChild(thead);
      const tbody = document.createElement('tbody');
      rows.forEach(entry => {
        const trMain = document.createElement('tr');
        ['date', 'dip1', 'dip2', 'bnb'].forEach(key => {
          const td = document.createElement('td'); td.textContent = entry[key] || '-'; trMain.appendChild(td);
        });
        const tdDel = document.createElement('td');
        const btn = document.createElement('button');
        btn.className = 'btn btn-sm btn-outline-danger'; btn.textContent = 'Elimina';
        btn.onclick = () => onDelete(entry.date, entry.bnb);
        tdDel.appendChild(btn); trMain.appendChild(tdDel);
        tbody.appendChild(trMain);
        // TODO: append task rows and biancheria if needed
      });
      table.appendChild(tbody); wrapper.appendChild(table); container.appendChild(wrapper);
    } catch (err) {
      console.error(err); container.innerHTML = '<p class="text-danger text-center">Errore caricamento bigliettini</p>';
    }
  };

  async function onDelete(date, bnbKey) {
    if (!confirm('Eliminare?')) return;
    try {
      const ref = doc(db, 'Bigliettini', date);
      const snap = await getDoc(ref);
      const data = snap.exists() ? snap.data() : {};
      delete data[bnbKey];
      await setDoc(ref, data);
      filterBtn.click();
    } catch {
      alert('Errore eliminazione');
    }
  }

}
/**
 * Carica e renderizza tutti i bigliettini BnB per la data indicata
 * @param {string} date  // 'YYYY-MM-DD'
 * @param {HTMLElement} container
 */
export async function loadBnbEntries(date, container) {
  container.innerHTML = '';  // reset
  try {
    const ref = doc(db, 'Bigliettini', date);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      container.innerHTML = '<p class="text-muted">Nessun bigliettino per questa data.</p>';
      return;
    }
    const data = snap.data();

    Object.entries(data).forEach(([safeKey, d]) => {
      const bnbName = safeKey.replace(/_/g, '.');

      // Card wrapper
      const card = document.createElement('div');
      card.className = 'card mb-4';
      card.innerHTML = `
        <div class="card-header">
          <strong>${bnbName}</strong> — ${d.dip1}${d.dip2 ? `, ${d.dip2}` : ''}
        </div>
        <div class="card-body p-3">
          <h6>Attività</h6>
          <table class="table table-sm mb-3">
            <thead>
              <tr>
                <th>Check-Out</th><th>Refresh</th><th>Refresh Prof.</th>
                <th>Area Comune</th><th>Ciabattine</th><th>Ore Extra</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${d.checkout || 0}</td>
                <td>${d.refresh || 0}</td>
                <td>${d.refreshProfondo || 0}</td>
                <td>${d.areaComune || 0}</td>
                <td>${d.ciabattine || 0}</td>
                <td>${d.oreExtra || 0}</td>
              </tr>
            </tbody>
          </table>
          <h6>Biancheria</h6>
          <table class="table table-sm">
            <thead>
              <tr>
                <th>Voce</th>
                <th>Sporco</th><th>Pulito</th><th>Magazzino</th>
              </tr>
            </thead>
            <tbody>
              ${['matrimoniale', 'federa', 'viso', 'corpo', 'bidet', 'scendiBagno']
          .map(field => `
                  <tr>
                    <td class="text-capitalize">${field}</td>
                    <td>${(d.sporco?.[field] ?? 0)}</td>
                    <td>${(d.pulito?.[field] ?? 0)}</td>
                    <td>${(d.magazzino?.[field] ?? 0)}</td>
                  </tr>
                `).join('')}
            </tbody>
          </table>
        </div>
      `;
      container.appendChild(card);
    });

  } catch (err) {
    console.error('❌ loadBnbEntries error', err);
    container.innerHTML = '<p class="text-danger">Errore caricamento bigliettini.</p>';
  }
}