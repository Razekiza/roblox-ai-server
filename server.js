const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

const app = express();
const cors = require('cors');
app.use(cors());
const port = process.env.PORT || 3000;
app.use(express.json());
app.use(express.static('public'));

const audioDir = path.join(__dirname, 'public/audio');
if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });

app.post('/chat', async (req, res) => {
  const userMessage = req.body.message;

  try {
    // 1. Appel OpenAI ChatGPT
    const chatResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: userMessage }],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    const reply = chatResponse.data.choices[0].message.content;

    // 2. Génération audio (Text to Speech)
    const ttsResponse = await axios.post(
      'https://api.openai.com/v1/audio/speech',
      {
        model: 'tts-1',
        input: reply,
        voice: 'nova',
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        responseType: 'arraybuffer',
      }
    );

    const filename = `response_${Date.now()}.mp3`;
    const filepath = path.join(audioDir, filename);
    fs.writeFileSync(filepath, ttsResponse.data);

    res.json({
      reply: reply,
      audioUrl: `/audio/${filename}`,
    });
  } catch (err) {
    console.error('Erreur:', err.response?.data || err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.listen(port, () => {
  console.log(`✅ Serveur lancé sur http://localhost:${port}`);
});
