import bodyParser from 'body-parser';
import express from 'express';
import morgan from 'morgan';
import dotenv from 'dotenv';
import axios from 'axios';
import chalk from 'chalk';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
app.use(bodyParser.urlencoded({extended: false}));

// M-Pesa Express API endpoints
const darajaUrl = process.env.DARAJA_CREDENTIAL_URL;
const ConsumerKey = process.env.DARAJA_CONSUMER_KEY;
const ConsumerSecret =process.env.DARAJA_CONSUMER_SECRET;
const BusinessShortCode = process.env.DARAJA_BUSINESS_SHORT_CODE;
const Passkey = process.env.DARAJA_PASSKEY;
const CallbackUrl = process.env.DARAJA_CALLBACK_URL;

// PayPal API endpoints
const paypalUrl = process.env.PAYPAL_URL;
const paypalClientId = process.env.PAYPAL_CLIENT_ID;
const paypalSecret = process.env.PAYPAL_SECRET;

// Middleware
app.use(express.json());
app.use(morgan('tiny'));

// Routes
app.get('/', (req, res) => {
  res.send('lost sheep');
});

// M-Pesa Express payment route
app.post('/mpesa', async (req, res) => {
  try {

     // Get access token
     const auth = await axios.get(darajaUrl, {
      auth: {
        username: ConsumerKey,
        password: ConsumerSecret,
      },
    });
    const accessToken = auth.data.access_token;
    // console.log(accessToken)
    
    // Generate M-Pesa Express request
    const data = {
      BusinessShortCode: BusinessShortCode,
      TransactionType: "CustomerPayBillOnline",
      Amount: req.body.amount,
      PartyA: req.body.phoneNumber,
      PartyB: BusinessShortCode,
      PhoneNumber: req.body.phoneNumber,
      CallBackURL: CallbackUrl,
      AccountReference: 'Safari',
      TransactionDesc:'Payment of safari services'
    };
    
    console.log(JSON.stringify(data));
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
    const password = new Buffer.from(`${BusinessShortCode}${Passkey}${timestamp}`).toString('base64');
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    };
    const response = await axios.post('https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest', {
      ...data,
      Password: password,
      Timestamp: timestamp,
    }, { headers });

    res.send(response.data);
  } catch (error) {
    console.log(chalk.red(error));
    res.status(500).send('[+] An error occurred while processing your request.');
  }
});

// PayPal payment route
app.post('/paypal', async (req, res) => {
  try {
    // Get access token
    const auth = await axios.post('https://api.sandbox.paypal.com/v1/oauth2/token', 'grant_type=client_credentials', {
      auth: {
        username: paypalClientId,
        password: paypalSecret,
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    const accessToken = auth.data.access_token;

   // Create PayPal order
const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${accessToken}`,
};
const response = await axios.post(paypalUrl, {
  intent: 'CAPTURE',
  purchase_units: [{
    amount: {
      currency_code: req.body.currencyCode,
      value: req.body.amount,
    },
  }],
}, { headers });

res.send(response.data);
} catch (error) {
  console.log(chalk.red(error));
  res.status(500).send(chalk.red('[-] An error occurred while processing your request.'));
  }
  });
  
  // Start server
  app.listen(port, () => {
  console.log(`[+] Server listening on port ${port}`);
  });