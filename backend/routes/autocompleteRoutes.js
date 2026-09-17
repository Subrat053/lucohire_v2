const express = require("express");
const router = express.Router();
const prisma = require('../config/prisma');
const { getTypesenseClient } = require("../services/typesenseService");

// @desc    Get verified GeoNames cities suggestions
// @route   GET /api/location/autocomplete
// @access  Public
router.get("/autocomplete", async (req, res) => {
  try {
    const { q, countryCode } = req.query;

    if (!q || String(q).trim().length === 0) {
      return res.json([]);
    }

    const searchQuery = String(q).trim();
    const ts = getTypesenseClient();

    // 1. Typesense Search (Primary)
    if (ts) {
      try {
        let filterBy = "";
        if (countryCode) {
          filterBy = `countryCode:=${countryCode.toUpperCase()}`;
        }

        const searchResults = await ts.collections("geonames_cities").documents().search({
          q: searchQuery,
          query_by: "name,asciiName,searchText",
          filter_by: filterBy || undefined,
          sort_by: "population:desc",
          limit: 10,
        });

        const suggestions = (searchResults.hits || []).map((hit) => ({
          geonameId: hit.document.geonameId,
          name: hit.document.name,
          countryCode: hit.document.countryCode,
          admin1Name: hit.document.admin1Name,
          timezone: hit.document.timezone,
          latitude: hit.document.latitude,
          longitude: hit.document.longitude,
        }));

        return res.json(suggestions);
      } catch (tsErr) {
        console.error("[Typesense Autocomplete Error] Falling back to MongoDB:", tsErr.message);
      }
    }

    // 2. PostgreSQL/Prisma Search (Fallback)
    const filter = {};
    if (countryCode) {
      filter.countryCode = countryCode.toUpperCase();
    }

    filter.OR = [
      { name: { contains: searchQuery, mode: "insensitive" } },
      { asciiName: { contains: searchQuery, mode: "insensitive" } },
      { searchText: { contains: searchQuery, mode: "insensitive" } },
      { admin1Name: { contains: searchQuery, mode: "insensitive" } },
    ];

    const matchedCities = await prisma.geoNamesCity.findMany({
      where: filter, orderBy: { population: 'desc' }, take: 10,
    });

    const suggestions = matchedCities.map((city) => ({
      geonameId: city.geonameId,
      name: city.name,
      countryCode: city.countryCode,
      admin1Name: city.admin1Name,
      timezone: city.timezone,
      latitude: city.latitude,
      longitude: city.longitude,
    }));

    res.json(suggestions);
  } catch (error) {
    console.error("[Autocomplete Error] Endpoint failed:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
