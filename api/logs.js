const { kv } = require('@vercel/kv');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const logs = await kv.get('luna_expLog') || [];
      return res.status(200).json({ logs });
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      if (id === 'all') {
        await kv.set('luna_expLog', []);
        return res.status(200).json({ logs: [] });
      }
      let logs = await kv.get('luna_expLog') || [];
      logs = logs.filter(e => String(e.id) !== String(id));
      await kv.set('luna_expLog', logs);
      return res.status(200).json({ logs });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
