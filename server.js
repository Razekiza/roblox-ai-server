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
  const userMessage = req.body.message;
  if (!userMessage) return res.status(400).send({ error: 'Message manquant.' });

  try {
    // 1. Génération de la réponse avec OpenAI Chat Completion
    const chatRes = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: userMessage }],
      },
      { headers: { Authorization: `Bearer ${OPENAI_KEY}` } }
    );

    const reply = chatRes.data.choices[0].message.content;

    // 2. Génération du TTS (mp3)
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

    // Sauvegarde locale du fichier mp3
    const filename = `response_${Date.now()}_${uuidv4()}.mp3`;
    const filePath = path.resolve(__dirname, 'audios', filename);
    fs.writeFileSync(filePath, Buffer.from(ttsRes.data));

    // 3. Upload vers Roblox via form-data
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath), {
      filename: filename,
      contentType: 'audio/mpeg',
    });

    const uploadRes = await axios.post(
      'https://apis.roblox.com/assets/v1/assets/upload',
      form,
      {
        headers: {
          ...form.getHeaders(),
          'x-api-key': ROBLOX_API_KEY,
          'Roblox-Asset-Name': filename,
          'Roblox-Asset-Type': 'Audio',
          'Roblox-Group-Id': ROBLOX_GROUP_ID,
          'Roblox-Target-Id': ROBLOX_UNIVERSE_ID,
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );

    const assetId = uploadRes.data.assetId;

    // Supprime le fichier local après upload (optionnel)
    fs.unlinkSync(filePath);

    // Envoi de la réponse au client Roblox
    res.json({ reply, assetId });
  } catch (err) {
    console.error('Erreur serveur :', err.response?.data || err.message);
    res.status(500).send({ error: 'Erreur serveur', detail: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Serveur en ligne sur le port ${PORT}`);
});
