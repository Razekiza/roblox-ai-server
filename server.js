require('dotenv').config();
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;
app.use(express.json());

const audioDir = path.join(__dirname, 'public/audio');
if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });

app.post('/chat', async (req, res) => {
  const userMessage = req.body.message;
  if (!userMessage) return res.status(400).json({ error: 'Message manquant' });

  try {
    // 1. Appel OpenAI ChatGPT
    const chatResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: userMessage }],
      },
      { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` } }
    );

    const reply = chatResponse.data.choices[0].message.content;

    // 2. Génération TTS (exemple basique, à adapter selon la doc OpenAI)
    const ttsResponse = await axios.post(
      'https://api.openai.com/v1/audio/speech',
      {
        model: 'tts-1',
        input: reply,
        voice: 'alloy',
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
    fs.writeFileSync(filepath, Buffer.from(ttsResponse.data), 'binary');

    res.json({
      reply,
      audioUrl: `/audio/${filename}`, // URL relative, à compléter selon ta config
    });
  } catch (error) {
    console.error('Erreur serveur:', error.response?.data || error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.use('/audio', express.static(audioDir));

app.listen(port, () => {
  console.log(`Serveur lancé sur http://localhost:${port}`);
});
