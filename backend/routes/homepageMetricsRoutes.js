const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");
const { getCachedMetrics, computeAndCacheMetrics } = require("../workers/homepageMetrics.worker");

// @desc    Get cached landing page stats (with DB fallback)
// @route   GET /api/public/homepage-metrics
// @access  Public
router.get("/public/homepage-metrics", async (req, res) => {
  try {
    const metrics = await getCachedMetrics();
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error("[GET /public/homepage-metrics] Failed:", error);
    res.status(500).json({ success: false, message: "Failed to fetch homepage metrics" });
  }
});

// @desc    Admin manual metrics refresh
// @route   POST /api/admin/homepage-metrics/refresh
// @access  Private (Admin/Manager)
router.post("/admin/homepage-metrics/refresh", protect, authorize("admin", "manager"), async (req, res) => {
  try {
    const metrics = await computeAndCacheMetrics();
    res.json({
      success: true,
      message: "Homepage metrics refreshed successfully",
      data: metrics
    });
  } catch (error) {
    console.error("[POST /homepage-metrics/refresh] Failed:", error);
    res.status(500).json({ success: false, message: "Failed to refresh homepage metrics", error: error.message });
  }
});

module.exports = router;
