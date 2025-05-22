require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const ROBLOX_API_KEY = process.env.ROBLOX_API_KEY;
const ROBLOX_UNIVERSE_ID = process.env.UNIVERSE_ID;
const ROBLOX_GROUP_ID = process.env.GROUP_ID;

const AUDIO_DIR = path.join(__dirname, 'audios');

// Assure que le dossier audio existe
if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR);
}

app.post('/chat', async (req, res) => {
  try {
    const userMessage = req.body.message;
    if (!userMessage) return res.status(400).send({ error: 'Message manquant.' });

    // 1. Chat avec OpenAI GPT-3.5 Turbo
    const chatRes = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: userMessage }],
      },
      { headers: { Authorization: `Bearer ${OPENAI_KEY}` } }
    );

    const reply = chatRes.data.choices[0].message.content;

    // 2. Génération audio via OpenAI TTS
    const ttsRes = await axios.post(
      'https://api.openai.com/v1/audio/speech',
      {
        model: 'tts-1',
        voice: 'alloy', // tu peux changer la voix
        input: reply,
        response_format: 'mp3',
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_KEY}`,
          'Content-Type': 'application/json',
        },
        responseType: 'arraybuffer',
      }
    );

    // 3. Sauvegarde locale du fichier mp3
    const filename = `response_${Date.now()}.mp3`;
    const filePath = path.join(AUDIO_DIR, filename);
    fs.writeFileSync(filePath, Buffer.from(ttsRes.data));

    // 4. Upload sur Roblox Open Cloud
    // Important : Roblox attend un flux de fichier via multipart/form-data,
    // donc on utilise 'form-data' package pour ça.
    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));
    form.append('assetType', 'Audio');
    form.append('name', filename);
    form.append('groupId', ROBLOX_GROUP_ID);
    form.append('universeId', ROBLOX_UNIVERSE_ID);

    const uploadRes = await axios.post(
      `https://apis.roblox.com/assets/v1/assets/upload`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          'x-api-key': ROBLOX_API_KEY,
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      }
    );

    // Supprime le fichier local après upload
    fs.unlinkSync(filePath);

    const assetId = uploadRes.data.assetId;
    return res.json({ reply, assetId });
  } catch (error) {
    console.error('Erreur serveur :', error.response?.data || error.message);
    return res.status(500).json({ error: 'Erreur serveur', detail: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Serveur en ligne sur le port ${PORT}`);
});