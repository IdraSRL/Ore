// admin-valutazione.js - Gestione valutazioni prodotti nel pannello admin
import { db } from "../../common/firebase-config.js";
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

class AdminValutazioneManager {
    constructor() {
        this.products = [];
        this.ratings = {};
        this.charts = {};
        this.isInitialized = false;
        this.currentView = 'dashboard'; // 'dashboard' | 'products'
    }

    async init() {
        if (this.isInitialized) {
            console.log('AdminValutazioneManager già inizializzato, skip...');
            return;
        }
        
        console.log('Inizializzazione Admin Valutazione Prodotti...');
        this.setupEventListeners();
        await this.loadData();
        this.renderDashboard();
        this.isInitialized = true;
    }

    setupEventListeners() {
        const refreshBtn = document.getElementById('refreshProductsBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refresh());
        }

        // Form aggiunta prodotto
        const saveProductBtn = document.getElementById('saveProductBtn');
        if (saveProductBtn) {
            saveProductBtn.addEventListener('click', () => this.handleAddProduct());
        }

        // Preview immagine
        const imageFileInput = document.getElementById('productImageFile');
        if (imageFileInput) {
            imageFileInput.addEventListener('change', (e) => this.handleImagePreview(e));
        }

        // Auto-genera ID prodotto dal nome
        const productNameInput = document.getElementById('productName');
        const productIdInput = document.getElementById('productId');
        if (productNameInput && productIdInput) {
            productNameInput.addEventListener('input', (e) => {
                if (!productIdInput.value) {
                    const autoId = e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9\s]/g, '')
                        .replace(/\s+/g, '-')
                        .substring(0, 30);
                    productIdInput.value = autoId;
                }
            });
        }

        // Toggle view buttons
        const dashboardBtn = document.getElementById('viewDashboardBtn');
        const productsBtn = document.getElementById('viewProductsBtn');
        
        if (dashboardBtn) {
            dashboardBtn.addEventListener('click', () => this.switchView('dashboard'));
        }
        
        if (productsBtn) {
            productsBtn.addEventListener('click', () => this.switchView('products'));
        }

        // Setup image modal functionality
        this.setupImageModal();
    }

    switchView(view) {
        this.currentView = view;
        const dashboardContent = document.getElementById('dashboardProductsContent');
        const productsListContent = document.getElementById('productsListContent');
        const dashboardBtn = document.getElementById('viewDashboardBtn');
        const productsBtn = document.getElementById('viewProductsBtn');

        if (view === 'dashboard') {
            if (dashboardContent) dashboardContent.style.display = 'block';
            if (productsListContent) productsListContent.style.display = 'none';
            if (dashboardBtn) dashboardBtn.classList.add('active');
            if (productsBtn) productsBtn.classList.remove('active');
            this.renderDashboard();
        } else {
            if (dashboardContent) dashboardContent.style.display = 'none';
            if (productsListContent) productsListContent.style.display = 'block';
            if (dashboardBtn) dashboardBtn.classList.remove('active');
            if (productsBtn) productsBtn.classList.add('active');
            this.renderProductsList();
        }
    }

    setupImageModal() {
        // Riutilizza la logica del modal per le immagini
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('product-image') || e.target.classList.contains('product-detail-image')) {
                this.openImageModal(e.target.src, e.target.alt);
            }
        });

        // Crea modal se non esiste
        if (!document.getElementById('productImageModal')) {
            const modal = document.createElement('div');
            modal.id = 'productImageModal';
            modal.className = 'modal fade';
            modal.innerHTML = `
                <div class="modal-dialog modal-lg modal-dialog-centered">
                    <div class="modal-content bg-dark">
                        <div class="modal-header border-secondary">
                            <h5 class="modal-title text-light">Immagine Prodotto</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body text-center">
                            <img id="modalProductImage" class="img-fluid" style="max-height: 70vh;">
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
    }

    openImageModal(src, alt) {
        const modal = document.getElementById('productImageModal');
        const modalImg = document.getElementById('modalProductImage');
        
        if (modal && modalImg) {
            modalImg.src = src;
            modalImg.alt = alt;
            new bootstrap.Modal(modal).show();
        }
    }

    async refresh() {
        const refreshBtn = document.getElementById('refreshProductsBtn');
        if (refreshBtn) {
            const originalText = refreshBtn.innerHTML;
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Aggiornamento...';
            refreshBtn.disabled = true;

            await this.loadData();
            if (this.currentView === 'dashboard') {
                this.renderDashboard();
            } else {
                this.renderProductsList();
            }

            refreshBtn.innerHTML = originalText;
            refreshBtn.disabled = false;
        }
    }

    async loadData() {
        try {
            await this.loadProducts();
            await this.loadRatings();
        } catch (error) {
            console.error('Errore nel caricamento dati valutazioni:', error);
            this.showError('Errore nel caricamento dei dati valutazioni.');
        }
    }

    async loadProducts() {
        try {
            console.log('Caricamento prodotti per admin dashboard...');
            
            // Carica dalla collezione Products
            const querySnapshot = await getDocs(collection(db, 'Products'));
            
            this.products = [];
            
            querySnapshot.forEach((doc) => {
                this.products.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            console.log('Prodotti caricati per admin dashboard:', this.products.length);
        } catch (error) {
            console.error('Errore nel caricamento prodotti:', error);
        }
    }

    async loadRatings() {
        this.ratings = {};
        
        try {
            console.log('Caricamento valutazioni per admin dashboard...');
            
            for (const product of this.products) {
                try {
                    // Carica tutte le valutazioni per questo prodotto
                    const ratingsRef = collection(db, 'ProductRatings', product.id, 'ratings');
                    const querySnapshot = await getDocs(ratingsRef);
                    
                    this.ratings[product.id] = [];
                    querySnapshot.forEach((doc) => {
                        const data = doc.data();
                        this.ratings[product.id].push({
                            userId: doc.id,
                            ...data
                        });
                    });
                } catch (error) {
                    console.log(`Nessuna valutazione per prodotto ${product.id}`);
                    this.ratings[product.id] = [];
                }
            }
            
            console.log('Valutazioni caricate per admin dashboard:', Object.keys(this.ratings).length);
        } catch (error) {
            console.error('Errore nel caricamento valutazioni:', error);
        }
    }

    handleImagePreview(event) {
        const file = event.target.files[0];
        const preview = document.getElementById('imagePreview');
        const previewImg = document.getElementById('previewImg');
        
        if (file) {
            // Verifica tipo file
            if (!file.type.startsWith('image/')) {
                this.showError('Seleziona un file immagine valido');
                event.target.value = '';
                preview.style.display = 'none';
                return;
            }
            
            // Verifica dimensione (5MB)
            if (file.size > 5 * 1024 * 1024) {
                this.showError('L\'immagine è troppo grande. Massimo 5MB consentiti.');
                event.target.value = '';
                preview.style.display = 'none';
                return;
            }
            
            // Mostra anteprima
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImg.src = e.target.result;
                preview.style.display = 'block';
            };
            reader.readAsDataURL(file);
            
            // Pulisci il campo nome file manuale
            const manualInput = document.getElementById('productImage');
            if (manualInput) {
                manualInput.value = '';
            }
        } else {
            preview.style.display = 'none';
        }
    }

    async handleAddProduct() {
        const form = document.getElementById('addProductForm');
        const formData = new FormData(form);
        
        // Verifica se è stata selezionata un'immagine per l'upload
        const imageFile = formData.get('productImageFile');
        const imageFileName = formData.get('productImage');
        
        if (imageFile && imageFile.size > 0) {
            // Upload dell'immagine
            try {
                const uploadResult = await this.uploadProductImage(imageFile, formData.get('productId'));
                if (!uploadResult.success) {
                    // Se l'upload fallisce, chiedi di usare il campo manuale
                    this.showError(uploadResult.message);
                    return;
                }
                // Usa il nome file restituito dall'upload
                formData.set('productImage', uploadResult.fileName);
            } catch (error) {
                console.error('Errore upload immagine:', error);
                this.showError('Errore durante il caricamento dell\'immagine. Usa il campo nome file manuale.');
                return;
            }
        } else if (!imageFileName) {
            this.showError('Seleziona un\'immagine da caricare o inserisci il nome di un file esistente');
            return;
        }
        
        const productData = {
            id: formData.get('productId').trim(),
            name: formData.get('productName').trim(),
            description: formData.get('productDescription').trim(),
            imageUrl: `assets/img/products/${(formData.get('productImage') || 'default.jpg').trim()}`,
            tagMarca: formData.get('productMarca').trim(),
            tagTipo: formData.get('productTipo').trim(),
            visible: true, // Default visibile
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        // Validazione
        if (!productData.id || !productData.name || !productData.imageUrl || !productData.tagMarca || !productData.tagTipo) {
            this.showError('Tutti i campi sono obbligatori');
            return;
        }

        // Verifica se l'ID esiste già
        if (this.products.find(p => p.id === productData.id)) {
            this.showError('Un prodotto con questo ID esiste già');
            return;
        }

        try {
            await setDoc(doc(db, 'Products', productData.id), productData);
            this.showSuccess('Prodotto aggiunto con successo!');
            
            // Chiudi modal e reset form
            const modal = bootstrap.Modal.getInstance(document.getElementById('addProductModal'));
            modal.hide();
            form.reset();
            
            // Reset preview immagine
            const preview = document.getElementById('imagePreview');
            if (preview) preview.style.display = 'none';
            
            // Ricarica dati
            await this.loadData();
            if (this.currentView === 'dashboard') {
                this.renderDashboard();
            } else {
                this.renderProductsList();
            }
        } catch (error) {
            console.error('Errore nel salvataggio:', error);
            this.showError('Errore nel salvataggio del prodotto');
        }
    }

    async uploadProductImage(file, productId) {
        // Verifica se il file API esiste prima di tentare l'upload
        try {
            const testResponse = await fetch('api/upload-product-image.php', {
                method: 'HEAD'
            });
            
            if (!testResponse.ok) {
                return {
                    success: false,
                    message: 'Servizio di upload immagini non disponibile. Usa il campo nome file manuale.'
                };
            }
        } catch (error) {
            return {
                success: false,
                message: 'Servizio di upload immagini non disponibile. Usa il campo nome file manuale.'
            };
        }
        
        const formData = new FormData();
        formData.append('productImage', file);
        formData.append('productId', productId);

        try {
            const response = await fetch('api/upload-product-image.php', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Errore nella richiesta di upload:', error);
            return {
                success: false,
                message: 'Errore di connessione durante il caricamento dell\'immagine. Usa il campo nome file manuale.'
            };
        }
    }
    async deleteProduct(productId) {
        if (!confirm('Sei sicuro di voler eliminare questo prodotto?')) return;

        try {
            await deleteDoc(doc(db, 'Products', productId));
            this.showSuccess('Prodotto eliminato con successo!');
            await this.loadData();
            if (this.currentView === 'dashboard') {
                this.renderDashboard();
            } else {
                this.renderProductsList();
            }
        } catch (error) {
            console.error('Errore nell\'eliminazione:', error);
            this.showError('Errore nell\'eliminazione del prodotto');
        }
    }

    async toggleProductVisibility(productId, visible) {
        try {
            await updateDoc(doc(db, 'Products', productId), {
                visible: visible,
                updatedAt: serverTimestamp()
            });
            
            // Aggiorna il prodotto locale
            const product = this.products.find(p => p.id === productId);
            if (product) {
                product.visible = visible;
            }
            
            this.showSuccess(`Prodotto ${visible ? 'reso visibile' : 'nascosto'} ai dipendenti`);
        } catch (error) {
            console.error('Errore nell\'aggiornamento visibilità:', error);
            this.showError('Errore nell\'aggiornamento della visibilità');
        }
    }

    renderDashboard() {
        const loadingElement = document.getElementById('loadingProductsMessage');
        const dashboardContent = document.getElementById('dashboardProductsContent');
        const noDataElement = document.getElementById('noProductsData');

        if (loadingElement) loadingElement.style.display = 'none';

        const hasData = this.products.length > 0 && Object.keys(this.ratings).some(key => this.ratings[key].length > 0);

        if (!hasData) {
            if (noDataElement) noDataElement.style.display = 'block';
            if (dashboardContent) dashboardContent.style.display = 'none';
            return;
        }

        if (noDataElement) noDataElement.style.display = 'none';
        if (dashboardContent) dashboardContent.style.display = 'block';

        this.renderStats();
        this.renderProductCharts();
    }

    renderProductsList() {
        const productsListContent = document.getElementById('productsListContent');
        if (!productsListContent) return;

        if (this.products.length === 0) {
            productsListContent.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-box fa-3x text-muted mb-3"></i>
                    <h4 class="text-muted">Nessun prodotto disponibile</h4>
                    <p class="text-muted">Aggiungi il primo prodotto per iniziare.</p>
                </div>
            `;
            return;
        }

        const tableHtml = `
            <div class="table-responsive">
                <table class="table table-dark table-striped">
                    <thead>
                        <tr>
                            <th style="width: 80px;">Immagine</th>
                            <th>Nome</th>
                            <th>Marca</th>
                            <th>Tipo</th>
                            <th>Valutazioni</th>
                            <th>Media</th>
                            <th style="width: 120px;">Visibilità</th>
                            <th style="width: 100px;">Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.products.map(product => this.renderProductRow(product)).join('')}
                    </tbody>
                </table>
            </div>
        `;

        productsListContent.innerHTML = tableHtml;

        // Aggiungi event listeners per i toggle di visibilità
        this.products.forEach(product => {
            const toggle = document.getElementById(`visibility-toggle-${product.id}`);
            if (toggle) {
                toggle.addEventListener('change', (e) => {
                    this.toggleProductVisibility(product.id, e.target.checked);
                });
            }
        });
    }

    renderProductRow(product) {
        const productRatings = this.ratings[product.id] || [];
        const ratingsCount = productRatings.length;
        
        let averageRating = 0;
        if (ratingsCount > 0) {
            const totalScore = productRatings.reduce((sum, rating) => {
                return sum + rating.efficacia + rating.profumo + rating.facilita;
            }, 0);
            averageRating = (totalScore / (ratingsCount * 3)).toFixed(1);
        }

        const isVisible = product.visible !== false; // Default true se non specificato

        return `
            <tr>
                <td>
                    <img src="${product.imageUrl}" 
                         alt="${product.name}" 
                         class="product-image" 
                         style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; cursor: pointer;"
                         onerror="this.src='https://images.pexels.com/photos/4239091/pexels-photo-4239091.jpeg?auto=compress&cs=tinysrgb&w=60'">
                </td>
                <td>
                    <div>
                        <strong>${product.name}</strong>
                        <br>
                        <small class="text-muted">${product.description || 'Nessuna descrizione'}</small>
                    </div>
                </td>
                <td>
                    <span class="badge bg-primary">${product.tagMarca || 'N/A'}</span>
                </td>
                <td>
                    <span class="badge bg-secondary">${product.tagTipo || 'N/A'}</span>
                </td>
                <td class="text-center">
                    <span class="badge ${ratingsCount > 0 ? 'bg-success' : 'bg-warning'}">${ratingsCount}</span>
                </td>
                <td class="text-center">
                    ${ratingsCount > 0 ? 
                        `<strong class="text-warning">${averageRating}/10</strong>` : 
                        '<span class="text-muted">-</span>'
                    }
                </td>
                <td class="text-center">
                    <div class="form-check form-switch">
                        <input class="form-check-input" 
                               type="checkbox" 
                               id="visibility-toggle-${product.id}"
                               ${isVisible ? 'checked' : ''}>
                        <label class="form-check-label small" for="visibility-toggle-${product.id}">
                            ${isVisible ? 'Visibile' : 'Nascosto'}
                        </label>
                    </div>
                </td>
                <td class="text-center">
                    <button class="btn btn-danger btn-sm" 
                            onclick="adminValutazioneManager.deleteProduct('${product.id}')"
                            title="Elimina prodotto">
                        <i class="fas fa-trash">ELIMINA</i>
                    </button>
                </td>
            </tr>
        `;
    }

    renderStats() {
        const totalProducts = this.products.length;
        const visibleProducts = this.products.filter(p => p.visible !== false).length;
        let totalRatings = 0;
        let totalScore = 0;
        let scoreCount = 0;

        Object.values(this.ratings).forEach(productRatings => {
            totalRatings += productRatings.length;
            productRatings.forEach(rating => {
                totalScore += rating.efficacia + rating.profumo + rating.facilita;
                scoreCount += 3;
            });
        });

        const overallAverage = scoreCount > 0 ? (totalScore / scoreCount).toFixed(1) : 0;

        const totalProductsEl = document.getElementById('totalProductsCount');
        const visibleProductsEl = document.getElementById('visibleProductsCount');
        const totalRatingsEl = document.getElementById('totalRatingsCount');
        const overallAverageEl = document.getElementById('overallAverageScore');
        const lastUpdateEl = document.getElementById('lastUpdateTime');

        if (totalProductsEl) totalProductsEl.textContent = totalProducts;
        if (visibleProductsEl) visibleProductsEl.textContent = visibleProducts;
        if (totalRatingsEl) totalRatingsEl.textContent = totalRatings;
        if (overallAverageEl) overallAverageEl.textContent = overallAverage;
        if (lastUpdateEl) lastUpdateEl.textContent = new Date().toLocaleString('it-IT');
    }

    renderProductCharts() {
        const chartsContainer = document.getElementById('productsChartsContainer');
        if (!chartsContainer) return;

        // Pulisci container esistente
        chartsContainer.innerHTML = '';

        // Crea un grafico per ogni prodotto
        this.products.forEach(product => {
            const productRatings = this.ratings[product.id] || [];
            if (productRatings.length === 0) return;

            // Calcola medie per questo prodotto
            let efficaciaSum = 0, profumoSum = 0, facilitaSum = 0;
            productRatings.forEach(rating => {
                efficaciaSum += rating.efficacia;
                profumoSum += rating.profumo;
                facilitaSum += rating.facilita;
            });

            const count = productRatings.length;
            const efficaciaAvg = (efficaciaSum / count).toFixed(1);
            const profumoAvg = (profumoSum / count).toFixed(1);
            const facilitaAvg = (facilitaSum / count).toFixed(1);

            // Calcola media generale per colorazione
            const overallAvg = (parseFloat(efficaciaAvg) + parseFloat(profumoAvg) + parseFloat(facilitaAvg)) / 3;
            
            // Determina classe di rating
            let ratingClass = '';
            if (overallAvg < 4) {
                ratingClass = 'border-danger';
            } else if (overallAvg < 7) {
                ratingClass = 'border-warning';
            } else {
                ratingClass = 'border-success';
            }

            // Crea card del grafico
            const chartCard = document.createElement('div');
            chartCard.className = 'col-lg-6 col-xl-4';
            chartCard.innerHTML = `
                <div class="card bg-secondary ${ratingClass} h-100">
                    <div class="card-header bg-dark text-light d-flex align-items-center">
                        <img src="${product.imageUrl}" 
                             alt="${product.name}" class="product-image me-3" 
                             style="width: 50px; height: 50px; border-radius: 8px; cursor: pointer;"
                             onerror="this.src='https://images.pexels.com/photos/4239091/pexels-photo-4239091.jpeg?auto=compress&cs=tinysrgb&w=60'">
                        <div>
                            <h6 class="mb-0">${product.name}</h6>
                            <small class="text-muted">${count} valutazioni - Media: ${overallAvg.toFixed(1)}/10</small>
                            <div class="mt-1">
                                <span class="badge bg-primary me-1">${product.tagMarca || 'N/A'}</span>
                                <span class="badge bg-secondary">${product.tagTipo || 'N/A'}</span>
                                ${product.visible === false ? '<span class="badge bg-warning text-dark ms-1">Nascosto</span>' : ''}
                            </div>
                        </div>ì
                    </div>
                    <div class="card-body">
                        <div style="height: 250px;">
                            <canvas id="chart-${product.id}"></canvas>
                        </div>
                        <div class="mt-3">
                            <h6 class="text-light">Valutazioni per dipendente:</h6>
                            <div class="small text-muted">
                                ${productRatings.map(r => `<div>${r.employeeName}: ${((r.efficacia + r.profumo + r.facilita) / 3).toFixed(1)}/10</div>`).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            `;

            chartsContainer.appendChild(chartCard);

            // Crea grafico
            this.createProductChart(product.id, {
                efficacia: parseFloat(efficaciaAvg),
                profumo: parseFloat(profumoAvg),
                facilita: parseFloat(facilitaAvg)
            });
        });
    }

    createProductChart(productId, averages) {
        const canvas = document.getElementById(`chart-${productId}`);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        // Distruggi grafico esistente se presente
        if (this.charts[productId]) {
            this.charts[productId].destroy();
        }

        this.charts[productId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Efficacia', 'Profumo', 'Facilità d\'uso'],
                datasets: [{
                    label: 'Media Valutazioni',
                    data: [averages.efficacia, averages.profumo, averages.facilita],
                    backgroundColor: [
                        'rgba(99, 102, 241, 0.8)',
                        'rgba(16, 185, 129, 0.8)', 
                        'rgba(245, 158, 11, 0.8)'
                    ],
                    borderColor: [
                        'rgba(99, 102, 241, 1)',
                        'rgba(16, 185, 129, 1)',
                        'rgba(245, 158, 11, 1)'
                    ],
                    borderWidth: 2,
                    borderRadius: 8,
                    borderSkipped: false,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(31, 41, 55, 0.9)',
                        titleColor: '#f1f5f9',
                        bodyColor: '#f1f5f9',
                        borderColor: '#334155',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                return context.label + ': ' + context.parsed.y + '/10';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 10,
                        ticks: {
                            stepSize: 1,
                            color: '#94a3b8'
                        },
                        grid: {
                            color: 'rgba(148, 163, 184, 0.3)'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#94a3b8'
                        },
                        grid: {
                            color: 'rgba(148, 163, 184, 0.3)'
                        }
                    }
                }
            }
        });
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showError(message) {
        this.showToast(message, 'error');
    }
    
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
}

// Istanza globale
window.adminValutazioneManager = new AdminValutazioneManager();

// Inizializza quando la tab viene attivata
document.addEventListener('DOMContentLoaded', () => {
    const valutazioneTab = document.getElementById('valutazione-tab');
    let valutazioneManager = null;

    if (valutazioneTab) {
        valutazioneTab.addEventListener('shown.bs.tab', async () => {
            if (!valutazioneManager) {
                valutazioneManager = window.adminValutazioneManager;
                await valutazioneManager.init();
            }
        });
    }
});

export { AdminValutazioneManager };