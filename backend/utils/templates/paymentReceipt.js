const generatePaymentReceipt = (user, subscription, paymentData = {}) => {
  const planName = subscription.planSnapshot?.name || subscription.planName || 'Pro Subscription Plan';
  
  // Calculate price accurately
  const rawAmount = paymentData.amount !== undefined ? paymentData.amount : (subscription.totalAmount || subscription.planSnapshot?.price || subscription.planSnapshot?.pricingDetails?.totalAmount || 0);
  // If amount is in paise (e.g. > 5000 for ₹50), format properly
  const formattedAmount = (typeof rawAmount === 'number' && rawAmount > 500 && rawAmount % 100 === 0) ? (rawAmount / 100) : rawAmount;
  
  const currency = (paymentData.currency || subscription.currency || 'INR').toUpperCase();
  const symbol = currency === 'INR' ? '₹' : '$';

  const orderId = paymentData.orderId || subscription.orderId || 'N/A';
  const transactionId = paymentData.paymentId || subscription.paymentId || 'N/A';
  const paymentProvider = paymentData.paymentProvider || (paymentData.paymentId?.startsWith('pay_') || paymentData.paymentId?.startsWith('rzp_') ? 'Razorpay' : 'Razorpay Secure');
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Receipt - LucoHire</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 40px 10px;">
      <tr>
        <td align="center">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08); border: 1px solid #e2e8f0;">
            
            <!-- Header -->
            <tr>
              <td style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); padding: 36px 32px; text-align: center;">
                <div style="font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; margin-bottom: 8px;">
                  LucoHire
                </div>
                <div style="display: inline-block; background-color: rgba(16, 185, 129, 0.2); border: 1px solid #10b981; color: #34d399; font-size: 13px; font-weight: 600; padding: 4px 12px; border-radius: 20px; margin-top: 6px;">
                  ✓ Payment Successful
                </div>
              </td>
            </tr>

            <!-- Body Content -->
            <tr>
              <td style="padding: 36px 32px;">
                <div style="font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 12px;">
                  Hi ${user.name || 'Valued Member'},
                </div>
                <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #475569;">
                  Thank you for your payment. Your subscription for <strong>${planName}</strong> has been successfully activated on your LucoHire account.
                </p>

                <!-- Receipt Table Card -->
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; padding: 20px; margin-bottom: 28px;">
                  <tr>
                    <td style="padding: 8px 0; font-size: 14px; color: #64748b;">Plan Name</td>
                    <td align="right" style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #0f172a;">${planName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-size: 14px; color: #64748b;">Date</td>
                    <td align="right" style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #0f172a;">${date}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-size: 14px; color: #64748b;">Payment Method</td>
                    <td align="right" style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #0f172a;">${paymentProvider}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-size: 14px; color: #64748b;">Transaction Ref</td>
                    <td align="right" style="padding: 8px 0; font-size: 13px; font-weight: 500; color: #334155;">${transactionId}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-size: 14px; color: #64748b;">Order ID</td>
                    <td align="right" style="padding: 8px 0; font-size: 13px; font-weight: 500; color: #334155;">${orderId}</td>
                  </tr>
                  <tr>
                    <td colspan="2" style="padding-top: 12px; border-top: 1px dashed #cbd5e1;"></td>
                  </tr>
                  <tr>
                    <td style="font-size: 16px; font-weight: 700; color: #0f172a;">Total Paid</td>
                    <td align="right" style="font-size: 22px; font-weight: 800; color: #4f46e5;">${symbol}${formattedAmount}</td>
                  </tr>
                </table>

                <!-- Action Button -->
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td align="center">
                      <a href="${process.env.FRONTEND_URL || 'https://www.lucohire.com'}/provider/dashboard" style="display: block; width: 100%; max-width: 240px; background-color: #4f46e5; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 20px; border-radius: 10px; text-align: center; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);">
                        Go to Dashboard →
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 13px; color: #94a3b8; line-height: 1.5;">
                Need assistance? Reply directly to this email or visit our support center.<br>
                &copy; ${new Date().getFullYear()} LucoHire. All rights reserved.
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
};

module.exports = { generatePaymentReceipt };
