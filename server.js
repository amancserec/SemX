const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { join } = require('path');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database setup
const dbPath = join(__dirname, 'db.json');
const adapter = new JSONFile(dbPath);
const db = new Low(adapter);

// Initialize database
async function initializeDB() {
  await db.read();
  
  db.data = db.data || {
    users: [
      {
        id: 'user1',
        name: 'Test User',
        email: 'test@example.com',
        collegeEmail: 'test@university.edu',
        password: '$2a$10$X1x7O6r7YVZq8VZq8VZq8O', // password: test123
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Test',
        rating: 4.8,
        isAvailable: false,
        createdAt: new Date().toISOString()
      }
    ],
    listings: [
      {
        id: 'listing1',
        userId: 'user1',
        title: 'Coffee from Starbucks',
        description: 'Need coffee delivered from Starbucks to library',
        category: 'food',
        price: 8.50,
        pickupLocation: 'Starbucks, Campus Center',
        deliveryLocation: 'Main Library, 2nd floor',
        status: 'active',
        createdAt: new Date().toISOString()
      },
      {
        id: 'listing2',
        userId: 'user1',
        title: 'Textbooks delivery',
        description: 'Deliver textbooks from bookstore to dorm',
        category: 'other',
        price: 12.00,
        pickupLocation: 'Campus Bookstore',
        deliveryLocation: 'Dorm Building A',
        status: 'active',
        createdAt: new Date().toISOString()
      }
    ],
    deliveries: [],
    messages: [],
    conversations: []
  };
  
  await db.write();
}

// JWT secret (in production, use environment variable)
const JWT_SECRET = 'semx-secret-key-change-in-production';

// Auth middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
}

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'semX Backend API',
    version: '1.0.0',
    endpoints: [
      'GET /api/listings',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/auth/me',
      'POST /api/listings',
      'POST /api/deliveries'
    ]
  });
});

