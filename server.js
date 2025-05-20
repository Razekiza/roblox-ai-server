const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.post('/chat', (req, res) => {
  const userMessage = req.body.message;
  console.log('Message reçu :', userMessage);
  res.json({ reply: `Tu as dit : ${userMessage}` });
});

app.get('/', (req, res) => {
  res.send("Serveur en ligne !");
});

app.listen(port, () => {
  console.log(`Serveur démarré sur le port ${port}`);
});