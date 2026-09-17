const { scanSEOHealth } = require("../jobs/seoScanner.cron.js");
const prisma = require('../config/prisma');

exports.getSeoHealthDashboard = async (req, res) => {
    try {
        const scanResult = await scanSEOHealth();
        res.status(200).json({
            success: true,
            data: scanResult
        });
    } catch (error) {
        console.error("Error in getSeoHealthDashboard:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

exports.updateSeoIntegration = async (req, res) => {
    try {
        const { id } = req.params;
        const { trackingId } = req.body;
        
        const settingKey = `seo_${id}`;
        
        await prisma.adminSetting.upsert({
            where: { key: settingKey },
            create: {
                key: settingKey, 
                value: trackingId,
                category: 'seo',
                description: `Tracking ID / Key for ${id}` 
            },
            update: {
                value: trackingId,
                category: 'seo',
                description: `Tracking ID / Key for ${id}`,
            },
        });
        
        res.status(200).json({ success: true, message: "Integration updated successfully" });
    } catch (error) {
        console.error("Error in updateSeoIntegration:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};
