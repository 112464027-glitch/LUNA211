// api/chat.js
const { GoogleGenerativeAI } = require("@google/generative-ai");

module.exports = async (req, res) => {
  // 增加 CORS 頭部
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const { prompt, history, dbContext } = req.body;
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  try {
    // 【關鍵修正】強制使用正確的模型路徑
    // 很多時候 404 是因為沒有寫 "models/" 或是寫錯了
    const model = genAI.getGenerativeModel({ 
      model: "models/gemini-1.5-flash" 
    });

    // 系統指令：確保翻譯格式
    const systemInstruction = "你是一位醫療助理 Luna。請先用繁體中文回答，然後輸入 '---'，最後提供對應的印尼文翻譯。";

    const chat = model.startChat({
      history: (history || []).map(h => ({
        role: h.role === "user" ? "user" : "model",
        parts: [{ text: h.content || h.text || "" }],
      })),
    });

    const finalPrompt = dbContext 
      ? `${systemInstruction}\n\n參考資料：\n${dbContext}\n\n問題：${prompt}` 
      : `${systemInstruction}\n\n問題：${prompt}`;

    const result = await chat.sendMessage(finalPrompt);
    const response = await result.response;
    
    res.status(200).json({ reply: response.text() });
  } catch (error) {
    console.error("Gemini Error:", error);
    // 回傳詳細錯誤，幫我們 debug
    res.status(500).json({ error: `Luna 暫時無法回應: ${error.message}` });
  }
};
