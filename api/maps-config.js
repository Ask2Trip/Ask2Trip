module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  // On réutilise la même clé Google (Places + Maps JS API activés sur la même clé)
  const key = process.env.GOOGLE_MAPS_JS_KEY || process.env.GOOGLE_PLACES_API_KEY || '';
  return res.status(200).json({ key });
};
