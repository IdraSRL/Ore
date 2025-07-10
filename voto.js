import { db } from './firebase.js';
import { collection, getDocs, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { AuthManager } from './auth.js';

class VotingManager {
    constructor() {
        this.currentUser = null;
        this.products = [];
        this.ratings = {};
        this.init();
    }

    async init() {
        console.log('Inizializzazione VotingManager...');
        
        // Check if user is logged in
        this.currentUser = AuthManager.getCurrentUser();
        if (!this.currentUser) {
            console.log('Utente non loggato, redirect al login');
            window.location.href = 'index.html';
            return;
        }

        this.displayUserInfo();
        await this.loadProducts();
        await this.loadUserRatings();
        this.renderProducts();
        this.setupImageModal();
    }

    displayUserInfo() {
        const userNameElement = document.getElementById('userName');
        if (userNameElement) {
            userNameElement.textContent = `Benvenuto, ${this.currentUser.name}!`;
        }
    }

    async loadProducts() {
        try {
            console.log('Caricamento prodotti...');
            
            // Try to load from subcollection first
            const productsRef = collection(db, 'Data', 'products', 'items');
            const querySnapshot = await getDocs(productsRef);
            
            this.products = [];
            querySnapshot.forEach((doc) => {
                this.products.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            // If no products found, try alternative structure
            if (this.products.length === 0) {
                console.log('Nessun prodotto nella subcollection, provo struttura alternativa...');
                const docRef = doc(db, 'Data', 'products');
                const docSnap = await getDoc(docRef);
                
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data.products && Array.isArray(data.products)) {
                        this.products = data.products.map((product, index) => ({
                            id: index.toString(),
                            ...product
                        }));
                    }
                }
            }

            // If still no products, create test data
            if (this.products.length === 0) {
                console.log('Nessun prodotto trovato, uso dati di test');
                this.products = [
                    {
                        id: "1",
                        name: "Detergente Multiuso",
                        description: "Detergente per tutte le superfici",
                        imageUrl: "https://images.pexels.com/photos/4239091/pexels-photo-4239091.jpeg?auto=compress&cs=tinysrgb&w=400"
                    },
                    {
                        id: "2", 
                        name: "Sgrassatore Cucina",
                        description: "Potente sgrassatore per cucine",
                        imageUrl: "https://images.pexels.com/photos/4239013/pexels-photo-4239013.jpeg?auto=compress&cs=tinysrgb&w=400"
                    },
                    {
                        id: "3",
                        name: "Detergente Bagno",
                        description: "Specifico per sanitari e piastrelle",
                        imageUrl: "https://images.pexels.com/photos/4239092/pexels-photo-4239092.jpeg?auto=compress&cs=tinysrgb&w=400"
                    }
                ];
            }

            console.log('Prodotti caricati:', this.products.length);
        } catch (error) {
            console.error('Errore nel caricamento prodotti:', error);
            this.showError('Errore nel caricamento dei prodotti.');
        }
    }

    async loadUserRatings() {
        try {
            console.log('Caricamento valutazioni utente...');
            this.ratings = {};
            
            for (const product of this.products) {
                const ratingRef = doc(db, 'Data', 'ratings', product.id, this.currentUser.urlParam);
                const ratingSnap = await getDoc(ratingRef);
                
                if (ratingSnap.exists()) {
                    this.ratings[product.id] = ratingSnap.data();
                }
            }
            
            console.log('Valutazioni caricate:', Object.keys(this.ratings).length);
        } catch (error) {
            console.error('Errore nel caricamento valutazioni:', error);
        }
    }

    renderProducts() {
        const loadingElement = document.getElementById('loadingMessage');
        const productsGrid = document.getElementById('productsGrid');
        const noProductsElement = document.getElementById('noProducts');

        if (loadingElement) loadingElement.style.display = 'none';

        if (this.products.length === 0) {
            if (noProductsElement) noProductsElement.style.display = 'block';
            return;
        }

        if (noProductsElement) noProductsElement.style.display = 'none';
        if (productsGrid) {
            productsGrid.innerHTML = '';
            
            this.products.forEach(product => {
                const productCard = this.createProductCard(product);
                productsGrid.appendChild(productCard);
            });
        }
    }

    createProductCard(product) {
        const card = document.createElement('div');
        card.className = 'product-card';
        
        const existingRating = this.ratings[product.id];
        
        // Add voted class if product has been rated
        if (existingRating) {
            card.classList.add('voted');
        }
        
        const efficacia = existingRating ? existingRating.efficacia : 5;
        const profumo = existingRating ? existingRating.profumo : 5;
        const facilita = existingRating ? existingRating.facilita : 5;

        card.innerHTML = `
            <div class="product-header">
                <img src="${product.imageUrl || 'https://images.pexels.com/photos/4239091/pexels-photo-4239091.jpeg?auto=compress&cs=tinysrgb&w=60'}" 
                     alt="${product.name}" class="product-image"
                     onerror="this.src='https://images.pexels.com/photos/4239091/pexels-photo-4239091.jpeg?auto=compress&cs=tinysrgb&w=60'">
                <div class="product-info">
                    <h3>${product.name}</h3>
                    <p>${product.description || 'Valuta questo prodotto'}</p>
                </div>
            </div>
            
            <div class="rating-group">
                <label>Efficacia:</label>
                <div class="slider-container">
                    <input type="range" min="1" max="10" value="${efficacia}" 
                           class="slider" id="efficacia-${product.id}">
                    <span class="slider-value" id="efficacia-value-${product.id}">${efficacia}</span>
                </div>
            </div>
            
            <div class="rating-group">
                <label>Profumo:</label>
                <div class="slider-container">
                    <input type="range" min="1" max="10" value="${profumo}" 
                           class="slider" id="profumo-${product.id}">
                    <span class="slider-value" id="profumo-value-${product.id}">${profumo}</span>
                </div>
            </div>
            
            <div class="rating-group">
                <label>Facilità d'uso:</label>
                <div class="slider-container">
                    <input type="range" min="1" max="10" value="${facilita}" 
                           class="slider" id="facilita-${product.id}">
                    <span class="slider-value" id="facilita-value-${product.id}">${facilita}</span>
                </div>
            </div>
            
            <button class="btn-primary submit-rating" data-product-id="${product.id}">
                ${existingRating ? 'Aggiorna Valutazione' : 'Invia Valutazione'}
            </button>
        `;

        // Add event listeners for sliders
        const sliders = card.querySelectorAll('.slider');
        sliders.forEach(slider => {
            slider.addEventListener('input', (e) => {
                const valueSpan = document.getElementById(e.target.id.replace(e.target.id.split('-')[0], e.target.id.split('-')[0] + '-value'));
                if (valueSpan) {
                    valueSpan.textContent = e.target.value;
                }
            });
        });

        // Add event listener for submit button
        const submitBtn = card.querySelector('.submit-rating');
        submitBtn.addEventListener('click', () => {
            this.submitRating(product.id);
        });

        return card;
    }

    setupImageModal() {
        // Add click listeners to all product images
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('product-image')) {
                this.openImageModal(e.target.src, e.target.alt);
            }
        });

        // Modal close functionality
        const modal = document.getElementById('imageModal');
        if (modal) {
            const closeBtn = modal.querySelector('.image-modal-close');
            
            // Close on X button click
            if (closeBtn) {
                closeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    modal.style.display = 'none';
                });
            }

            // Close on background click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });

            // Close on Escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && modal.style.display === 'block') {
                    modal.style.display = 'none';
                }
            });
        }
    }

    openImageModal(src, alt) {
        const modal = document.getElementById('imageModal');
        const modalImg = document.getElementById('modalImage');
        
        if (modal && modalImg) {
            modal.style.display = 'block';
            modalImg.src = src;
            modalImg.alt = alt;
        }
    }

    async submitRating(productId) {
        try {
            const efficacia = parseInt(document.getElementById(`efficacia-${productId}`).value);
            const profumo = parseInt(document.getElementById(`profumo-${productId}`).value);
            const facilita = parseInt(document.getElementById(`facilita-${productId}`).value);
            
            const rating = {
                efficacia,
                profumo,
                facilita,
                timestamp: new Date().toISOString(),
                employeeName: this.currentUser.name
            };

            console.log('Salvataggio valutazione:', rating);

            const ratingRef = doc(db, 'Data', 'ratings', productId, this.currentUser.urlParam);
            await setDoc(ratingRef, rating);
            
            // Update local ratings
            this.ratings[productId] = rating;
            
            // Show success message
            this.showSuccess('Valutazione salvata con successo!');
            
        } catch (error) {
            console.error('Errore nel salvataggio valutazione:', error);
            this.showError('Errore nel salvataggio. Riprova.');
        }
    }

    showSuccess(message) {
        // Create or update success message
        let successDiv = document.getElementById('successMessage');
        if (!successDiv) {
            successDiv = document.createElement('div');
            successDiv.id = 'successMessage';
            successDiv.className = 'success-message';
            document.querySelector('.container').appendChild(successDiv);
        }
        
        successDiv.textContent = message;
        successDiv.style.display = 'block';
        
        setTimeout(() => {
            successDiv.style.display = 'none';
        }, 3000);
    }

    showError(message) {
        console.error(message);
        alert(message);
    }
}

// Initialize voting manager when DOM is loaded
let votingManager;
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM caricato, inizializzazione VotingManager...');
    votingManager = new VotingManager();
});

// Make votingManager globally accessible for backward compatibility
window.votingManager = votingManager;

export { VotingManager };