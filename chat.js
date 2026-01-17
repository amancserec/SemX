// Chat-specific functionality
class ChatManager {
    constructor(app) {
        this.app = app;
        this.apiBaseUrl = 'http://localhost:3001/api';
        this.currentConversation = null;
        this.socket = null;
        this.initializeSocket();
    }

    initializeSocket() {
        const token = localStorage.getItem('token');
        if (!token) return;

        // In production, use WebSocket connection
        // this.socket = new WebSocket(`ws://localhost:3001?token=${token}`);
        
        // For now, we'll use polling
        this.pollMessages();
    }

    async pollMessages() {
        // Poll for new messages every 5 seconds
        setInterval(async () => {
            if (this.currentConversation) {
                await this.loadMessages(this.currentConversation);
            }
        }, 5000);
    }

    async getConversations() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${this.apiBaseUrl}/chat/conversations`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (response.ok) {
                return { success: true, conversations: data.conversations };
            } else {
                return { success: false, error: data.error };
            }
        } catch (error) {
            console.error('Get conversations error:', error);
            return { success: false, error: 'Network error' };
        }
    }

    async getMessages(conversationId) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${this.apiBaseUrl}/chat/messages/${conversationId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (response.ok) {
                return { success: true, messages: data.messages };
            } else {
                return { success: false, error: data.error };
            }
        } catch (error) {
            console.error('Get messages error:', error);
            return { success: false, error: 'Network error' };
        }
    }

    async sendMessage(conversationId, message) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${this.apiBaseUrl}/chat/send`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ conversationId, message })
            });

            const data = await response.json();

            if (response.ok) {
                return { success: true, message: data.message };
            } else {
                return { success: false, error: data.error };
            }
        } catch (error) {
            console.error('Send message error:', error);
            return { success: false, error: 'Network error' };
        }
    }

    async startConversation(userId, listingId) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${this.apiBaseUrl}/chat/conversations/start`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userId, listingId })
            });

            const data = await response.json();

            if (response.ok) {
                return { success: true, conversation: data.conversation };
            } else {
                return { success: false, error: data.error };
            }
        } catch (error) {
            console.error('Start conversation error:', error);
            return { success: false, error: 'Network error' };
        }
    }

    markAsRead(messageIds) {
        // In a real app, you would send this to the server
        console.log('Marking messages as read:', messageIds);
    }
}

// Export for use in main app
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChatManager;
}