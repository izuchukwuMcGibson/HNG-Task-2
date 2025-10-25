import express from "express";
import Meta from "../models/Meta.js";
import Country from "../models/country.js";

const router = express.Router();

// GET /status - Show total countries and last refresh timestamp
router.get("/", async (req, res, next) => {
  try {
    const totalCountries = await Country.countDocuments();
    const lastRefreshMeta = await Meta.findOne({ key: "last_refreshed_at" }).lean();
    
    const lastRefreshedAt = lastRefreshMeta ? lastRefreshMeta.value : null;

    res.json({
      total_countries: totalCountries,
      last_refreshed_at: lastRefreshedAt
    });
  } catch (error) {
    console.error("Error fetching status:", error);
    next(error);
  }
});

export default router;