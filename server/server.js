// server/server.js

// Load environment variables FIRST
require('dotenv').config();

// Import required packages
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Initialize express app
const app = express();

// ===== MIDDLEWARE =====
// Security headers
app.use(helmet());

// Allow cross-origin requests
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Rate limiting (from your proposal)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// ===== MONGODB CONNECTION =====
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ MongoDB Connected Successfully!');
        console.log(`📍 Database: ${mongoose.connection.db.databaseName}`);
        console.log(`📍 Host: ${mongoose.connection.host}`);
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error.message);
        console.log('💡 Troubleshooting Tips:');
        console.log('   1. Check if your IP is whitelisted in Atlas');
        console.log('   2. Verify username/password in connection string');
        console.log('   3. Ensure cluster name is correct');
        process.exit(1);
    }
};

// Connect to MongoDB
connectDB();

// Monitor MongoDB connection events
mongoose.connection.on('connected', () => {
    console.log('✅ MongoDB Connected Successfully!');
    console.log(`📍 Database: ${mongoose.connection.db.databaseName}`);
});

mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB Error:', err.message);
});

mongoose.connection.on('disconnected', () => {
    console.log('⚠️ MongoDB Disconnected');
});

// ===== CREATE MODELS =====

// User Model (for authentication)
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

// Service Model (from your proposal)
const serviceSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { 
        type: String, 
        enum: ['web-development', 'e-commerce', 'branding', 'digital-marketing'],
        required: true 
    },
    image: String,
    price: Number,
    featured: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

// Contact Model (from Communication Hub)
const contactSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: String,
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

// Create models
const User = mongoose.model('User', userSchema);
const Service = mongoose.model('Service', serviceSchema);
const Contact = mongoose.model('Contact', contactSchema);

// ===== ROUTES =====

// Test Route - Check if server is working
app.get('/api/test', (req, res) => {
    res.json({ 
        message: '✅ Tegbar Digital Solution API is running!',
        timestamp: new Date(),
        database: mongoose.connection.readyState === 1 ? 'Connected ✅' : 'Disconnected ❌',
        databaseName: mongoose.connection.db ? mongoose.connection.db.databaseName : 'Not connected'
    });
});

// Health Check Route
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        uptime: process.uptime(),
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        timestamp: new Date()
    });
});

// Get all services
app.get('/api/services', async (req, res) => {
    try {
        const services = await Service.find();
        res.json({
            success: true,
            count: services.length,
            data: services
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching services',
            error: error.message 
        });
    }
});

// Create a new contact message
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, phone, message } = req.body;
        
        // Validation (from your proposal - input-validated forms)
        if (!name || !email || !message) {
            return res.status(400).json({
                success: false,
                message: 'Please provide name, email, and message'
            });
        }

        const newContact = new Contact({ name, email, phone, message });
        await newContact.save();
        
        res.status(201).json({
            success: true,
            message: '✅ Thank you! Your message has been sent successfully.',
            data: newContact
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error sending message',
            error: error.message
        });
    }
});

// Get all contacts (for admin)
app.get('/api/contacts', async (req, res) => {
    try {
        const contacts = await Contact.find().sort({ createdAt: -1 });
        res.json({
            success: true,
            count: contacts.length,
            data: contacts
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching contacts',
            error: error.message
        });
    }
});

// Database test route
app.get('/api/db-test', async (req, res) => {
    try {
        const connectionState = mongoose.connection.readyState;
        const states = {
            0: 'Disconnected ❌',
            1: 'Connected ✅',
            2: 'Connecting ⏳',
            3: 'Disconnecting ⏳'
        };

        let collections = [];
        if (mongoose.connection.readyState === 1) {
            collections = await mongoose.connection.db.listCollections().toArray();
        }
        
        res.json({
            status: 'success',
            connection: {
                state: states[connectionState] || 'Unknown',
                stateCode: connectionState,
                host: mongoose.connection.host || 'Not connected',
                database: mongoose.connection.db ? mongoose.connection.db.databaseName : 'Not connected'
            },
            collections: collections.map(c => c.name),
            timestamp: new Date()
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Database test failed',
            error: error.message
        });
    }
});

// ===== START THE SERVER =====
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 Test API: http://localhost:${PORT}/api/test`);
    console.log(`📡 Database Test: http://localhost:${PORT}/api/db-test`);
    console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('🛑 MongoDB connection closed');
    process.exit(0);
});
