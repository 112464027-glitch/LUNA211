async function kvGet(key) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  const res = await fetch(`${url}/get/${key}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  if (!data.result) return null;
  try {
    return typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
  } catch(e) {
    return null;
  }
}

async function kvSet(key, value) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  const serialized = JSON.stringify(value);
  await fetch(`${url}/set/${key}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([key, serialized])
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const batches = await kvGet('luna_batches') || [];
      return res.status(200).json({ batches });
    }
    if (req.method === 'POST') {
      const { name, text } = req.body;
      if (!text) return res.status(400).json({ error: '缺少內容' });
      const batches = await kvGet('luna_batches') || [];
      batches.push({ id: 'b_' + Date.now(), name: name || `資料 ${batches.length + 1}`, text, chars: text.length });
      await kvSet('luna_batches', batches);
      return res.status(200).json({ batches });
    }
    if (req.method === 'DELETE') {
      const { id } = req.body;
      let batches = id === 'all' ? [] : (await kvGet('luna_batches') || []).filter(b => b.id !== id);
      await kvSet('luna_batches', batches);
      return res.status(200).json({ batches });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
