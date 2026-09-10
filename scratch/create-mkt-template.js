const https = require('https');
require('dotenv').config({ path: 'c:/Projects/Ewa Derma Clinic/backend/.env' });

const token = process.env.WHATSAPP_ACCESS_TOKEN;
const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
const version = process.env.WHATSAPP_API_VERSION || 'v21.0';

const templatePayload = {
  name: "ewa_patient_welcome",
  category: "MARKETING",
  language: "en_US",
  components: [
    {
      type: "BODY",
      text: "Welcome to Ewa Derma Clinic, {{1}}! Your registration is confirmed. Patient ID: {{2}}. For appointments, call +91 9120854977.",
      example: {
        body_text: [
          ["Rahul Sharma", "P-1001"]
        ]
      }
    }
  ]
};

const data = JSON.stringify(templatePayload);

const options = {
  hostname: 'graph.facebook.com',
  path: `/${version}/${wabaId}/message_templates`,
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  let resData = '';
  res.on('data', (chunk) => resData += chunk);
  res.on('end', () => {
    console.log('--- Marketing Template Response (Status: ' + res.statusCode + ') ---');
    console.log(resData);
  });
});

req.on('error', (e) => console.error('Error:', e));
req.write(data);
req.end();
