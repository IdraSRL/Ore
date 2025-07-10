// File: admin-gradimento.js
;(function() {
  'use strict';

  // Debounce utility
  function debounce(fn, ms) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  }

  // Main module
  const Gradimento = {
    data: [],
    filtered: [],
    charts: {},
    clientCharts: {},

    // Initialize
    async init() {
      this.showLoading();
      await this.loadData();
      this.hideLoading();
      this.bindUI();
      this.renderAll();
      // Auto-refresh ogni 5 minuti
      setInterval(async () => {
        await this.loadData();
        this.renderAll();
      }, 5 * 60 * 1000);
    },

    // Carica dati da Firebase
    async loadData() {
      try {
        const res = await window.firebaseService.getAllFeedback();
        if (!res.success) throw new Error(res.message);
        this.data = res.data || [];
        this.filtered = [...this.data];
        this.populateMonthFilter();
        this.populateClientFilter();
      } catch (err) {
        this.showError(err.message || 'Errore caricamento dati');
      }
    },

    // Associa eventi UI
    bindUI() {
      const elMonth  = document.getElementById('gr-month');
      const elRating = document.getElementById('gr-rating');
      const elEmail  = document.getElementById('gr-email');
      const elClient = document.getElementById('gr-client');
      const btnApply = document.getElementById('gr-apply');
      const btnRef   = document.getElementById('gr-refresh');
      const tbody    = document.getElementById('gr-body');
      const btnSave  = document.getElementById('gr-detail-save');

      if (btnApply) btnApply.addEventListener('click', () => this.applyFilters());
      if (elMonth)  elMonth.addEventListener('change', () => this.applyFilters());
      if (elRating) elRating.addEventListener('change', () => this.applyFilters());
      if (elClient) elClient.addEventListener('change', () => this.applyFilters());
      if (elEmail)  elEmail.addEventListener('input', debounce(() => this.applyFilters(), 300));
      if (btnRef)   btnRef.addEventListener('click', async () => {
        this.showLoading();
        await this.loadData();
        this.hideLoading();
        this.renderAll();
      });
      if (btnSave)  btnSave.addEventListener('click', () => this.saveDetails());

      // Delegate clicks in table
      if (tbody) {
        tbody.addEventListener('click', e => {
          const cm = e.target.closest('.comment-preview');
          if (cm) return this.showComment(cm.dataset.comment);
          const vd = e.target.closest('.btn-view');
          if (vd) return this.viewDetails(vd.dataset.id);
          const saveBtn = e.target.closest('.btn-save-name');
          if (saveBtn) return this.saveClientName(saveBtn);
        });
      }
    },

    // Popola filtro mesi
    populateMonthFilter() {
      const sel = document.getElementById('gr-month');
      if (!sel) return;
      const months = Array.from(new Set(this.data.map(f => f.mese))).sort();
      sel.innerHTML = '<option value="all">Tutti i mesi</option>' +
        months.map(m => `<option value="${m}">${window.utils.getMonthName(m)}</option>`).join('');
    },

    // Popola filtro clienti
    populateClientFilter() {
      const sel = document.getElementById('gr-client');
      if (!sel) return;
      const clients = Array.from(new Set(this.data.map(f => f.nomeCliente || f.email))).sort();
      sel.innerHTML = '<option value="all">Tutti i clienti</option>' +
        clients.map(c => `<option value="${c}">${c}</option>`).join('');
    },

    // Rendering completo
    renderAll() {
      this.renderStats();
      this.renderBar();
      this.renderLine();
      this.renderClientCharts();
      this.renderTable();
    },

    // Statistiche
    renderStats() {
      const stats = window.firebaseService.calculateStats(this.filtered);
      this.setText('gr-total',   stats.totalClients);
      this.setText('gr-avg',     stats.avgRating.toFixed(1));
      this.setText('gr-monthly', stats.thisMonth);
      this.setText('gr-comments',stats.withComments);
    },
    setText(id, txt) {
      const el = document.getElementById(id);
      if (el) el.textContent = txt;
    },

    // Grafici principali
    renderBar() {
      const canvas = document.getElementById('gr-bar');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const stats = window.firebaseService.calculateStats(this.filtered);
      if (this.charts.bar) this.charts.bar.destroy();
      this.charts.bar = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Pulizia','Prodotti','Comunicazione'],
          datasets:[{
            data: stats.questionsAvg,
            backgroundColor:['rgba(99,102,241,0.8)','rgba(16,185,129,0.8)','rgba(245,158,11,0.8)'],
            borderColor:['rgba(99,102,241,1)','rgba(16,185,129,1)','rgba(245,158,11,1)'],
            borderWidth:2,
            borderRadius: 8,
            borderSkipped: false,
          }]
        },
        options:{
          responsive:true,
          maintainAspectRatio:false,
          plugins:{
            legend:{display:false},
            tooltip: {
              backgroundColor: 'rgba(31, 41, 55, 0.9)',
              titleColor: '#f3f4f6',
              bodyColor: '#f3f4f6',
              borderColor: '#4b5563',
              borderWidth: 1,
              cornerRadius: 8,
            }
          },
          scales:{
            y:{
              beginAtZero:true,
              max:10,
              grid: {
                color: 'rgba(75, 85, 99, 0.3)'
              },
              ticks: {
                color: '#9ca3af'
              }
            },
            x: {
              grid: {
                color: 'rgba(75, 85, 99, 0.3)'
              },
              ticks: {
                color: '#9ca3af'
              }
            }
          }
        }
      });
    },

    renderLine() {
      const canvas = document.getElementById('gr-line');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const stats = window.firebaseService.calculateStats(this.filtered);
      const months = Object.keys(stats.monthlyTrend).sort();
      if (this.charts.line) this.charts.line.destroy();
      this.charts.line = new Chart(ctx, {
        type:'line',
        data:{ 
          labels: months.map(m=>window.utils.getMonthName(m)), 
          datasets:[{ 
            data: months.map(m=>stats.monthlyTrend[m]), 
            backgroundColor:'rgba(99,102,241,0.1)', 
            borderColor:'rgba(99,102,241,1)', 
            fill:true, 
            tension:0.4,
            pointBackgroundColor: 'rgba(99,102,241,1)',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 6,
            pointHoverRadius: 8,
          }] 
        },
        options:{
          responsive:true,
          maintainAspectRatio:false,
          plugins:{
            legend:{display:false},
            tooltip: {
              backgroundColor: 'rgba(31, 41, 55, 0.9)',
              titleColor: '#f3f4f6',
              bodyColor: '#f3f4f6',
              borderColor: '#4b5563',
              borderWidth: 1,
              cornerRadius: 8,
            }
          },
          scales:{
            y:{
              beginAtZero:true,
              max:10,
              grid: {
                color: 'rgba(75, 85, 99, 0.3)'
              },
              ticks: {
                color: '#9ca3af'
              }
            },
            x: {
              grid: {
                color: 'rgba(75, 85, 99, 0.3)'
              },
              ticks: {
                color: '#9ca3af'
              }
            }
          }
        }
      });
    },

    // Grafici per cliente
    renderClientCharts() {
      const container = document.getElementById('gr-client-charts');
      if (!container) return;

      const stats = window.firebaseService.calculateStats(this.filtered);
      const clientStats = stats.clientStats;

      // Pulisci container
      container.innerHTML = '';

      // Crea sezione per grafici clienti
      const section = document.createElement('div');
      section.className = 'gr-client-charts fade-in';
      section.innerHTML = `
        <div class="gr-divider"></div>
        <h4 style="color: #e5e7eb; margin-bottom: 1.5rem;">
          <i class="fas fa-user-chart me-2"></i></h4>
      `;

      // Ordina clienti per media voto (decrescente)
      const sortedClients = Object.entries(clientStats)
        .sort(([,a], [,b]) => b.avgRating - a.avgRating)
        .slice(0, 6); // Mostra solo i primi 6 clienti

      sortedClients.forEach(([clientName, clientData]) => {
        const chartContainer = document.createElement('div');
        chartContainer.className = 'gr-client-chart-container slide-up';
        
        const canvasId = `client-chart-${clientName.replace(/[^a-zA-Z0-9]/g, '')}`;
        chartContainer.innerHTML = `
          <h5>
            <i class="fas fa-user me-2"></i>${clientName}
          </h5>
          <div class="client-info">
            <span class="me-3">📊 Media: <strong>${clientData.avgRating}</strong></span>
            <span class="me-3">📝 Feedback: <strong>${clientData.count}</strong></span>
            <span>📧 Email: <strong>${clientData.emails.join(', ')}</strong></span>
          </div>
          <canvas id="${canvasId}" style="height: 200px !important;"></canvas>
        `;
        
        section.appendChild(chartContainer);

        // Crea grafico per il cliente
        setTimeout(() => {
          const canvas = document.getElementById(canvasId);
          if (canvas) {
            const ctx = canvas.getContext('2d');
            this.clientCharts[canvasId] = new Chart(ctx, {
              type: 'radar',
              data: {
                labels: ['Pulizia', 'Prodotti', 'Comunicazione'],
                datasets: [{
                  label: clientName,
                  data: clientData.questionsAvg,
                  backgroundColor: 'rgba(99, 102, 241, 0.2)',
                  borderColor: 'rgba(99, 102, 241, 1)',
                  borderWidth: 2,
                  pointBackgroundColor: 'rgba(99, 102, 241, 1)',
                  pointBorderColor: '#ffffff',
                  pointBorderWidth: 2,
                  pointRadius: 6,
                }]
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    backgroundColor: 'rgba(31, 41, 55, 0.9)',
                    titleColor: '#f3f4f6',
                    bodyColor: '#f3f4f6',
                    borderColor: '#4b5563',
                    borderWidth: 1,
                    cornerRadius: 8,
                  }
                },
                scales: {
                  r: {
                    beginAtZero: true,
                    max: 10,
                    grid: {
                      color: 'rgba(75, 85, 99, 0.3)'
                    },
                    pointLabels: {
                      color: '#9ca3af',
                      font: {
                        size: 12
                      }
                    },
                    ticks: {
                      color: '#9ca3af',
                      backdropColor: 'transparent'
                    }
                  }
                }
              }
            });
          }
        }, 100);
      });

      container.appendChild(section);
    },

    // Tabella
    renderTable() {
      const tbody = document.getElementById('gr-body');
      if (!tbody) return;
      if (!this.filtered.length) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center">Nessun feedback trovato</td></tr>';
        return;
      }
      tbody.innerHTML = this.filtered.map(f => {
        const avg = ((f.risposta1+f.risposta2+f.risposta3)/3).toFixed(1);
        const clientName = f.nomeCliente || f.email;
        return `
          <tr class="fade-in">
            <td>
              <input type="text" class="client-name-input" value="${clientName}" 
                     data-email="${f.email}" data-month="${f.mese}" 
                     placeholder="Nome cliente">
              <button class="btn-save-name" title="Salva nome">💾</button>
            </td>
            <td>
              <span>${f.email}</span>
            </td>
            <td><span class="badge" style="background: linear-gradient(45deg, #6366f1, #8b5cf6);">${f.risposta1}</span></td>
            <td><span class="badge" style="background: linear-gradient(45deg, #10b981, #34d399);">${f.risposta2}</span></td>
            <td><span class="badge" style="background: linear-gradient(45deg, #f59e0b, #fbbf24);">${f.risposta3}</span></td>
            <td><strong style="color: #60a5fa;">${avg}</strong></td>
            <td>${window.utils.formatDate(f.dataInvio)}</td>
            <td>
              <span class="comment-preview" data-comment="${f.commento||''}">
                ${f.commento ? '💬 Visualizza' : '—'}
              </span>
            </td>
            <td>
              <button class="btn-view" data-id="${f.id}">🔍</button>
            </td>
          </tr>
        `;
      }).join('');
    },

    // Salva nome cliente
    async saveClientName(button) {
      const input = button.previousElementSibling;
      const email = input.dataset.email;
      const month = input.dataset.month;
      const newName = input.value.trim();

      if (!newName) {
        alert('Inserisci un nome valido');
        return;
      }

      this.showLoading();
      try {
        const result = await window.firebaseService.updateFeedbackClientName(email, newName, month);
        if (result.success) {
          // Aggiorna i dati locali
          const feedback = this.data.find(f => f.email === email && f.mese === month);
          if (feedback) {
            feedback.nomeCliente = newName;
          }
          
          // Ricarica tutto
          await this.loadData();
          this.renderAll();
          
          // Mostra messaggio di successo
          this.showSuccess('Nome cliente aggiornato con successo!');
        } else {
          this.showError(result.message);
        }
      } catch (error) {
        this.showError('Errore durante l\'aggiornamento del nome cliente');
      } finally {
        this.hideLoading();
      }
    },

    // Mostra commento
    showComment(comment) {
      if (!comment.trim()) {
        alert('Nessun commento disponibile');
        return;
      }
      document.getElementById('gr-modal-text').textContent = comment;
      new bootstrap.Modal(document.getElementById('gr-modal')).show();
    },

    // Dettagli
    viewDetails(id) {
      const record = this.data.find(f=>String(f.id)===id);
      if(!record) return this.showError('Feedback non trovato');
      
      document.getElementById('gr-detail-id').value = record.id;
      document.getElementById('gr-detail-email').value = record.email;
      document.getElementById('gr-detail-client-name').value = record.nomeCliente || record.email;
      document.getElementById('gr-detail-month').textContent = window.utils.getMonthName(record.mese);
      document.getElementById('gr-detail-q1').textContent = record.risposta1;
      document.getElementById('gr-detail-q2').textContent = record.risposta2;
      document.getElementById('gr-detail-q3').textContent = record.risposta3;
      document.getElementById('gr-detail-comment').textContent = record.commento||'—';
      
      new bootstrap.Modal(document.getElementById('gr-detail-modal')).show();
    },

    // Salva modifiche dal modal
    async saveDetails() {
      const id = document.getElementById('gr-detail-id').value;
      const email = document.getElementById('gr-detail-email').value.trim();
      const clientName = document.getElementById('gr-detail-client-name').value.trim();
      
      const record = this.data.find(f=>String(f.id)===id);
      if(!record) return this.showError('Feedback non trovato');

      let hasChanges = false;

      // Aggiorna email se cambiata
      if(email && email !== record.email){
        // Qui dovresti implementare la logica per cambiare l'email
        // Per ora mostriamo solo un avviso
        this.showError('Modifica email non ancora implementata');
        return;
      }

      // Aggiorna nome cliente se cambiato
      if(clientName && clientName !== record.nomeCliente) {
        this.showLoading();
        try {
          const result = await window.firebaseService.updateFeedbackClientName(record.email, clientName, record.mese);
          if(result.success) {
            record.nomeCliente = clientName;
            hasChanges = true;
          } else {
            this.showError(result.message);
            return;
          }
        } catch(error) {
          this.showError('Errore durante l\'aggiornamento');
          return;
        } finally {
          this.hideLoading();
        }
      }

      if(hasChanges) {
        await this.loadData();
        this.renderAll();
        this.showSuccess('Dettagli aggiornati con successo!');
      }

      bootstrap.Modal.getInstance(document.getElementById('gr-detail-modal')).hide();
    },

    // Filtri
    applyFilters() {
      const m = document.getElementById('gr-month').value;
      const r = document.getElementById('gr-rating').value;
      const e = document.getElementById('gr-email').value.trim().toLowerCase();
      const c = document.getElementById('gr-client').value;
      
      this.filtered = this.data.filter(f => {
        const avg = (f.risposta1+f.risposta2+f.risposta3)/3;
        const clientName = f.nomeCliente || f.email;
        
        if(m !== 'all' && f.mese !== m) return false;
        if(c !== 'all' && clientName !== c) return false;
        if((r === 'high' && avg < 8) || (r === 'medium' && (avg < 5 || avg >= 8)) || (r === 'low' && avg >= 5)) return false;
        if(e && !f.email.toLowerCase().includes(e) && !clientName.toLowerCase().includes(e)) return false;
        
        return true;
      });
      this.renderAll();
    },

    // Loading & error & success
    showLoading() {
      const overlay = document.getElementById('loading-overlay');
      if (overlay) {
        overlay.style.display = 'flex';
      }
    },
    
    hideLoading() {
      const overlay = document.getElementById('loading-overlay');
      if (overlay) {
        overlay.style.display = 'none';
      }
    },
    
    showError(msg) {
      // Crea toast di errore
      this.showToast(msg, 'error');
    },
    
    showSuccess(msg) {
      // Crea toast di successo
      this.showToast(msg, 'success');
    },
    
    showToast(message, type = 'info') {
      const toast = document.createElement('div');
      toast.className = `toast-notification toast-${type}`;
      toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        animation: slideInRight 0.3s ease-out;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      `;
      
      if (type === 'error') {
        toast.style.background = 'linear-gradient(45deg, #ef4444, #dc2626)';
      } else if (type === 'success') {
        toast.style.background = 'linear-gradient(45deg, #10b981, #059669)';
      } else {
        toast.style.background = 'linear-gradient(45deg, #6366f1, #4f46e5)';
      }
      
      toast.textContent = message;
      document.body.appendChild(toast);
      
      setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    }
  };

  // Aggiungi stili per le animazioni dei toast
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideInRight {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }
  `;
  document.head.appendChild(style);

  document.addEventListener('DOMContentLoaded', () => Gradimento.init());
})();