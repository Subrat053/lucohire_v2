const recruiterPlanService = require("../services/recruiterPlanService");

exports.getAvailablePlans = async (req, res) => {
  try {
    const plans = await recruiterPlanService.getAvailablePlans();
    res.status(200).json({ success: true, data: plans });
  } catch (error) {
    const msg =
      error.error?.description || error.message || "Failed to fetch plans";
    res.status(500).json({ success: false, message: msg });
  }
};

exports.getMyPlan = async (req, res) => {
  try {
    const subscription = await recruiterPlanService.getMyPlan(req.user._id);
    res.status(200).json({ success: true, data: subscription });
  } catch (error) {
    const msg =
      error.error?.description || error.message || "An error occurred";
    res.status(500).json({ success: false, message: msg });
  }
};

exports.generateCheckoutSession = async (req, res) => {
  try {
    const { planId, durationMonths, isAutoRenew } = req.body;

    const checkoutData = await recruiterPlanService.generateCheckoutSession(
      req.user,
      planId,
      durationMonths,
      isAutoRenew,
    );

    res.status(200).json({
      success: true,
      keyId: process.env.RAZORPAY_KEY_ID,
      ...checkoutData,
    });
  } catch (error) {
    const msg =
      error.error?.description || error.message || "An error occurred";
    res.status(500).json({ success: false, message: msg });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const result = await recruiterPlanService.verifyAndActivate(
      req.user,
      req.body,
    );
    res
      .status(200)
      .json({
        success: true,
        data: result,
        message: "Payment verified and subscription activated successfully.",
      });
  } catch (error) {
    const msg =
      error.error?.description || error.message || "An error occurred";
    res.status(500).json({ success: false, message: msg });
  }
};
