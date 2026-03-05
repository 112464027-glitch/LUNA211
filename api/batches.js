const { kv } = require('@vercel/kv');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const batches = await kv.get('luna_batches') || [];
      return res.status(200).json({ batches });
    }

    if (req.method === 'POST') {
      const { name, text } = req.body;
      if (!text) return res.status(400).json({ error: '缺少內容' });
      const batches = await kv.get('luna_batches') || [];
      const batch = { id: 'b_' + Date.now(), name: name || `資料 ${batches.length + 1}`, text, chars: text.length };
      batches.push(batch);
      await kv.set('luna_batches', batches);
      return res.status(200).json({ batches });
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      if (id === 'all') {
        await kv.set('luna_batches', []);
        return res.status(200).json({ batches: [] });
      }
      let batches = await kv.get('luna_batches') || [];
      batches = batches.filter(b => b.id !== id);
      await kv.set('luna_batches', batches);
      return res.status(200).json({ batches });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
