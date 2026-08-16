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
if (process.env.MONGO_URI) {
  mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Atlas connected"))
    .catch(err => {
      console.error("❌ MongoDB connection error:", err.message);
    });
} else {
  console.warn("⚠️ MONGO_URI is not defined. App will run without MongoDB support.");
}

// Import Contact model
const Contact = require("./models/Contact");

// Serve static files (frontend)
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Test API route
app.get("/api/message", (req, res) => {
  res.json({ message: "Cloud MongoDB connected 🚀" });
});

// Contact form submission (POST)
app.post("/api/contact", async (req, res) => {
  try {
    if (!process.env.MONGO_URI) {
      return res.status(503).json({ error: "Database not configured yet. Please add MONGO_URI to enable form submissions." });
    }

    const { name, email, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const newContact = new Contact({ name, email, message });
    const savedContact = await newContact.save();

    console.log("✅ Saved contact:", savedContact);

    // Return saved document for confirmation
    res.status(201).json({ success: true, contact: savedContact });
  } catch (error) {
    console.error("❌ Error saving contact:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Fetch all contacts (GET)
app.get("/api/contacts", async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });
    console.log(`📂 Retrieved ${contacts.length} contacts`);
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
