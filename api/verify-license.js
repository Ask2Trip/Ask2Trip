module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ valid: false, error: 'Method not allowed' });

  try {
    const { license_key } = req.body || {};
    if (!license_key) return res.status(200).json({ valid: false, error: 'Clé manquante' });

    const apiKey = process.env.LEMONSQUEEZY_API_KEY;
    if (!apiKey) return res.status(200).json({ valid: false, error: 'Produit non configuré (contacter le support)' });

    const lsRes = await fetch('https://api.lemonsqueezy.com/v1/licenses/validate', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${apiKey}`
      },
      body: new URLSearchParams({ license_key: license_key.trim() }).toString()
    });

    const text = await lsRes.text();
    let data;
    try { data = JSON.parse(text); } catch (e) {
      return res.status(200).json({ valid: false, error: '[Parse error] ' + text.slice(0, 150) });
    }

    if (data.valid) {
      return res.status(200).json({ valid: true });
    } else {
      return res.status(200).json({ valid: false, error: data.error || 'Clé invalide' });
    }
  } catch (err) {
    console.error('License verify error:', err.message);
    return res.status(200).json({ valid: false, error: 'Erreur serveur : ' + err.message });
  }
};
