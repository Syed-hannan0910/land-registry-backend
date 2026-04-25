// India Land Registry Backend API Server
// With Admin Authentication & AI Integration

require('dotenv').config();
const express = require('express');
const cors = require('cors');
// ... other requires like dotenv or ethers

const app = express(); // 1. INITIALIZE FIRST

// 2. NOW APPLY CORS
app.use(cors({ 
  origin: 'https://land-registry-frontend-swart.vercel.app' 
}));

app.use(express.json());
const helmet = require('helmet');
const { ethers } = require('ethers');
const multer = require('multer');
const Tesseract = require('tesseract.js');

const app = express();

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// File upload configuration
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// ==================== AUTHENTICATION ====================

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

const checkAdmin = (req, res, next) => {
    const password = req.headers['x-admin-password'];
    if (password === ADMIN_PASSWORD) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized. Provide X-Admin-Password header.' });
    }
};

// ==================== BLOCKCHAIN SETUP ====================

const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
const wallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider);

const CONTRACT_ABI = [
    "function registerProperty(string ulpin, string ownerDID, string ownerName, string state, string district, string village, string propertyType, uint256 totalArea, string latitude, string longitude, string documentsHash) public",
    "function addVerification(string ulpin, uint8 level, string officerName, string designation, string proofHash, string remarks, string gpsCoordinates) public",
    "function transferOwnership(string ulpin, address newOwner, string newOwnerName, uint256 saleValue, uint256 stampDuty, string documentHash, bool taxCompliant) public",
    "function recordMutation(string ulpin, string oldOwnerName, string newOwnerName, address newOwnerAddress, string reason, string mutationOrderHash) public",
    "function getProperty(string ulpin) public view returns (tuple(string ulpin, address currentOwner, string ownerName, string ownerDID, string state, string district, string village, string propertyType, uint256 totalArea, string latitude, string longitude, string documentsHash, uint8 status, uint256 registrationDate, uint256 lastUpdated, bool hasDispute, bool exists))",
    "function getAllProperties() public view returns (string[])",
    "function getStatistics() public view returns (uint256, uint256, uint256)"
];

const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, CONTRACT_ABI, wallet);

// ==================== DATABASE SETUP ====================

const { createClient } = require('@supabase/supabase-js');
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// ==================== AI FUNCTIONS ====================

