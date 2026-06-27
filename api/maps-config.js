module.exports = async function handler(req, res) {
  // Restreindre aux origines autorisées uniquement
  const allowed = ['https://ask2trip.fr', 'https://www.ask2trip.fr', 'https://ask2trip.vercel.app'];
  const origin = req.headers['origin'] || req.headers['referer'] || '';
  const isAllowed = allowed.some(o => origin.startsWith(o));

  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Origin', isAllowed ? (req.headers['origin'] || '*') : 'https://www.ask2trip.fr');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Bloquer les requêtes qui ne viennent pas du site
  if (!isAllowed) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const key = process.env.GOOGLE_MAPS_JS_KEY || process.env.GOOGLE_PLACES_API_KEY || '';
  return res.status(200).json({ key });
};
