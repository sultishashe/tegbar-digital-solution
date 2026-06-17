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

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Allow cross-origin requests
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Rate limiting (from your proposal)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// MongoDB Connection Function
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ MongoDB Connected Successfully!');
        console.log(`📍 Database: ${mongoose.connection.db.databaseName}`);
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error.message);
        process.exit(1); // Exit process with failure
    }
};

// Connect to MongoDB
connectDB();

// Monitor MongoDB connection events
mongoose.connection.on('disconnected', () => {
    console.log('⚠️ MongoDB Disconnected');
});

mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB Error:', err);
});

// ===== CREATE YOUR MODELS =====

// Example: Create a User Model (for authentication)
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

// Example: Create a Service Model (from your proposal)
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

// Example: Create a Contact Model (from your Communication Hub)
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

// ===== CREATE ROUTES =====

// Test Route - Check if server is working
app.get('/api/test', (req, res) => {
    res.json({ 
        message: '✅ Tegbar Digital Solution API is running!',
        timestamp: new Date(),
        database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
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

// ===== EXAMPLE API ROUTES =====

// 1. Get all services (from your Service Showcase requirement)
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

// 2. Create a new contact message (from your Communication Hub)
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

// 3. Get all contacts (for admin)
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

// ===== START THE SERVER =====

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 API Test Endpoint: http://localhost:${PORT}/api/test`);
    console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('🛑 MongoDB connection closed');
    process.exit(0);
});
