// Main Application Controller
class SemXApp {
    constructor() {
        this.currentUser = null;
        this.currentPage = 'home';
        this.socket = null;
        this.apiBaseUrl = 'http://localhost:3001/api';
        this.initialize();
    }

    initialize() {
        this.setupEventListeners();
        this.checkAuth();
        this.loadPage('home');
        this.loadHomeListings();
        this.setupNavigation();
    }

    setupEventListeners() {
        // Login/Register buttons
        document.getElementById('loginBtn')?.addEventListener('click', () => {
            this.showAuthModal('login');
        });
        
        document.getElementById('registerBtn')?.addEventListener('click', () => {
            this.showAuthModal('register');
        });

        // Close modal buttons
        document.querySelectorAll('.close-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeAllModals();
            });
        });

        // Auth tabs
        document.querySelectorAll('.tab-btn').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchAuthTab(tabName);
            });
        });

        // Auth forms
        document.getElementById('loginForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        document.getElementById('registerForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });

        // Action buttons
        document.getElementById('findDeliveries')?.addEventListener('click', () => {
            this.loadPage('listings');
        });

        document.getElementById('postDelivery')?.addEventListener('click', () => {
            if (!this.currentUser) {
                this.showAuthModal('login');
                return;
            }
            this.showCreateModal();
        });

        document.getElementById('createListingBtn')?.addEventListener('click', () => {
            this.showCreateModal();
        });

        // Create listing form
        document.getElementById('createListingForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCreateListing();
        });

        // Price filter
        const priceFilter = document.getElementById('priceFilter');
        const priceValue = document.getElementById('priceValue');
        if (priceFilter && priceValue) {
            priceFilter.addEventListener('input', (e) => {
                priceValue.textContent = `Max: $${e.target.value}`;
                this.loadListings();
            });
        }

        // Category filter
        document.getElementById('categoryFilter')?.addEventListener('change', () => {
            this.loadListings();
        });

        // Modal background close
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeAllModals();
                }
            });
        });

        // Go online button
        document.getElementById('goOnlineBtn')?.addEventListener('click', () => {
            this.toggleAvailability();
        });

        // Send message
        document.getElementById('sendMessageBtn')?.addEventListener('click', () => {
            this.sendMessage();
        });

        // Enter key in message input
        document.getElementById('messageInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
    }

    setupNavigation() {
        // Navigation links
        document.querySelectorAll('[data-page]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.target.closest('[data-page]').dataset.page;
                this.loadPage(page);
            });
        });
    }

    async checkAuth() {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const response = await fetch(`${this.apiBaseUrl}/auth/me`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.currentUser = data.user;
                    this.updateUIForLoggedInUser();
                } else {
                    localStorage.removeItem('token');
                }
            } catch (error) {
                console.error('Auth check failed:', error);
                localStorage.removeItem('token');
            }
        }
    }

    updateUIForLoggedInUser() {
        if (this.currentUser) {
            // Update user info
            document.getElementById('userName').textContent = this.currentUser.displayName;
            document.getElementById('profileDisplayName').textContent = this.currentUser.displayName;
            document.getElementById('profileEmail').textContent = this.currentUser.email;
            
            // Show/hide buttons
            document.getElementById('loginBtn').style.display = 'none';
            document.getElementById('registerBtn').style.display = 'none';
            document.getElementById('goOnlineBtn').style.display = 'block';
            document.getElementById('userMenu').style.display = 'flex';
            
            // Update user menu avatar
            const avatar = document.querySelector('.user-menu .avatar');
            if (avatar && this.currentUser.avatarUrl) {
                avatar.src = this.currentUser.avatarUrl;
            }
            
            // Load profile data
            if (this.currentPage === 'profile') {
                this.loadProfile();
            }
        }
    }

    async handleLogin() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('token', data.token);
                this.currentUser = data.user;
                this.updateUIForLoggedInUser();
                this.closeAllModals();
                this.showToast('Login successful!', 'success');
                
                // Load current page again
                this.loadPage(this.currentPage);
            } else {
                this.showToast(data.error || 'Login failed', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showToast('Login failed. Please try again.', 'error');
        }
    }

    async handleRegister() {
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const collegeEmail = document.getElementById('registerCollegeEmail').value;
        const password = document.getElementById('registerPassword').value;

        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name,
                    email,
                    collegeEmail,
                    password
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.showToast('Registration successful! Please login.', 'success');
                this.switchAuthTab('login');
                // Pre-fill login form
                document.getElementById('loginEmail').value = email;
                document.getElementById('loginPassword').value = password;
            } else {
                this.showToast(data.error || 'Registration failed', 'error');
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showToast('Registration failed. Please try again.', 'error');
        }
    }

    async loadHomeListings() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/listings?limit=4`);
            const data = await response.json();
            
            if (response.ok) {
                this.renderListings(data.listings, 'homeListings');
            }
        } catch (error) {
            console.error('Failed to load listings:', error);
        }
    }

    async loadListings() {
        try {
            const category = document.getElementById('categoryFilter')?.value;
            const maxPrice = document.getElementById('priceFilter')?.value;
            
            let url = `${this.apiBaseUrl}/listings`;
            if (category || maxPrice) {
                const params = new URLSearchParams();
                if (category) params.append('category', category);
                if (maxPrice) params.append('maxPrice', maxPrice);
                url += '?' + params.toString();
            }
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (response.ok) {
                this.renderListings(data.listings, 'listingsContainer');
            }
        } catch (error) {
            console.error('Failed to load listings:', error);
            this.showToast('Failed to load listings', 'error');
        }
    }

    renderListings(listings, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (!listings || listings.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-box-open"></i>
                    <h3>No listings found</h3>
                    <p>Be the first to create a listing!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = listings.map(listing => `
            <div class="listing-card">
                <div class="listing-image" style="background-image: url('https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600')"></div>
                <div class="listing-content">
                    <h3 class="listing-title">${listing.title}</h3>
                    <p class="listing-description">${listing.description || 'No description provided'}</p>
                    <div class="listing-price">$${listing.price.toFixed(2)}</div>
                    <div class="listing-meta">
                        <span class="listing-category">${listing.category}</span>
                        <div class="listing-actions">
                            <button class="btn btn-primary btn-sm" onclick="app.requestDelivery('${listing.id}')">
                                <i class="fas fa-truck"></i> Request
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async requestDelivery(listingId) {
        if (!this.currentUser) {
            this.showAuthModal('login');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${this.apiBaseUrl}/deliveries`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    listingId,
                    message: 'I would like to request this delivery'
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.showToast('Delivery request sent!', 'success');
                // Navigate to deliveries page
                this.loadPage('deliveries');
            } else {
                this.showToast(data.error || 'Failed to request delivery', 'error');
            }
        } catch (error) {
            console.error('Request delivery error:', error);
            this.showToast('Failed to request delivery', 'error');
        }
    }

    async handleCreateListing() {
        if (!this.currentUser) {
            this.showAuthModal('login');
            return;
        }

        const title = document.getElementById('listingTitle').value;
        const description = document.getElementById('listingDescription').value;
        const category = document.getElementById('listingCategory').value;
        const price = document.getElementById('listingPrice').value;
        const pickupLocation = document.getElementById('pickupLocation').value;
        const deliveryLocation = document.getElementById('deliveryLocation').value;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${this.apiBaseUrl}/listings`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title,
                    description,
                    category,
                    price,
                    pickupLocation,
                    deliveryLocation
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.showToast('Listing created successfully!', 'success');
                this.closeAllModals();
                this.loadPage('listings');
                document.getElementById('createListingForm').reset();
            } else {
                this.showToast(data.error || 'Failed to create listing', 'error');
            }
        } catch (error) {
            console.error('Create listing error:', error);
            this.showToast('Failed to create listing', 'error');
        }
    }

    async loadProfile() {
        if (!this.currentUser) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${this.apiBaseUrl}/profile`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.updateProfile(data);
            }
        } catch (error) {
            console.error('Load profile error:', error);
        }
    }

    updateProfile(data) {
        document.getElementById('totalDeliveries').textContent = data.totalDeliveries || 0;
        document.getElementById('userRating').textContent = data.rating || '5.0';
        
        // Update activity
        const activityContainer = document.getElementById('profileActivity');
        if (activityContainer && data.activity) {
            activityContainer.innerHTML = data.activity.map(item => `
                <div class="activity-item">
                    <i class="fas fa-${item.icon}"></i>
                    <div>
                        <p>${item.message}</p>
                        <small>${item.time}</small>
                    </div>
                </div>
            `).join('');
        }
    }

    async toggleAvailability() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${this.apiBaseUrl}/users/availability`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ available: true })
            });

            if (response.ok) {
                this.showToast('You are now available for deliveries!', 'success');
            }
        } catch (error) {
            console.error('Toggle availability error:', error);
            this.showToast('Failed to update availability', 'error');
        }
    }

    async loadChat() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${this.apiBaseUrl}/chat/conversations`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.renderConversations(data.conversations);
            }
        } catch (error) {
            console.error('Load chat error:', error);
        }
    }

    renderConversations(conversations) {
        const container = document.getElementById('conversationsList');
        if (!container) return;

        container.innerHTML = conversations.map(conv => `
            <div class="conversation-item" data-conversation-id="${conv.id}">
                <div class="conversation-avatar">
                    <img src="${conv.avatar}" alt="${conv.name}">
                </div>
                <div class="conversation-info">
                    <h4>${conv.name}</h4>
                    <p>${conv.lastMessage || 'No messages yet'}</p>
                </div>
            </div>
        `).join('');

        // Add click handlers
        container.querySelectorAll('.conversation-item').forEach(item => {
            item.addEventListener('click', () => {
                this.selectConversation(item.dataset.conversationId);
            });
        });
    }

    selectConversation(conversationId) {
        // Enable chat input
        document.getElementById('messageInput').disabled = false;
        document.getElementById('sendMessageBtn').disabled = false;
        
        // Load messages for this conversation
        this.loadMessages(conversationId);
    }

    async loadMessages(conversationId) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${this.apiBaseUrl}/chat/messages/${conversationId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.renderMessages(data.messages);
            }
        } catch (error) {
            console.error('Load messages error:', error);
        }
    }

    renderMessages(messages) {
        const container = document.getElementById('chatMessages');
        if (!container) return;

        container.innerHTML = messages.map(msg => `
            <div class="message ${msg.senderId === this.currentUser?.id ? 'sent' : 'received'}">
                <p>${msg.content}</p>
                <small>${new Date(msg.timestamp).toLocaleTimeString()}</small>
            </div>
        `).join('');

        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
    }

    async sendMessage() {
        const input = document.getElementById('messageInput');
        const message = input.value.trim();
        
        if (!message) return;

        try {
            // In a real app, you would send to a specific conversation
            const token = localStorage.getItem('token');
            const response = await fetch(`${this.apiBaseUrl}/chat/send`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    conversationId: '1', // Would be dynamic
                    message
                })
            });

            if (response.ok) {
                input.value = '';
                
                // Add message to UI
                const container = document.getElementById('chatMessages');
                const messageDiv = document.createElement('div');
                messageDiv.className = 'message sent';
                messageDiv.innerHTML = `
                    <p>${message}</p>
                    <small>${new Date().toLocaleTimeString()}</small>
                `;
                container.appendChild(messageDiv);
                
                // Scroll to bottom
                container.scrollTop = container.scrollHeight;
            }
        } catch (error) {
            console.error('Send message error:', error);
        }
    }

    loadPage(pageName) {
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-page="${pageName}"]`)?.classList.add('active');

        // Update pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        document.getElementById(`${pageName}Page`)?.classList.add('active');

        this.currentPage = pageName;

        // Load page-specific content
        switch (pageName) {
            case 'listings':
                this.loadListings();
                break;
            case 'chat':
                this.loadChat();
                break;
            case 'profile':
                this.loadProfile();
                break;
            case 'home':
                this.loadHomeListings();
                break;
        }
    }

    showAuthModal(tab = 'login') {
        document.getElementById('authModal').classList.add('active');
        this.switchAuthTab(tab);
    }

    showCreateModal() {
        document.getElementById('createModal').classList.add('active');
    }

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }

    switchAuthTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });
        
        document.querySelectorAll('.auth-form').forEach(form => {
            form.classList.toggle('active', form.id === `${tabName}Form`);
        });
    }

    showToast(message, type = 'info') {
        const backgroundColor = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        }[type] || '#3b82f6';

        Toastify({
            text: message,
            duration: 3000,
            gravity: "top",
            position: "right",
            backgroundColor: backgroundColor,
            stopOnFocus: true
        }).showToast();
    }
}

// Initialize the app
const app = new SemXApp();
window.app = app;