// AI: OCR - Extract text from documents
async function performOCR(imageBuffer) {
    try {
        const { data: { text } } = await Tesseract.recognize(imageBuffer, 'eng+hin', {
            logger: m => console.log(m)
        });
        
        // Extract structured data
        const extractedData = extractPropertyDataFromText(text);
        return { success: true, text, extractedData };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function extractPropertyDataFromText(text) {
    const data = {};
    
    // Extract owner name
    const ownerMatch = text.match(/owner[:\s]+([a-zA-Z\s]+)/i);
    if (ownerMatch) data.ownerName = ownerMatch[1].trim();
    
    // Extract area
    const areaMatch = text.match(/area[:\s]+(\d+\.?\d*)\s*(sq\.?\s*m|sqm|square\s*meter)/i);
    if (areaMatch) data.area = parseFloat(areaMatch[1]);
    
    // Extract district
    const districtMatch = text.match(/district[:\s]+([a-zA-Z\s]+)/i);
    if (districtMatch) data.district = districtMatch[1].trim();
    
    return data;
}

// AI: Fraud Detection
async function detectFraud(propertyData, documentHash) {
    const fraudIndicators = [];
    let riskScore = 0;
    
    // Check 1: Duplicate documents
    const { data: existingDocs } = await db
        .from('properties')
        .select('ulpin')
        .eq('documents_hash', documentHash);
    
    if (existingDocs && existingDocs.length > 0) {
        fraudIndicators.push('Document hash already exists in system');
        riskScore += 40;
    }
    
    // Check 2: Unrealistic area
    if (propertyData.totalArea > 100000) {
        fraudIndicators.push('Unusually large property area');
        riskScore += 20;
    }
    
    // Check 3: Same GPS coordinates
    const { data: sameLocation } = await db
        .from('properties')
        .select('ulpin')
        .eq('latitude', propertyData.latitude)
        .eq('longitude', propertyData.longitude);
    
    if (sameLocation && sameLocation.length > 0) {
        fraudIndicators.push('Multiple properties at same GPS coordinates');
        riskScore += 30;
    }
    
    const riskLevel = riskScore >= 60 ? 'HIGH' : riskScore >= 30 ? 'MEDIUM' : 'LOW';
    
    return {
        riskScore,
        riskLevel,
        fraudIndicators,
        recommendation: riskScore >= 60 ? 'REJECT' : riskScore >= 30 ? 'MANUAL_REVIEW' : 'APPROVE',
        timestamp: new Date().toISOString()
    };
}

// ==================== HELPER FUNCTIONS ====================

function generateULPIN(propertyData) {
    const stateCodes = {
        'Karnataka': '29', 'Maharashtra': '27', 'Tamil Nadu': '33',
        'Kerala': '32', 'Andhra Pradesh': '37', 'Telangana': '36'
    };
    const stateCode = stateCodes[propertyData.state] || '00';
    const randomNumber = Math.floor(Math.random() * 900000000000 + 100000000000);
    return `${stateCode}${randomNumber}`;
}

// ==================== API ENDPOINTS ====================

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        blockchain: contract ? 'connected' : 'disconnected',
        database: db ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

// Get contract info
app.get('/api/info', async (req, res) => {
    try {
        const stats = await contract.getStatistics();
        res.json({
            success: true,
            totalProperties: stats[0].toString(),
            totalTransactions: stats[1].toString(),
            totalMutations: stats[2].toString(),
            contractAddress: process.env.CONTRACT_ADDRESS
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// AI: OCR Document
app.post('/api/ai/ocr', checkAdmin, upload.single('document'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        const result = await performOCR(req.file.buffer);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// AI: Fraud Detection
app.post('/api/ai/fraud-check', checkAdmin, async (req, res) => {
    try {
        const { propertyData, documentHash } = req.body;
        const fraudCheck = await detectFraud(propertyData, documentHash);
        res.json({ success: true, fraudCheck });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Register Property
app.post('/api/properties/register', checkAdmin, async (req, res) => {
    try {
        const propertyData = JSON.parse(req.body.propertyData);
        const ulpin = generateULPIN(propertyData);
        
        // Run fraud detection
        const fraudCheck = await detectFraud(propertyData, 'hash_' + Date.now());
        
        if (fraudCheck.recommendation === 'REJECT') {
            return res.status(400).json({
                success: false,
                error: 'Property registration flagged for fraud',
                fraudCheck
            });
        }
        
        // Register on blockchain
        const tx = await contract.registerProperty(
            ulpin,
            propertyData.ownerDID || `did:india:${Date.now()}`,
            propertyData.ownerName,
            propertyData.state,
            propertyData.district,
            propertyData.village,
            propertyData.propertyType,
            ethers.parseUnits(propertyData.totalArea.toString(), 0),
            propertyData.latitude,
            propertyData.longitude,
            'ipfs_hash_' + Date.now()
        );
        
        const receipt = await tx.wait();
        
        // Save to database
        await db.from('properties').insert({
            ulpin,
            owner_name: propertyData.ownerName,
            state: propertyData.state,
            district: propertyData.district,
            village: propertyData.village,
            property_type: propertyData.propertyType,
            total_area: propertyData.totalArea,
            latitude: propertyData.latitude,
            longitude: propertyData.longitude,
            documents_hash: 'hash_' + Date.now(),
            transaction_hash: receipt.hash,
            fraud_check: fraudCheck,
            status: 'Pending',
            created_at: new Date().toISOString()
        });
        
        res.json({
            success: true,
            ulpin,
            transactionHash: receipt.hash,
            fraudCheck,
            message: fraudCheck.riskLevel === 'MEDIUM' 
                ? 'Property registered but flagged for manual review' 
                : 'Property registered successfully'
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get Property Details
app.get('/api/properties/:ulpin', async (req, res) => {
    try {
        const { ulpin } = req.params;
        const property = await contract.getProperty(ulpin);
        
        res.json({
            success: true,
            property: {
                ulpin: property.ulpin,
                owner: property.currentOwner,
                ownerName: property.ownerName,
                state: property.state,
                district: property.district,
                village: property.village,
                propertyType: property.propertyType,
                totalArea: property.totalArea.toString(),
                latitude: property.latitude,
                longitude: property.longitude,
                status: ['Pending', 'L1Verified', 'L2Verified', 'L3Verified', 'Verified'][Number(property.status)],
                hasDispute: property.hasDispute,
                registrationDate: new Date(Number(property.registrationDate) * 1000).toISOString()
            }
        });
    } catch (error) {
        res.status(404).json({ error: 'Property not found' });
    }
});

// Get All Properties
app.get('/api/properties', async (req, res) => {
    try {
        const { data } = await db
            .from('properties')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);
        
        res.json({ success: true, properties: data || [] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Search Properties
app.post('/api/properties/search', async (req, res) => {
    try {
        const { district, village, state } = req.body;
        
        let query = db.from('properties').select('*');
        
        if (district) query = query.eq('district', district);
        if (village) query = query.eq('village', village);
        if (state) query = query.eq('state', state);
        
        const { data } = await query;
        
        res.json({ success: true, properties: data || [] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Land Registry API running on port ${PORT}`);
    console.log(`🔐 Admin Password: ${ADMIN_PASSWORD}`);
    console.log(`🤖 AI Features: OCR + Fraud Detection Enabled`);
    console.log(`📦 Blockchain: ${contract ? 'Connected' : 'Not connected'}`);
});

module.exports = app;
// ==================== IPFS / PINATA SETUP ====================
const axios = require('axios');
const FormData = require('form-data');

async function uploadToPinata(fileBuffer, fileName) {
    try {
        const formData = new FormData();
        formData.append('file', fileBuffer, { filename: fileName });

        const res = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
            maxBodyLength: "Infinity",
            headers: {
                'Authorization': `Bearer ${process.env.PINATA_JWT}`,
                ...formData.getHeaders()
            }
        });
        
        return res.data.IpfsHash; // Returns the CID (Unique Hash)
    } catch (error) {
        console.error('Pinata upload error:', error);
        return null;
    }
}
