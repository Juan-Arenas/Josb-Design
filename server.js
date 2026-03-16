// ═══════════════════════════════════════════════════════════
//  JOSS DESIGN — Backend Izipay
//  Node.js + Express
//  Este servidor crea el formToken de Izipay de forma segura.
//
//  INSTALACIÓN:
//    npm install express cors node-fetch dotenv
//
//  USO:
//    node server.js
//
//  DEPLOY GRATUITO recomendado: Railway.app o Render.com
//    1. Sube este archivo a GitHub
//    2. Conecta Railway/Render con tu repo
//    3. Agrega las variables de entorno en el panel
//    4. Copia la URL que te dan y pégala en josb-design.html
//       en la variable BACKEND_URL
// ═══════════════════════════════════════════════════════════

require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const app = express();
app.use(express.json());
app.use(cors()); // Allow all origins. Restrict in production if needed.

// ── Izipay credentials (set these as environment variables) ──
const SHOP_ID   = process.env.IZIPAY_SHOP_ID   || '19131378';
const PASSWORD  = process.env.IZIPAY_PASSWORD  || 'prodpassword_4qOwaYvgLvrBWaqp1ny8qBX3so9mxQJBXBAxlWsGKvzP5';
const API_URL   = process.env.IZIPAY_API_URL   || 'https://api.micuentaweb.pe';

// ── Basic auth header for Izipay REST API ──
const authHeader = 'Basic ' + Buffer.from(SHOP_ID + ':' + PASSWORD).toString('base64');

// ─────────────────────────────────────────────────────────────
//  POST /create-payment
//  Body: { amount (in cents), currency, orderId, customer }
//  Returns: { formToken }
// ─────────────────────────────────────────────────────────────
app.post('/create-payment', async (req, res) => {
  const { amount, currency = 'PEN', orderId, customer } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  const payload = {
    amount,                      // amount in cents (e.g. 4900 = S/ 49.00)
    currency,                    // PEN for soles
    orderId,                     // your order reference
    customer: {
      email:     customer?.email     || '',
      firstName: customer?.firstName || '',
      lastName:  customer?.lastName  || '',
    },
    // Optional: set your return URLs for redirect flow
    // "ipnTargetUrl": "https://your-backend.com/ipn",
  };

  try {
    const response = await fetch(
      `${API_URL}/api-payment/V4/Charge/CreatePayment`,
      {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (data.status === 'SUCCESS' && data.answer?.formToken) {
      return res.json({ formToken: data.answer.formToken });
    } else {
      console.error('Izipay error:', JSON.stringify(data));
      return res.status(500).json({
        error:   'Izipay error',
        details: data.answer?.errorMessage || 'Unknown error',
      });
    }
  } catch (err) {
    console.error('Fetch error:', err);
    return res.status(500).json({ error: 'Network error', details: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
//  POST /ipn  (Instant Payment Notification — optional)
//  Izipay calls this URL after each transaction.
//  Configure it in Back Office → Reglas de notificaciones
// ─────────────────────────────────────────────────────────────
app.post('/ipn', (req, res) => {
  const payment = req.body;
  console.log('IPN received:', JSON.stringify(payment, null, 2));
  // Here you can auto-approve the order in your DB
  // by matching payment.orderDetails.orderId to your pending orders
  res.sendStatus(200);
});

// ─────────────────────────────────────────────────────────────
//  Health check
// ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'Joss Design — Izipay Backend' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Joss Design backend running on port ${PORT}`);
});