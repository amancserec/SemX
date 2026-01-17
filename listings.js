// Listings-specific functionality
class ListingsManager {
    constructor(app) {
        this.app = app;
        this.apiBaseUrl = 'http://localhost:3001/api';
    }

    async getAllListings(filters = {}) {
        try {
            const queryString = new URLSearchParams(filters).toString();
            const url = `${this.apiBaseUrl}/listings${queryString ? '?' + queryString : ''}`;
            
            const response = await fetch(url);
            const data = await response.json();

            if (response.ok) {
                return { success: true, listings: data.listings };
            } else {
                return { success: false, error: data.error };
            }
        } catch (error) {
            console.error('Get listings error:', error);
            return { success: false, error: 'Network error' };
        }
    }

    async createListing(listingData) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${this.apiBaseUrl}/listings`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(listingData)
            });

            const data = await response.json();

            if (response.ok) {
                return { success: true, listing: data.listing };
            } else {
                return { success: false, error: data.error };
            }
        } catch (error) {
            console.error('Create listing error:', error);
            return { success: false, error: 'Network error' };
        }
    }

    async requestDelivery(listingId, message = '') {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${this.apiBaseUrl}/deliveries`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ listingId, message })
            });

            const data = await response.json();

            if (response.ok) {
                return { success: true, delivery: data.delivery };
            } else {
                return { success: false, error: data.error };
            }
        } catch (error) {
            console.error('Request delivery error:', error);
            return { success: false, error: 'Network error' };
        }
    }

    async getUserListings() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${this.apiBaseUrl}/listings/my`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (response.ok) {
                return { success: true, listings: data.listings };
            } else {
                return { success: false, error: data.error };
            }
        } catch (error) {
            console.error('Get user listings error:', error);
            return { success: false, error: 'Network error' };
        }
    }

    async deleteListing(listingId) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${this.apiBaseUrl}/listings/${listingId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                return { success: true };
            } else {
                const data = await response.json();
                return { success: false, error: data.error };
            }
        } catch (error) {
            console.error('Delete listing error:', error);
            return { success: false, error: 'Network error' };
        }
    }
}

// Export for use in main app
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ListingsManager;
}