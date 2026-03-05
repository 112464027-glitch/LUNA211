async function kvGet(key) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  try {
    const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const text = await res.text();
    const data = JSON.parse(text);
    if (!data.result) return [];
    let parsed = data.result;
    if (typeof parsed === 'string') try { parsed = JSON.parse(parsed); } catch(e) { return []; }
    if (typeof parsed === 'string') try { parsed = JSON.parse(parsed); } catch(e) { return []; }
    return Array.isArray(parsed) ? parsed : [];
  } catch(e) {
    console.error('kvGet error:', e.message);
    return [];
  }
}

async function kvSet(key, value) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  await fetch(`${url}/set/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(JSON.stringify(value))
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const logs = await kvGet('luna_expLog');
      return res.status(200).json({ logs });
    }
    if (req.method === 'DELETE') {
      const { id } = req.body;
      let logs = id === 'all' ? [] : (await kvGet('luna_expLog')).filter(e => String(e.id) !== String(id));
      await kvSet('luna_expLog', logs);
      return res.status(200).json({ logs });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('logs error:', err);
    res.status(500).json({ error: err.message });
  }
};
