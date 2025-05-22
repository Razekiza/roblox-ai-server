require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const ROBLOX_API_KEY = process.env.ROBLOX_API_KEY;
const ROBLOX_UNIVERSE_ID = process.env.UNIVERSE_ID;
const ROBLOX_GROUP_ID = process.env.GROUP_ID;

app.post('/chat', async (req, res) => {
  const userMessage = req.body.message;
  if (!userMessage) return res.status(400).send({ error: 'Message manquant.' });

  try {
    // 1. Génération réponse via OpenAI
    const chatRes = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: userMessage }],
      },
      { headers: { Authorization: `Bearer ${OPENAI_KEY}` } }
    );

    const reply = chatRes.data.choices[0].message.content;

    // 2. TTS OpenAI
    const ttsRes = await axios.post(
      'https://api.openai.com/v1/audio/speech',
      {
        model: 'tts-1',
        voice: 'nova',
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

    // Assure que le dossier audios existe
    const audiosDir = path.resolve('./audios');
    if (!fs.existsSync(audiosDir)) {
      fs.mkdirSync(audiosDir);
    }

    const filename = `response_${Date.now()}.mp3`;
    const filePath = path.join(audiosDir, filename);

    fs.writeFileSync(filePath, Buffer.from(ttsRes.data));

    // 3. Upload sur Roblox (avec form-data)
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath), {
      filename: filename,
      contentType: 'audio/mpeg',
    });
    form.append('assetType', 'Audio');
    form.append('groupId', ROBLOX_GROUP_ID);
    form.append('targetId', ROBLOX_UNIVERSE_ID);
    form.append('name', filename);

    const uploadRes = await axios.post(
      'https://apis.roblox.com/assets/v1/assets/upload',
      form,
      {
        headers: {
          ...form.getHeaders(),
          'x-api-key': ROBLOX_API_KEY,
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );

    const assetId = uploadRes.data.assetId;

    // Optionnel : supprime le fichier local pour éviter l'accumulation
    fs.unlinkSync(filePath);

    // Répond avec le texte + assetId
    res.json({ reply, assetId });
  } catch (err) {
    console.error('Erreur serveur :', err.response?.data || err.message);
    res.status(500).send({ error: 'Erreur serveur', detail: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Serveur en ligne sur le port ${PORT}`);
});