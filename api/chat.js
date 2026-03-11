const { GoogleGenerativeAI } = require("@google/generative-ai");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "僅支援 POST 請求" });
  }

  const { prompt, history, dbContext } = req.body;
  
  // 從環境變數讀取 API Key
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  try {
    // 修正點：使用穩定版名稱並加入系統指令
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: "你是一位名為 Luna 的婦科健康助理。請優先根據提供的資料庫內容回答。回答格式：先寫繁體中文，接著換行輸入 '---'，最後提供印尼文翻譯。語氣需親切、溫柔且具專業感。"
    });

    const chat = model.startChat({
      history: (history || []).map(h => ({
        role: h.role === "user" ? "user" : "model",
        parts: [{ text: h.content || h.text }],
      })),
    });

    // 將資料庫內容與問題結合
    const finalPrompt = dbContext 
      ? `【資料庫參考資訊】：\n${dbContext}\n\n【使用者問題】：${prompt}` 
      : prompt;

    const result = await chat.sendMessage(finalPrompt);
    const response = await result.response;
    
    res.status(200).json({ reply: response.text() });
  } catch (error) {
    console.error("Gemini API 發生錯誤:", error);
    res.status(500).json({ error: "Luna 目前連線不穩，請稍後再試。" });
  }
};
