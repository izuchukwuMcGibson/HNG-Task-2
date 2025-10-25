import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import countriesRouter from "./src/routes/countries.js";
import statusRouter from "./src/routes/status.js";

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/countries", countriesRouter);
app.use("/status", statusRouter);

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Country Currency & Exchange API",
    version: "1.0.0",
    endpoints: {
      refresh: "POST /countries/refresh",
      list: "GET /countries",
      single: "GET /countries/:name",
      delete: "DELETE /countries/:name",
      status: "GET /status",
      image: "GET /countries/image"
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Error:", err);
  
  if (err.status && err.json) {
    return res.status(err.status).json(err.json);
  }
  
  res.status(500).json({ error: "Internal server error" });
});

// Configuration
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI ;

// Start server
async function startServer() {
  try {
    // Connect to MongoDB
    // Mongoose v6+ ignores `useNewUrlParser` and `useUnifiedTopology` options
    // so connect with the URI only. Add options later if needed (e.g. timeouts).
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Start Express server
    app.listen(PORT,"0.0.0.0", () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 API available at http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

startServer();