const otpTemplate = (otp) => {
	return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>OTP Verification - Connektx</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #f4f6f8;
      margin: 0;
      padding: 0;
    }
    .container {
      background-color: #ffffff;
      max-width: 600px;
      margin: 50px auto;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      text-align: center;
    }
    .header {
      font-size: 28px;
      color: #333333;
      margin-bottom: 10px;
    }
    .sub-header {
      font-size: 20px;
      color: #555555;
      margin-bottom: 20px;
    }
    .otp-code {
      font-size: 32px;
      font-weight: bold;
      color: #2d89ef;
      margin: 20px 0;
    }
    .note {
      font-size: 14px;
      color: #999999;
      margin-top: 20px;
    }
    .footer {
      font-size: 12px;
      color: #bbbbbb;
      margin-top: 40px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">Welcome to Connektx</div>
    <div class="sub-header">Your One-Time Password (OTP)</div>
    <div class="otp-code">${otp}</div>
    <p>Please do not share this OTP with anyone.</p>
    <div class="note">
      This OTP is valid for a limited time. If you did not request this, please ignore this email.
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} Connektx. All rights reserved.
    </div>
  </div>
</body>
</html>
`;
};
module.exports = otpTemplate;