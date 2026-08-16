const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");

// Load environment variables
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection is optional for local static storefront previews.
const fs = require('fs');
const dataDir = path.join(__dirname, 'data');
const contactsFile = path.join(dataDir, 'contacts.json');
let dbMode = 'file';

if (process.env.MONGO_URI) {
  mongoose.connect(process.env.MONGO_URI)
    .then(() => {
      console.log("✅ MongoDB Atlas connected");
      dbMode = 'mongo';
    })
    .catch(err => {
      console.error("❌ MongoDB connection error:", err.message);
      console.warn("Proceeding with file-based storage (data/contacts.json)");
      dbMode = 'file';
    });
} else {
  console.warn("⚠️ MONGO_URI is not defined. Using file-based storage at data/contacts.json");
}

// ensure data directory and file exist for file-based fallback
try {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(contactsFile)) fs.writeFileSync(contactsFile, '[]', 'utf8');
} catch (err) {
  console.error('❌ Error ensuring data directory:', err);
}

// Import Contact model
const Contact = require("./models/Contact");

// Serve static files (frontend)
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Test API route — reports current storage mode
app.get("/api/message", (req, res) => {
  const msg = dbMode === 'mongo' ? 'Cloud MongoDB connected 🚀' : 'Running in file-storage mode (no MongoDB)';
  res.json({ message: msg, mode: dbMode });
});

// Contact form submission (POST)
app.post("/api/contact", async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (dbMode === 'mongo' && process.env.MONGO_URI) {
      const newContact = new Contact({ name, email, message });
      const savedContact = await newContact.save();
      console.log("✅ Saved contact (mongo):", savedContact);
      return res.status(201).json({ success: true, contact: savedContact });
    }

    // File-based fallback
    const raw = fs.readFileSync(contactsFile, 'utf8') || '[]';
    const contacts = JSON.parse(raw);
    const newContact = { id: Date.now().toString(), name, email, message, createdAt: new Date().toISOString() };
    contacts.unshift(newContact);
    fs.writeFileSync(contactsFile, JSON.stringify(contacts, null, 2), 'utf8');
    console.log("✅ Saved contact (file):", newContact);
    return res.status(201).json({ success: true, contact: newContact, stored: 'file' });
  } catch (error) {
    console.error("❌ Error saving contact:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Fetch all contacts (GET)
app.get("/api/contacts", async (req, res) => {
  try {
    if (dbMode === 'mongo' && process.env.MONGO_URI) {
      const contacts = await Contact.find().sort({ createdAt: -1 });
      console.log(`📂 Retrieved ${contacts.length} contacts (mongo)`);
      return res.json(contacts);
    }

    // File-based
    const raw = fs.readFileSync(contactsFile, 'utf8') || '[]';
    const contacts = JSON.parse(raw);
    console.log(`📂 Retrieved ${contacts.length} contacts (file)`);
    res.json(contacts);
  } catch (error) {
    console.error("❌ Error fetching contacts:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Start servernode server.js
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
