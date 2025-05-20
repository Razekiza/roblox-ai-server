const express = require("express");
const cors = require("cors");
const { OpenAI } = require("openai");

const app = express();
const PORT = process.env.PORT || 3000;

// 🔐 Ta clé OpenAI ici (ou mieux : utilise une variable d'environnement)
const openai = new OpenAI({
  apiKey: "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"
});

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Serveur IA prêt !");
});

app.post("/chat", async (req, res) => {
  const userMessage = req.body.message;
  console.log("Message reçu :", userMessage);

  try {
    const chatCompletion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // tu peux utiliser gpt-4 si tu as accès
      messages: [
        { role: "system", content: "Tu es un compagnon amical dans un jeu Roblox. Sois utile et immersif." },
        { role: "user", content: userMessage }
      ]
    });

    const reply = chatCompletion.choices[0].message.content;
    res.json({ reply });
  } catch (error) {
    console.error("Erreur OpenAI :", error);
    res.status(500).json({ reply: "Désolé, une erreur est survenue." });
  }
});

app.listen(PORT, () => {
  console.log(`Serveur lancé sur le port ${PORT}`);
});
