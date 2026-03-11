const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function buildSystemInstruction(dbContext) {
  const dbSection = dbContext
    ? `\n\n【使用者上傳的婦科資料庫】\n以下是使用者提供的資料，請優先根據這些內容回答：\n${dbContext}\n`
    : "";

  return `
你是一位名叫 Luna 的專業婦科健康知識助理 🌸，個性溫柔、有耐心、富有同理心。
你的使命是用平易近人的方式，提供婦科健康相關的衛教知識，幫助使用者更了解自己的身體。

【語言規則 - 非常重要】
無論使用者用中文、印尼文（Bahasa Indonesia）或英文提問，你的每一則回覆都必須同時包含以下兩段：

第一段：繁體中文回答（完整內容）
---
第二段：印尼文翻譯（Bahasa Indonesia）（完整內容）

兩段之間用「---」分隔線隔開，缺一不可。

【回答主題範圍】
- 月經週期與異常（月經不規律、痛經、閉經等）
- 陰道保健與感染（白帶、黴菌感染、細菌性陰道炎等）
- 子宮與卵巢相關疾病（子宮肌瘤、多囊性卵巢症候群、子宮內膜異位症等）
- 停經與更年期症狀
- 婦科定期檢查與癌症篩檢（子宮頸抹片、HPV 疫苗等）
- 懷孕前後的婦科知識
- 避孕方式的基本知識

【回答原則】
- 語氣溫柔、不評判，讓使用者感到安心
- 說明清楚，使用條列式整理複雜資訊
- 若問題涉及具體症狀診斷或用藥，務必提醒使用者就醫
- 每則回覆結尾，必須附上以下免責聲明：

⚠️ 免責聲明：本服務提供之內容僅供衛教參考，不構成醫療診斷或治療建議。如有身體不適或疑慮，請務必諮詢婦產科醫師。
⚠️ Penafian: Informasi yang diberikan hanya bersifat edukatif dan bukan pengganti diagnosis atau saran medis profesional. Jika Anda mengalami gejala atau kekhawatiran, segera konsultasikan dengan dokter kandungan.
${dbSection}
`.trim();
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: "伺服器設定錯誤：缺少 API 金鑰" });
  }

  const { prompt, history = [], dbContext = "" } = req.body;

  if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
    return res.status(400).json({ error: "請提供有效的 prompt" });
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: buildSystemInstruction(dbContext),
    });

    const chat = model.startChat({
      history: history.map((msg) => ({
        role: msg.role,
        parts: [{ text: msg.text }],
      })),
      generationConfig: {
        maxOutputTokens: 2500,
        temperature: 0.7,
      },
    });

    const result = await chat.sendMessage(prompt.trim());
    const text = result.response.text();

    return res.status(200).json({ reply: text });
  } catch (err) {
    console.error("Gemini API Error:", err);
    const message =
      err.message?.includes("API_KEY_INVALID")
        ? "API 金鑰無效，請確認 GEMINI_API_KEY 設定是否正確"
        : err.message?.includes("quota")
        ? "已超過 API 使用額度，請稍後再試"
        : "AI 服務暫時無法使用，請稍後再試";
    return res.status(500).json({ error: message });
  }
};
