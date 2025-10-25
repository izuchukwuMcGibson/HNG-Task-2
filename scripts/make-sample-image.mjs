import { generateSummaryImage } from "../src/utils/image.js";

(async () => {
  try {
    const sampleTop5 = [
      {
        name: "Country A",
        estimated_gdp: 9000000000,
        currency_code: "AAA",
        population: 50000000,
      },
      {
        name: "Country B",
        estimated_gdp: 8000000000,
        currency_code: "BBB",
        population: 30000000,
      },
      {
        name: "Country C",
        estimated_gdp: 7000000000,
        currency_code: "CCC",
        population: 20000000,
      },
      {
        name: "Country D",
        estimated_gdp: 6000000000,
        currency_code: "DDD",
        population: 10000000,
      },
      {
        name: "Country E",
        estimated_gdp: 5000000000,
        currency_code: "EEE",
        population: 5000000,
      },
    ];

    const out = await generateSummaryImage({
      total: 5,
      top5: sampleTop5,
      last_refreshed_at: new Date().toISOString(),
    });

    console.log("Sample image generated at:", out);
    process.exit(0);
  } catch (err) {
    console.error("Failed to generate sample image:", err);
    process.exit(1);
  }
})();
