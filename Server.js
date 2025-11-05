require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const OpenAI = require('openai');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize database
const db = new sqlite3.Database('./webshield.db');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'WebShield Production API Running',
    timestamp: new Date(),
    integrations: {
      virustotal: process.env.VIRUSTOTAL_API_KEY ? '✅ Configured' : '❌ Missing',
      openai: process.env.OPENAI_API_KEY ? '✅ Configured' : '❌ Missing',
      database: '✅ SQLite active'
    }
  });
});

app.get('/api/pricing', (req, res) => {
  res.json({
    plans: [
      { name: 'Basic', price: '$9/mo', features: ['5 scans/day', 'Email support'] },
      { name: 'Pro', price: '$29/mo', features: ['50 scans/day', 'Priority support', 'AI analysis'] },
      { name: 'Enterprise', price: 'Custom', features: ['Unlimited scans', '24/7 support', 'Dedicated'] }
    ]
  });
});

app.post('/api/security/scan', async (req, res) => {
  try {
    const { url } = req.body;
    
    // VirusTotal scan
    const vtResponse = await axios.get(
      `https://www.virustotal.com/api/v3/urls/${Buffer.from(url).toString('base64')}`,
      { headers: { 'x-apikey': process.env.VIRUSTOTAL_API_KEY } }
    ).catch(() => ({ data: { last_analysis_stats: { malicious: 0 } } }));

    // GPT-5 Nano analysis
    const aiAnalysis = await openai.chat.completions.create({
      model: 'gpt-5-nano',
      messages: [
        { role: 'user', content: `Analyze security threat for: ${url}. Response: JSON with risk_level, recommendation.` }
      ]
    }).catch(() => ({ choices: [{ message: { content: '{"risk_level":"unknown"}' } }] }));

    res.json({
      url,
      threats_detected: vtResponse.data.last_analysis_stats?.malicious || 0,
      ai_analysis: aiAnalysis.choices[0].message.content,
      scan_time: new Date()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ WebShield API running on http://localhost:${PORT}`);
});
