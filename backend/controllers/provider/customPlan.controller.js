const customPlanService = require('../../services/provider/customPlan.service');

const getCustomPlanOptions = async (req, res) => {
  try {
    const options = await customPlanService.getOptions(req.user._id);
    res.json(options);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch options', error: error.message });
  }
};

const getPlaceSuggestions = async (req, res) => {
  try {
    const { input, type, userLat, userLng } = req.query;
    const places = await customPlanService.getSuggestions(input, type, userLat, userLng);
    res.json(places);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to search places', error: error.message });
  }
};

const getPlaceDetailsProxy = async (req, res) => {
  try {
    const { placeId, type } = req.query;
    if (!placeId) {
      return res.status(400).json({ success: false, message: 'placeId is required' });
    }
    const details = await customPlanService.getDetails(placeId, type);
    res.json(details);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch place details', error: error.message });
  }
};

const calculateCustomPlanPrice = async (req, res) => {
  try {
    const { items = [] } = req.body;
    if (items.length === 0) {
      return res.json({
        success: true,
        lineItems: [],
        subtotal: 0,
        gstPercent: 0,
        gstAmount: 0,
        discountAmount: 0,
        totalAmount: 0,
        savingsAmount: 0
      });
    }

    const calculated = await customPlanService.calculatePrice(items);
    res.json({
      success: true,
      ...calculated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Pricing calculation failed', error: error.message });
  }
};

const createPendingCustomPlan = async (req, res) => {
  try {
    const { items = [], selectedGoals = [] } = req.body;

    if (items.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one skill visibility item is required.' });
    }

    const created = await customPlanService.createPendingPlan(req.user._id, items, selectedGoals, req.user);
    res.json({
      success: true,
      ...created
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to initialize customised checkout', error: error.message });
  }
};

const getCurrentCustomPlan = async (req, res) => {
  try {
    const activePlan = await customPlanService.getCurrentPlan(req.user._id);
    res.json(activePlan || null);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve active plan', error: error.message });
  }
};

module.exports = {
  getCustomPlanOptions,
  getPlaceSuggestions,
  getPlaceDetailsProxy,
  calculateCustomPlanPrice,
  createPendingCustomPlan,
  getCurrentCustomPlan
};
