import { db } from './firebase.js';
import { collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

class DashboardManager {
    constructor() {
        this.products = [];
        this.ratings = {};
        this.charts = {};
        this.init();
    }

    async init() {
        console.log('Inizializzazione Dashboard...');
        this.setupEventListeners();
        this.setupImageModal();
        await this.loadData();
        this.renderDashboard();
    }

    setupEventListeners() {
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refresh());
        }
    }

    setupImageModal() {
        // Add click listeners to all product images
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('product-image') || e.target.classList.contains('product-detail-image')) {
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

    async refresh() {
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            const originalText = refreshBtn.textContent;
            refreshBtn.textContent = '⏳ Aggiornamento...';
            refreshBtn.disabled = true;

            await this.loadData();
            this.renderDashboard();

            refreshBtn.textContent = originalText;
            refreshBtn.disabled = false;
        }
    }

    async loadData() {
        try {
            await this.loadProducts();
            await this.loadRatings();
        } catch (error) {
            console.error('Errore nel caricamento dati:', error);
            this.showError('Errore nel caricamento dei dati.');
        }
    }

    async loadProducts() {
        try {
            console.log('Caricamento prodotti per dashboard...');
            
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

            console.log('Prodotti caricati per dashboard:', this.products.length);
        } catch (error) {
            console.error('Errore nel caricamento prodotti:', error);
        }
    }

    async loadRatings() {
        this.ratings = {};
        
        try {
            console.log('Caricamento valutazioni per dashboard...');
            
            for (const product of this.products) {
                try {
                    const ratingsRef = collection(db, 'Data', 'ratings', product.id);
                    const querySnapshot = await getDocs(ratingsRef);
                    
                    this.ratings[product.id] = [];
                    querySnapshot.forEach((doc) => {
                        this.ratings[product.id].push(doc.data());
                    });
                } catch (error) {
                    console.log(`Nessuna valutazione per prodotto ${product.id}`);
                    this.ratings[product.id] = [];
                }
            }
            
            console.log('Valutazioni caricate per dashboard:', Object.keys(this.ratings).length);
        } catch (error) {
            console.error('Errore nel caricamento valutazioni:', error);
        }
    }

    renderDashboard() {
        const loadingElement = document.getElementById('loadingMessage');
        const dashboardContent = document.getElementById('dashboardContent');
        const noDataElement = document.getElementById('noData');

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

    renderStats() {
        const totalProducts = this.products.length;
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

        const totalProductsEl = document.getElementById('totalProducts');
        const totalRatingsEl = document.getElementById('totalRatings');
        const overallAverageEl = document.getElementById('overallAverage');

        if (totalProductsEl) totalProductsEl.textContent = totalProducts;
        if (totalRatingsEl) totalRatingsEl.textContent = totalRatings;
        if (overallAverageEl) overallAverageEl.textContent = overallAverage;
    }

    renderProductCharts() {
        // Clear existing charts container
        const chartsContainer = document.querySelector('.charts-container');
        if (!chartsContainer) return;

        chartsContainer.innerHTML = '';

        // Create a chart for each product
        this.products.forEach(product => {
            const productRatings = this.ratings[product.id] || [];
            if (productRatings.length === 0) return;

            // Calculate averages for this product
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

            // Calculate overall average for color coding
            const overallAvg = (parseFloat(efficaciaAvg) + parseFloat(profumoAvg) + parseFloat(facilitaAvg)) / 3;
            
            // Determine rating class based on average
            let ratingClass = '';
            if (overallAvg < 4) {
                ratingClass = 'rating-poor';
            } else if (overallAvg < 7) {
                ratingClass = 'rating-average';
            } else {
                ratingClass = 'rating-good';
            }

            // Create chart card
            const chartCard = document.createElement('div');
            chartCard.className = `chart-card ${ratingClass}`;
            chartCard.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 20px;">
                    <img src="${product.imageUrl || 'https://images.pexels.com/photos/4239091/pexels-photo-4239091.jpeg?auto=compress&cs=tinysrgb&w=60'}" 
                         alt="${product.name}" class="product-image" 
                         style="width: 50px; height: 50px; margin-right: 15px; border-radius: 8px;"
                         onerror="this.src='https://images.pexels.com/photos/4239091/pexels-photo-4239091.jpeg?auto=compress&cs=tinysrgb&w=60'">
                    <h3 style="margin: 0;">${product.name} (${count} valutazioni) - Media: ${overallAvg.toFixed(1)}/10</h3>
                </div>
                <div class="chart-wrapper">
                    <canvas id="chart-${product.id}"></canvas>
                </div>
            `;

            chartsContainer.appendChild(chartCard);

            // Create chart
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

        // Destroy existing chart if it exists
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
                        '#3b82f6',
                        '#10b981', 
                        '#f59e0b'
                    ],
                    borderColor: [
                        '#2563eb',
                        '#059669',
                        '#d97706'
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
                        backgroundColor: '#1e293b',
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
                            color: '#334155'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#94a3b8'
                        },
                        grid: {
                            color: '#334155'
                        }
                    }
                }
            }
        });
    }

    showError(message) {
        console.error(message);
        alert(message);
    }
}

// Initialize dashboard manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM caricato, inizializzazione Dashboard...');
    new DashboardManager();
});

export { DashboardManager };