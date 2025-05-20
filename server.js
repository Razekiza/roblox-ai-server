require("dotenv").config(); // <-- à mettre en tout premier

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // <-- on prend la clé depuis .env
});

console.log(process.env.OPENAI_API_KEY);

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Exemple de route :
app.post('/chat', async (req, res) => {
  try {
    const userMessage = req.body.message;

    const chatCompletion = await openai.chat.completions.create({
      messages: [{ role: 'user', content: userMessage }],
      model: 'gpt-3.5-turbo',
    });

    res.json({ response: chatCompletion.choices[0].message.content });
  } catch (err) {
    console.error('Erreur:', err);
    res.status(500).json({ error: 'Erreur interne' });
  }
});

app.listen(3000, () => {
  console.log('Serveur lancé sur le port 3000');
});