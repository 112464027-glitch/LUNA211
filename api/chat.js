const { GoogleGenerativeAI } = require("@google/generative-ai");

module.exports = async (req, res) => {
  // 設定 CORS 頭，防止前端被擋
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "僅支援 POST 請求" });
  }

  const { prompt, history, dbContext } = req.body;
  
  // 🔍 檢查 1：API Key 是否存在
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: "後端環境變數 GEMINI_API_KEY 未設定" });
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  try {
    // 🔍 修正 2：使用更保險的模型路徑格式
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash", 
      systemInstruction: "你是一位名為 Luna 的健康助理。請用『中文』回答後加上『---』再提供『印尼文』翻譯。"
    });

    const chat = model.startChat({
      history: (history || []).map(h => ({
        role: h.role === "user" ? "user" : "model",
        parts: [{ text: h.content || h.text }],
      })),
    });

    const finalPrompt = dbContext ? `資料庫：${dbContext}\n\n問題：${prompt}` : prompt;
    const result = await chat.sendMessage(finalPrompt);
    const response = await result.response;
    
    res.status(200).json({ reply: response.text() });

  } catch (error) {
    console.error("Gemini 錯誤詳情:", error);
    // 🔍 修正 3：回傳真正的錯誤訊息給前端
    res.status(500).json({ error: `Gemini API 報錯: ${error.message}` });
  }
};
