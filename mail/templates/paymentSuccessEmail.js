exports.paymentSuccessEmail = (
  fullName,
  planName,
  amount,
  orderId,
  paymentId,
  startDate,
  endDate
) => {
  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <title>Payment Successful</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          background-color: #f5f7fa;
          padding: 20px;
        }
        .container {
          max-width: 600px;
          background: #ffffff;
          margin: auto;
          padding: 24px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }
        .header {
          text-align: center;
          border-bottom: 1px solid #eee;
          padding-bottom: 16px;
        }
        .header h1 {
          color: #2f855a;
        }
        .content {
          margin-top: 20px;
          color: #333;
          line-height: 1.6;
        }
        .details {
          background: #f9fafb;
          padding: 16px;
          border-radius: 6px;
          margin-top: 16px;
        }
        .details p {
          margin: 6px 0;
        }
        .footer {
          text-align: center;
          margin-top: 24px;
          font-size: 13px;
          color: #777;
        }
        .badge {
          display: inline-block;
          background: #e6fffa;
          color: #065f46;
          padding: 6px 12px;
          border-radius: 20px;
          font-weight: bold;
          margin-top: 10px;
        }
      </style>
    </head>

    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Payment Successful</h1>
          <div class="badge">${planName} Plan Activated</div>
        </div>

        <div class="content">
          <p>Hi <strong>${fullName}</strong>,</p>

          <p>
            Thank you for your payment! Your <strong>${planName}</strong> plan
            has been successfully activated.
          </p>

          <div class="details">
            <p><strong>Amount Paid:</strong> ₹${amount}</p>
            <p><strong>Order ID:</strong> ${orderId}</p>
            <p><strong>Payment ID:</strong> ${paymentId}</p>
            <p><strong>Plan Start:</strong> ${new Date(startDate).toDateString()}</p>
            <p><strong>Plan Expiry:</strong> ${new Date(endDate).toDateString()}</p>
          </div>

          <p style="margin-top: 16px;">
            You can now enjoy all premium features included in your plan.
            If you have any questions, feel free to contact our support team.
          </p>
        </div>

        <div class="footer">
          <p>
            © ${new Date().getFullYear()} Your App Name<br/>
            This is an automated email. Please do not reply.
          </p>
        </div>
      </div>
    </body>
  </html>
  `;
};
