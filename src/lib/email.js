import nodemailer from "nodemailer";

const resetPasswordTemplate = (resetUrl) => `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Password Reset</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #605dff;
        margin: 0;
        padding: 0;
      }
      .container {
        max-width: 600px;
        margin: 40px auto;
        padding: 30px;
        background-color: #ffffff;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }
      .header {
        text-align: center;
        padding-bottom: 20px;
      }
      .header h1 {
        color: #605dff;
        margin: 0;
      }
      .content {
        font-size: 16px;
        color: #333333;
        line-height: 1.6;
      }
      .button {
        display: inline-block;
        margin-top: 20px;
        padding: 12px 20px;
        background-color: #605dff;
        color: #ffffff;
        text-decoration: none;
        border-radius: 6px;
        font-weight: bold;
      }
      .footer {
        margin-top: 30px;
        font-size: 14px;
        color: #999999;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Bubbly</h1>
      </div>
      <div class="content">
        <p>Hi there,</p>
        <p>We received a request to reset your password for your Bubbly account.</p>
        <p>Click the button below to set a new password. This link is valid for 10 minutes:</p>
        <p style="text-align: center;">
          <a class="button" href="${resetUrl}" target="_blank">Reset Password</a>
        </p>
        <p>If you didn’t request this, you can safely ignore this email.</p>
        <p>Thanks,<br/>The Bubbly Team</p>
      </div>
 
    </div>
  </body>
</html>
`;

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    //   secure: false, // true for port 465
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const emailOptions = {
    from: '"Bubbly Chat" <no-reply@bubbly-chat.cc>',
    to: options.email,
    subject: options.subject,
    html: resetPasswordTemplate(options.resetUrl),
  };

  await transporter.sendMail(emailOptions);
};

export { sendEmail };
