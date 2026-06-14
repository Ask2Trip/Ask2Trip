module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { destination, depart, dateDebut, dateFin, budget, voyageurs, interets } = req.body;

  if (!destination || !dateDebut || !dateFin || !budget) {
    return res.status(400).json({ error: 'Champs manquants' });
  }

  const dateDebutObj = new Date(dateDebut);
  const dateFinObj = new Date(dateFin);
  const nbJours = Math.round((dateFinObj - dateDebutObj) / 86400000);
  const budgetParPersonne = Math.round(parseInt(budget) / parseInt(voyageurs || 1));

  const formatDate = (d) => d.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  const prompt = `Tu es un expert en planification de voyages avec 20 ans d'expérience. Crée un plan de voyage COMPLET, DÉTAILLÉ et PERSONNALISÉ.

DONNÉES DU VOYAGE :
- Destination : ${destination}
- Ville de départ : ${depart || 'France'}
- Date de départ : ${formatDate(dateDebutObj)}
- Date de retour : ${formatDate(dateFinObj)}
- Durée : ${nbJours} jours
- Nombre de voyageurs : ${voyageurs || 2}
- Budget TOTAL : ${budget}€ (soit ~${budgetParPersonne}€ par personne)
- Centres d'intérêt : ${(interets || []).join(', ') || 'culture, gastronomie'}

INSTRUCTIONS :
- Génère EXACTEMENT ${nbJours} jours dans l'itinéraire
- Propose des activités variées et authentiques, pas seulement les sites touristiques classiques
- Les horaires doivent être réalistes (3-4 activités max par jour)
- Adapte les recommandations au budget disponible
- Pour les hébergements, propose 3 options de gammes différentes
- Pour les restaurants, propose 5-6 adresses variées

Réponds UNIQUEMENT avec un JSON valide, sans texte avant ni après, sans balises markdown. Structure exacte :

{
  "resume": "Résumé engageant du voyage en 2-3 phrases",
  "conseils_pratiques": {
    "meilleure_periode": "Infos sur la météo à cette période",
    "meteo": "Températures et conditions attendues",
    "monnaie": "Devise locale et taux de change approximatif",
    "langue": "Langue(s) parlée(s) et mots utiles",
    "visa": "Informations visa pour les Français",
    "conseils": ["Conseil 1", "Conseil 2", "Conseil 3", "Conseil 4", "Conseil 5"]
  },
  "itineraire": [
    {
      "jour": 1,
      "date": "Lundi 1 janvier 2026",
      "titre": "Titre accrocheur de la journée",
      "activites": [
        {
          "heure": "09:00",
          "activite": "Nom de l'activité",
          "description": "Description détaillée et pratique (2-3 phrases)",
          "duree": "2h",
          "prix_estime": "15€/pers",
          "lien_booking": "https://www.getyourguide.fr/destination/activities/?partner_id=YOUR_PARTNER_ID"
        }
      ]
    }
  ],
  "hebergements": [
    {
      "nom": "Nom de l'hôtel",
      "type": "Hôtel",
      "etoiles": 3,
      "quartier": "Nom du quartier",
      "prix_nuit": "80-120€",
      "description": "Description attrayante",
      "points_forts": ["Avantage 1", "Avantage 2"]
    }
  ],
  "restaurants": [
    {
      "nom": "Nom du restaurant",
      "type": "Type de cuisine",
      "prix": "€€",
      "specialite": "Plat signature",
      "quartier": "Quartier",
      "description": "Pourquoi ce restaurant est incontournable"
    }
  ],
  "budget_estime": {
    "vols": "XXX€",
    "hebergement": "XXX€",
    "activites": "XXX€",
    "repas": "XXX€",
    "divers": "XXX€",
    "total_par_personne": "XXX€"
  }
}`;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192
        }
      })
    });

    if (!geminiRes.ok) {
      const errData = await geminiRes.json();
      throw new Error(errData.error?.message || `Gemini error ${geminiRes.status}`);
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData.candidates[0].content.parts[0].text.trim();

    const clean = rawText
      .replace(/^```json\n?/, '')
      .replace(/^```\n?/, '')
      .replace(/\n?```$/, '')
      .trim();

    const data = JSON.parse(clean);
    return res.status(200).json(data);

  } catch (err) {
    console.error('Erreur génération:', err.message);
    return res.status(500).json({ error: err.message || 'Erreur lors de la génération.' });
  }
};
