const { GoogleGenerativeAI } = require("@google/generative-ai");

module.exports = async (req, res) => {
  // 設定 CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { prompt, history, dbContext } = req.body;
  
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: "環境變數未設定" });
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  try {
    // 【關鍵修正】：加上 models/ 前綴，並移除過多的設定確保連線穩定
    const model = genAI.getGenerativeModel({ 
      model: "models/gemini-1.5-flash" 
    });

    const chat = model.startChat({
      history: (history || []).map(h => ({
        role: h.role === "user" ? "user" : "model",
        parts: [{ text: h.content || h.text }],
      })),
    });

    // 強化系統指令，確保輸出格式
    const systemPrompt = "你是一位醫療助理 Luna。請用中文回答後，加上 '---'，再提供印尼文翻譯。";
    const finalPrompt = `${systemPrompt}\n\n參考資料：${dbContext || "無"}\n\n使用者問題：${prompt}`;

    const result = await chat.sendMessage(finalPrompt);
    const response = await result.response;
    
    res.status(200).json({ reply: response.text() });
  } catch (error) {
    console.error("Gemini Error:", error);
    res.status(500).json({ error: `Gemini API 報錯: ${error.message}` });
  }
};
