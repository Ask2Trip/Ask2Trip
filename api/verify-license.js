module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ valid: false });

  const { license_key } = req.body;
  if (!license_key) return res.status(400).json({ valid: false, error: 'Clé manquante' });

  const permalink = process.env.GUMROAD_PRODUCT_PERMALINK;
  if (!permalink) return res.status(500).json({ valid: false, error: 'Produit non configuré' });

  try {
    const gumRes = await fetch('https://api.gumroad.com/v2/licenses/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ product_permalink: permalink, license_key }).toString()
    });
    const data = await gumRes.json();

    if (data.success) {
      return res.status(200).json({ valid: true });
    } else {
      return res.status(200).json({ valid: false, error: data.message || 'Clé invalide' });
    }
  } catch (err) {
    console.error('License verify error:', err.message);
    return res.status(500).json({ valid: false, error: 'Erreur de vérification' });
  }
};
