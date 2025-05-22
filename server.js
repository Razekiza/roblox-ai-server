require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const FormData = require('form-data');

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const ROBLOX_API_KEY = process.env.ROBLOX_API_KEY;
const ROBLOX_UNIVERSE_ID = process.env.UNIVERSE_ID;
const ROBLOX_GROUP_ID = process.env.GROUP_ID;

if (!fs.existsSync('./audios')) {
  fs.mkdirSync('./audios');
}

app.post('/chat', async (req, res) => {
  try {
    if (!req.body.message) {
      return res.status(400).json({ error: 'Message manquant.' });
    }
    const userMessage = req.body.message;
    console.log('[Requête] Message reçu :', userMessage);

    // Appel OpenAI Chat completion
    const chatRes = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: userMessage }],
      },
      {
        headers: { Authorization: `Bearer ${OPENAI_KEY}` },
      }
    );

    const reply = chatRes.data.choices[0].message.content;
    console.log('[OpenAI] Réponse texte :', reply);

    // Répond juste avec le texte, sans TTS ni upload Roblox
    res.json({ reply, assetId: null });

  } catch (err) {
    console.error('[Erreur serveur]', err.response?.data || err.message || err);
    res.status(500).json({ error: 'Erreur serveur', detail: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Serveur en ligne sur le port ${PORT}`);
});