// Auth routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, collegeEmail, password } = req.body;

    // Validate input
    if (!name || !email || !collegeEmail || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    await db.read();
    
    // Check if user exists
    const existingUser = db.data.users.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = {
      id: uuidv4(),
      name,
      email,
      collegeEmail,
      password: hashedPassword,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
      rating: 5.0,
      isAvailable: false,
      createdAt: new Date().toISOString()
    };

    db.data.users.push(user);
    await db.write();

    // Generate token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        collegeEmail: user.collegeEmail,
        avatar: user.avatar,
        rating: user.rating,
        isAvailable: user.isAvailable
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    await db.read();
    
    const user = db.data.users.find(u => u.email === email);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        collegeEmail: user.collegeEmail,
        avatar: user.avatar,
        rating: user.rating,
        isAvailable: user.isAvailable
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    await db.read();
    
    const user = db.data.users.find(u => u.id === req.user.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        collegeEmail: user.collegeEmail,
        avatar: user.avatar,
        rating: user.rating,
        isAvailable: user.isAvailable
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Listings routes
app.get('/api/listings', async (req, res) => {
  try {
    await db.read();
    
    const { category, maxPrice, limit = 20 } = req.query;
    
    let listings = db.data.listings.filter(l => l.status === 'active');
    
    // Apply filters
    if (category) {
      listings = listings.filter(l => l.category === category);
    }
    
    if (maxPrice) {
      listings = listings.filter(l => l.price <= parseFloat(maxPrice));
    }
    
    // Limit results
    if (limit) {
      listings = listings.slice(0, parseInt(limit));
    }
    
    // Get user info for each listing
    const listingsWithUser = listings.map(listing => {
      const user = db.data.users.find(u => u.id === listing.userId);
      return {
        ...listing,
        user: user ? {
          id: user.id,
          name: user.name,
          avatar: user.avatar,
          rating: user.rating
        } : null
      };
    });
    
    res.json({
      listings: listingsWithUser,
      total: listings.length
    });
  } catch (error) {
    console.error('Get listings error:', error);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

app.post('/api/listings', authenticateToken, async (req, res) => {
  try {
    const { title, description, category, price, pickupLocation, deliveryLocation } = req.body;

    if (!title || !category || !price || !pickupLocation || !deliveryLocation) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await db.read();
    
    const listing = {
      id: uuidv4(),
      userId: req.user.userId,
      title,
      description: description || '',
      category,
      price: parseFloat(price),
      pickupLocation,
      deliveryLocation,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    db.data.listings.push(listing);
    await db.write();

    res.status(201).json({
      message: 'Listing created successfully',
      listing
    });
  } catch (error) {
    console.error('Create listing error:', error);
    res.status(500).json({ error: 'Failed to create listing' });
  }
});

app.get('/api/listings/my', authenticateToken, async (req, res) => {
  try {
    await db.read();
    
    const userListings = db.data.listings.filter(l => l.userId === req.user.userId);
    
    res.json({
      listings: userListings,
      total: userListings.length
    });
  } catch (error) {
    console.error('Get user listings error:', error);
    res.status(500).json({ error: 'Failed to fetch user listings' });
  }
});

// Deliveries routes
app.post('/api/deliveries', authenticateToken, async (req, res) => {
  try {
    const { listingId, message } = req.body;

    await db.read();
    
    const listing = db.data.listings.find(l => l.id === listingId);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    // Check if user is requesting their own listing
    if (listing.userId === req.user.userId) {
      return res.status(400).json({ error: 'Cannot request your own listing' });
    }

    const delivery = {
      id: uuidv4(),
      listingId,
      requesterId: req.user.userId,
      delivererId: null,
      status: 'requested',
      message: message || '',
      createdAt: new Date().toISOString()
    };

    db.data.deliveries.push(delivery);
    await db.write();

    res.status(201).json({
      message: 'Delivery request created',
      delivery
    });
  } catch (error) {
    console.error('Create delivery error:', error);
    res.status(500).json({ error: 'Failed to create delivery request' });
  }
});

// Chat routes
app.get('/api/chat/conversations', authenticateToken, async (req, res) => {
  try {
    await db.read();
    
    // Get conversations where user is involved
    const userDeliveries = db.data.deliveries.filter(d => 
      d.requesterId === req.user.userId || d.delivererId === req.user.userId
    );

    const conversations = userDeliveries.map(delivery => {
      const otherUserId = delivery.requesterId === req.user.userId 
        ? delivery.delivererId 
        : delivery.requesterId;
      
      const otherUser = db.data.users.find(u => u.id === otherUserId);
      const listing = db.data.listings.find(l => l.id === delivery.listingId);
      
      // Get last message
      const messages = db.data.messages.filter(m => m.deliveryId === delivery.id);
      const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;

      return {
        id: delivery.id,
        otherUser: otherUser ? {
          id: otherUser.id,
          name: otherUser.name,
          avatar: otherUser.avatar
        } : null,
        listingTitle: listing ? listing.title : 'Unknown Listing',
        status: delivery.status,
        lastMessage: lastMessage ? {
          content: lastMessage.content,
          timestamp: lastMessage.timestamp,
          isOwn: lastMessage.senderId === req.user.userId
        } : null,
        unreadCount: 0,
        updatedAt: delivery.createdAt
      };
    });

    res.json({ conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

app.get('/api/chat/messages/:deliveryId', authenticateToken, async (req, res) => {
  try {
    const { deliveryId } = req.params;

    await db.read();
    
    // Check if user is part of this delivery
    const delivery = db.data.deliveries.find(d => d.id === deliveryId);
    if (!delivery || (delivery.requesterId !== req.user.userId && delivery.delivererId !== req.user.userId)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const messages = db.data.messages
      .filter(m => m.deliveryId === deliveryId)
      .map(message => {
        const sender = db.data.users.find(u => u.id === message.senderId);
        return {
          ...message,
          sender: sender ? {
            id: sender.id,
            name: sender.name,
            avatar: sender.avatar
          } : null
        };
      });

    res.json({ messages });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

app.post('/api/chat/send', authenticateToken, async (req, res) => {
  try {
    const { conversationId, message } = req.body;

    if (!message || !conversationId) {
      return res.status(400).json({ error: 'Message and conversation ID are required' });
    }

    await db.read();
    
    // Check if user is part of this delivery
    const delivery = db.data.deliveries.find(d => d.id === conversationId);
    if (!delivery || (delivery.requesterId !== req.user.userId && delivery.delivererId !== req.user.userId)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const chatMessage = {
      id: uuidv4(),
      deliveryId: conversationId,
      senderId: req.user.userId,
      content: message,
      timestamp: new Date().toISOString()
    };

    db.data.messages.push(chatMessage);
    await db.write();

    res.status(201).json({
      message: 'Message sent',
      chatMessage
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Profile routes
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    await db.read();
    
    const user = db.data.users.find(u => u.id === req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's deliveries
    const userDeliveries = db.data.deliveries.filter(d => 
      d.requesterId === req.user.userId || d.delivererId === req.user.userId
    );

    // Mock activity data
    const activity = [
      {
        id: '1',
        icon: 'shipping-fast',
        message: 'Delivery request accepted: Coffee from Starbucks',
        time: '2 hours ago'
      },
      {
        id: '2',
        icon: 'dollar-sign',
        message: 'Payment received: $8.50',
        time: '1 day ago'
      },
      {
        id: '3',
        icon: 'star',
        message: 'You received a 5-star review',
        time: '2 days ago'
      }
    ];

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        rating: user.rating,
        isAvailable: user.isAvailable
      },
      totalDeliveries: userDeliveries.length,
      activity
    });
  } catch (Error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// User routes
app.post('/api/users/availability', authenticateToken, async (req, res) => {
  try {
    const { available } = req.body;

    await db.read();
    
    const userIndex = db.data.users.findIndex(u => u.id === req.user.userId);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    db.data.users[userIndex].isAvailable = available;
    await db.write();

    res.json({
      message: `You are now ${available ? 'available' : 'unavailable'} for deliveries`,
      isAvailable: available
    });
  } catch (error) {
    console.error('Update availability error:', error);
    res.status(500).json({ error: 'Failed to update availability' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'semX API'
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
async function startServer() {
  await initializeDB();
  
  app.listen(PORT, () => {
    console.log(`✅ semX Backend Server running on port ${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🌐 Frontend should connect to: http://localhost:${PORT}`);
  });
}

startServer();