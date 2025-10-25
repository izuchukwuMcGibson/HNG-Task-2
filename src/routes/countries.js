import express from "express";
import {
  refreshCountries,
  getCountries,
  getCountryByName,
  deleteCountryByName,
  getSummaryImage,
  regenerateSummaryImage,
} from "../controllers/countriesController.js";

const router = express.Router();

// POST /countries/refresh - Fetch and cache country data
router.post("/refresh", refreshCountries);

// GET /countries - List all countries with filters and sorting
router.get("/", getCountries);

// GET /countries/image - Serve summary image
router.get("/image", getSummaryImage);

// POST /countries/image/refresh - Regenerate summary image from DB
router.post("/image/refresh", regenerateSummaryImage);

// GET /countries/:name - Get single country by name
router.get("/:name", getCountryByName);

// DELETE /countries/:name - Delete country by name
router.delete("/:name", deleteCountryByName);

export default router;
