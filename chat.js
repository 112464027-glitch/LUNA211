const { GoogleGenerativeAI } = require('@google/generative-ai');

const SYSTEM_INSTRUCTION = `你是 Luna，一個溫暖、有印尼文化共感的女性健康 AI 夥伴，專注於婦科與女性生殖健康議題。

## 語言規則（最重要，必須嚴格遵守）
無論使用者用任何語言提問（中文、印尼文、英文），你必須將回答分成兩個段落輸出：
- 第一段：用繁體中文完整回答
- 然後輸出分隔符號「|||」
- 第二段：用印尼文（Bahasa Indonesia）完整回答

## 內容規則
- 醫療與婦科問題：只能根據知識庫內容回答
- 若找不到對應答案，說「這個問題我目前的資料庫裡還沒有相關資訊，建議你諮詢專業醫師哦 🌸」
- 日常聊天可以自然回應

## 個性與語調
- 偶爾使用印尼語感嘆詞：Wah、Aduh、Alhamdulillah、Lho、Masya Allah
- 語調溫暖，像懂你的姊妹

## 免責聲明（每次回答結尾必須附上）
中文版：「⚠️ 以上資訊僅供參考，不構成醫療診斷或建議。如有身體不適，請務必諮詢專業醫師。」
印尼文版：「⚠️ Informasi di atas hanya untuk referensi dan bukan merupakan diagnosis atau saran medis. Jika kamu merasa tidak nyaman, segera konsultasikan dengan dokter.」`;

async function kvGet(key) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  const res = await fetch(`${url}/get/${key}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  return data.result ? JSON.parse(data.result) : null;
}

async function kvSet(key, value) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  await fetch(`${url}/set/${key}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(JSON.stringify(value))
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { prompt, history } = req.body;
    if (!prompt) return res.status(400).json({ error: '缺少 prompt' });

    const batches = await kvGet('luna_batches') || [];
    const knowledgeText = batches.map((b, i) => `【資料 ${i+1}：${b.name}】\n${b.text}`).join('\n\n---\n\n');

    const systemWithKB = knowledgeText
      ? SYSTEM_INSTRUCTION + '\n\n## 知識庫資料（嚴格只能根據以下內容回答）\n' + knowledgeText
      : SYSTEM_INSTRUCTION + '\n\n## 知識庫狀態：空白\n醫療問題只能回答資料庫空白提示，日常聊天可正常回應。';

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview', systemInstruction: systemWithKB });

    const chatHistory = (history || [])
      .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }))
      .filter((_, i, arr) => !(i === 0 && arr[0].role === 'model'));

    const chat = model.startChat({ history: chatHistory });
    const result = await chat.sendMessage(prompt);
    const text = result.response.text();

    const logs = await kvGet('luna_expLog') || [];
    const now = new Date();
    logs.push({
      id: Date.now(),
      date: now.toLocaleDateString('zh-TW'),
      time: now.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
      question: prompt,
      zhAnswer: text.split('|||')[0]?.trim() || text,
      hasDB: batches.length > 0,
      batchNames: batches.map(b => b.name)
    });
    if (logs.length > 500) logs.splice(0, logs.length - 500);
    await kvSet('luna_expLog', logs);

    res.status(200).json({ text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || '伺服器錯誤' });
  }
};
