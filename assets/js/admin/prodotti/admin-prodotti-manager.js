// admin-prodotti-manager.js - Gestione prodotti nel pannello admin
import { db } from "../../common/firebase-config.js";
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc,
  serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';

class AdminProdottiManager {
    constructor() {
        this.products = [];
        this.filteredProducts = [];
        this.isInitialized = false;
    }

    async init() {
        if (this.isInitialized) return;
        
        console.log('Inizializzazione Admin Prodotti Manager...');
        this.setupEventListeners();
        await this.loadProducts();
        this.renderProducts();
        this.populateFilters();
        this.isInitialized = true;
    }

    setupEventListeners() {
        // Form per aggiungere nuovo prodotto
        const addForm = document.getElementById('addProductForm');
        if (addForm) {
            addForm.addEventListener('submit', (e) => this.handleAddProduct(e));
        }

        // Filtri
        const marcaFilter = document.getElementById('marcaFilter');
        const tipoFilter = document.getElementById('tipoFilter');
        const searchInput = document.getElementById('productSearch');

        if (marcaFilter) marcaFilter.addEventListener('change', () => this.applyFilters());
        if (tipoFilter) tipoFilter.addEventListener('change', () => this.applyFilters());
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(() => this.applyFilters(), 300));
        }

        // Reset filtri
        const resetBtn = document.getElementById('resetFilters');
        if (resetBtn) resetBtn.addEventListener('click', () => this.resetFilters());

        // Refresh
        const refreshBtn = document.getElementById('refreshProducts');
        if (refreshBtn) refreshBtn.addEventListener('click', () => this.refresh());
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    async loadProducts() {
        try {
            console.log('Caricamento prodotti da Firestore...');
            const querySnapshot = await getDocs(collection(db, 'Products'));
            this.products = [];
            
            querySnapshot.forEach((doc) => {
                this.products.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            this.filteredProducts = [...this.products];
            console.log('Prodotti caricati:', this.products.length);
        } catch (error) {
            console.error('Errore nel caricamento prodotti:', error);
            this.showError('Errore nel caricamento dei prodotti.');
        }
    }

    async handleAddProduct(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const productData = {
            id: formData.get('productId').trim(),
            name: formData.get('productName').trim(),
            description: formData.get('productDescription').trim(),
            imageUrl: `assets/img/products/${formData.get('productImage').trim()}`,
            tagMarca: formData.get('productMarca').trim(),
            tagTipo: formData.get('productTipo').trim(),
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
            e.target.reset();
            await this.loadProducts();
            this.renderProducts();
            this.populateFilters();
        } catch (error) {
            console.error('Errore nel salvataggio:', error);
            this.showError('Errore nel salvataggio del prodotto');
        }
    }

    async deleteProduct(productId) {
        if (!confirm('Sei sicuro di voler eliminare questo prodotto?')) return;

        try {
            await deleteDoc(doc(db, 'Products', productId));
            this.showSuccess('Prodotto eliminato con successo!');
            await this.loadProducts();
            this.renderProducts();
            this.populateFilters();
        } catch (error) {
            console.error('Errore nell\'eliminazione:', error);
            this.showError('Errore nell\'eliminazione del prodotto');
        }
    }

    populateFilters() {
        const marcaFilter = document.getElementById('marcaFilter');
        const tipoFilter = document.getElementById('tipoFilter');

        if (marcaFilter) {
            const marche = [...new Set(this.products.map(p => p.tagMarca))].sort();
            marcaFilter.innerHTML = '<option value="">Tutte le marche</option>' +
                marche.map(marca => `<option value="${marca}">${marca}</option>`).join('');
        }

        if (tipoFilter) {
            const tipi = [...new Set(this.products.map(p => p.tagTipo))].sort();
            tipoFilter.innerHTML = '<option value="">Tutti i tipi</option>' +
                tipi.map(tipo => `<option value="${tipo}">${tipo}</option>`).join('');
        }
    }

    applyFilters() {
        const marcaFilter = document.getElementById('marcaFilter')?.value || '';
        const tipoFilter = document.getElementById('tipoFilter')?.value || '';
        const searchText = document.getElementById('productSearch')?.value.toLowerCase() || '';

        this.filteredProducts = this.products.filter(product => {
            const matchesMarca = !marcaFilter || product.tagMarca === marcaFilter;
            const matchesTipo = !tipoFilter || product.tagTipo === tipoFilter;
            const matchesSearch = !searchText || product.name.toLowerCase().includes(searchText);
            
            return matchesMarca && matchesTipo && matchesSearch;
        });

        this.renderProducts();
    }

    resetFilters() {
        document.getElementById('marcaFilter').value = '';
        document.getElementById('tipoFilter').value = '';
        document.getElementById('productSearch').value = '';
        this.filteredProducts = [...this.products];
        this.renderProducts();
    }

    renderProducts() {
        const container = document.getElementById('productsListContainer');
        if (!container) return;

        if (this.filteredProducts.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-search fa-3x text-muted mb-3"></i>
                    <p class="text-muted">Nessun prodotto trovato con i filtri selezionati.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.filteredProducts.map(product => `
            <div class="col-lg-4 col-md-6">
                <div class="card bg-dark border-secondary h-100">
                    <img src="${product.imageUrl}" 
                         class="card-img-top" 
                         alt="${product.name}"
                         style="height: 200px; object-fit: cover;"
                         onerror="this.src='assets/img/products/placeholder.jpg'">
                    <div class="card-body">
                        <h6 class="card-title text-light">${product.name}</h6>
                        <p class="card-text small text-muted">${product.description}</p>
                        <div class="mb-2">
                            <span class="badge bg-primary me-1">${product.tagMarca}</span>
                            <span class="badge bg-secondary">${product.tagTipo}</span>
                        </div>
                        <div class="d-flex justify-content-between">
                            <small class="text-muted">ID: ${product.id}</small>
                            <button class="btn btn-danger btn-sm" onclick="adminProdottiManager.deleteProduct('${product.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async refresh() {
        const refreshBtn = document.getElementById('refreshProducts');
        if (refreshBtn) {
            const originalText = refreshBtn.innerHTML;
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Aggiornamento...';
            refreshBtn.disabled = true;

            await this.loadProducts();
            this.renderProducts();
            this.populateFilters();

            refreshBtn.innerHTML = originalText;
            refreshBtn.disabled = false;
        }
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
window.adminProdottiManager = new AdminProdottiManager();

export { AdminProdottiManager };