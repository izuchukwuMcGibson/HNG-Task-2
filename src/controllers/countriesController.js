import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Country from "../models/country.js";
import Meta from "../models/Meta.js";
import { generateSummaryImage } from "../utils/image.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Helper function to send 503 error for external API failures
 */
function sendExternalApiError(res, apiName) {
  return res.status(503).json({
    error: "External data source unavailable",
    details: `Could not fetch data from ${apiName}`,
  });
}

/**
 * POST /countries/refresh
 * Fetch countries and exchange rates, then cache in database
 */
export async function refreshCountries(req, res, next) {
  const countriesApiUrl =
    "https://restcountries.com/v2/all?fields=name,capital,region,population,flag,currencies";
  const exchangeRatesApiUrl = "https://open.er-api.com/v6/latest/USD";

  let countriesData;
  let exchangeRatesData;

  // Fetch countries data
  try {
    console.log("Fetching countries from restcountries.com...");
    const countriesResponse = await fetch(countriesApiUrl, { timeout: 15000 });

    if (!countriesResponse.ok) {
      console.error(
        `Countries API returned status: ${countriesResponse.status}`
      );
      return sendExternalApiError(res, "restcountries.com");
    }

    countriesData = await countriesResponse.json();
    console.log(`✅ Fetched ${countriesData.length} countries`);
  } catch (error) {
    console.error("Error fetching countries:", error.message);
    return sendExternalApiError(res, "restcountries.com");
  }

  // Fetch exchange rates
  try {
    console.log("Fetching exchange rates from open.er-api.com...");
    const exchangeResponse = await fetch(exchangeRatesApiUrl, {
      timeout: 15000,
    });

    if (!exchangeResponse.ok) {
      console.error(`Exchange API returned status: ${exchangeResponse.status}`);
      return sendExternalApiError(res, "open.er-api.com");
    }

    exchangeRatesData = await exchangeResponse.json();
    console.log(
      `✅ Fetched exchange rates for ${
        Object.keys(exchangeRatesData.rates).length
      } currencies`
    );
  } catch (error) {
    console.error("Error fetching exchange rates:", error.message);
    return sendExternalApiError(res, "open.er-api.com");
  }

  // Validate data
  if (
    !Array.isArray(countriesData) ||
    !exchangeRatesData ||
    !exchangeRatesData.rates
  ) {
    console.error("Invalid data structure from external APIs");
    return sendExternalApiError(res, "external APIs");
  }

  const exchangeRates = exchangeRatesData.rates;
  const refreshTimestamp = new Date();

  // Prepare bulk operations
  const bulkOperations = [];

  for (const country of countriesData) {
    const name = country.name || "Unknown";
    const capital = country.capital || null;
    const region = country.region || null;
    const population =
      typeof country.population === "number" ? country.population : 0;
    const flag_url = country.flag || null;

    let currency_code = null;
    let exchange_rate = null;
    let estimated_gdp = null;

    // Handle currency extraction
    if (Array.isArray(country.currencies) && country.currencies.length > 0) {
      const firstCurrency = country.currencies[0];
      if (firstCurrency && firstCurrency.code) {
        currency_code = firstCurrency.code;
      }
    }

    // Calculate exchange rate and estimated GDP
    if (currency_code === null) {
      // No currency: set exchange_rate to null, estimated_gdp to 0
      exchange_rate = null;
      estimated_gdp = 0;
    } else {
      const rate = exchangeRates[currency_code];

      if (typeof rate === "number" && rate > 0) {
        exchange_rate = rate;

        // Generate random multiplier between 1000 and 2000
        const randomMultiplier = Math.floor(Math.random() * 1001) + 1000;
        estimated_gdp = (population * randomMultiplier) / exchange_rate;
      } else {
        // Currency code not found in exchange rates
        exchange_rate = null;
        estimated_gdp = null;
      }
    }

    // Prepare document for upsert
    const countryDoc = {
      name,
      nameLower: name.toLowerCase(),
      capital,
      region,
      population,
      currency_code,
      exchange_rate,
      estimated_gdp,
      flag_url,
      last_refreshed_at: refreshTimestamp,
    };

    // Add to bulk operations (upsert by nameLower)
    bulkOperations.push({
      updateOne: {
        filter: { nameLower: name.toLowerCase() },
        update: { $set: countryDoc },
        upsert: true,
      },
    });
  }

  if (bulkOperations.length === 0) {
    return res.status(500).json({ error: "Internal server error" });
  }

  try {
    // Execute bulk write
    console.log(`Processing ${bulkOperations.length} countries...`);
    const bulkResult = await Country.bulkWrite(bulkOperations, {
      ordered: false,
    });
    console.log(
      `✅ Database updated: ${bulkResult.upsertedCount} inserted, ${bulkResult.modifiedCount} updated`
    );

    // Update global last_refreshed_at timestamp
    await Meta.updateOne(
      { key: "last_refreshed_at" },
      { $set: { value: refreshTimestamp.toISOString() } },
      { upsert: true }
    );

    // Generate summary image
    try {
      console.log("Generating summary image...");
      const totalCountries = await Country.countDocuments();

      // Get top 5 countries by estimated GDP (exclude null values)
      const top5Countries = await Country.find({
        estimated_gdp: { $ne: null, $gt: 0 },
      })
        .sort({ estimated_gdp: -1 })
        .limit(5)
        .lean();

      await generateSummaryImage({
        total: totalCountries,
        top5: top5Countries,
        last_refreshed_at: refreshTimestamp.toISOString(),
      });

      console.log("✅ Summary image generated");
    } catch (imageError) {
      console.error("Failed to generate summary image:", imageError.message);
      // Don't fail the entire refresh if image generation fails
    }

    // Send success response
    res.json({
      message: "Refresh successful",
      total_updated_or_inserted:
        bulkResult.upsertedCount + bulkResult.modifiedCount,
      last_refreshed_at: refreshTimestamp.toISOString(),
    });
  } catch (error) {
    console.error("Database error during refresh:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * GET /countries
 * Get all countries with optional filters and sorting
 */
export async function getCountries(req, res, next) {
  try {
    const { region, currency, sort } = req.query;

    // Build filter
    const filter = {};
    if (region) {
      filter.region = region;
    }
    if (currency) {
      filter.currency_code = currency;
    }

    // Build query
    let query = Country.find(filter);

    // Apply sorting
    if (sort === "gdp_desc") {
      query = query.sort({ estimated_gdp: -1 });
    } else if (sort === "gdp_asc") {
      query = query.sort({ estimated_gdp: 1 });
    }

    // Execute query
    const countries = await query.lean();

    // Format response
    const formattedCountries = countries.map((country) => ({
      id: country._id,
      name: country.name,
      capital: country.capital,
      region: country.region,
      population: country.population,
      currency_code: country.currency_code,
      exchange_rate: country.exchange_rate,
      estimated_gdp: country.estimated_gdp,
      flag_url: country.flag_url,
      last_refreshed_at: country.last_refreshed_at
        ? new Date(country.last_refreshed_at).toISOString()
        : null,
    }));

    res.json(formattedCountries);
  } catch (error) {
    console.error("Error fetching countries:", error);
    next(error);
  }
}

/**
 * GET /countries/:name
 * Get a single country by name (case-insensitive)
 */
export async function getCountryByName(req, res, next) {
  try {
    const { name } = req.params;

    if (!name) {
      return res.status(400).json({
        error: "Validation failed",
        details: { name: "is required" },
      });
    }

    // Find country (case-insensitive)
    const country = await Country.findOne({
      nameLower: name.toLowerCase(),
    }).lean();

    if (!country) {
      return res.status(404).json({ error: "Country not found" });
    }

    // Format response
    const formattedCountry = {
      id: country._id,
      name: country.name,
      capital: country.capital,
      region: country.region,
      population: country.population,
      currency_code: country.currency_code,
      exchange_rate: country.exchange_rate,
      estimated_gdp: country.estimated_gdp,
      flag_url: country.flag_url,
      last_refreshed_at: country.last_refreshed_at
        ? new Date(country.last_refreshed_at).toISOString()
        : null,
    };

    res.json(formattedCountry);
  } catch (error) {
    console.error("Error fetching country:", error);
    next(error);
  }
}

/**
 * DELETE /countries/:name
 * Delete a country by name (case-insensitive)
 */
export async function deleteCountryByName(req, res, next) {
  try {
    const { name } = req.params;

    if (!name) {
      return res.status(400).json({
        error: "Validation failed",
        details: { name: "is required" },
      });
    }

    // Find and delete country (case-insensitive)
    const deletedCountry = await Country.findOneAndDelete({
      nameLower: name.toLowerCase(),
    }).lean();

    if (!deletedCountry) {
      return res.status(404).json({ error: "Country not found" });
    }

    res.json({ message: "Country deleted" });
  } catch (error) {
    console.error("Error deleting country:", error);
    next(error);
  }
}

/**
 * GET /countries/image
 * Serve the generated summary image
 */
export async function getSummaryImage(req, res, next) {
  try {
    const imagePath = path.resolve("cache", "summary.png");

    // Check if image exists
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ error: "Summary image not found" });
    }

    // Serve the image
    res.sendFile(imagePath);
  } catch (error) {
    console.error("Error serving image:", error);
    next(error);
  }
}

/**
 * POST /countries/image/refresh
 * Regenerate the summary image from DB contents (no external API calls)
 */
export async function regenerateSummaryImage(req, res, next) {
  try {
    // Gather data from DB
    const totalCountries = await Country.countDocuments();

    const top5Countries = await Country.find({
      estimated_gdp: { $ne: null, $gt: 0 },
    })
      .sort({ estimated_gdp: -1 })
      .limit(5)
      .lean();

    const lastRefreshMeta = await Meta.findOne({
      key: "last_refreshed_at",
    }).lean();
    const last_refreshed_at = lastRefreshMeta
      ? lastRefreshMeta.value
      : new Date().toISOString();

    // Generate image
    try {
      await generateSummaryImage({
        total: totalCountries,
        top5: top5Countries,
        last_refreshed_at,
      });

      return res.json({
        message: "Image regenerated",
        path: "/cache/summary.png",
      });
    } catch (imgErr) {
      console.error(
        "Failed to generate summary image:",
        imgErr.message || imgErr
      );
      return res
        .status(500)
        .json({ error: "Failed to generate summary image" });
    }
  } catch (error) {
    console.error("Error regenerating image:", error);
    next(error);
  }
}
