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

IMPORTANT TRANSPORT : Analyse si la ville de départ (${depart || 'France'}) a un aéroport proche. Si la ville de départ n'a pas d'aéroport direct, indique l'aéroport le plus proche et calcule le trajet voiture (distance km, durée, estimation carburant en € et péages en €). Fais de même pour la destination si elle n'a pas d'aéroport.

INSTRUCTIONS :
- Génère EXACTEMENT ${nbJours} jours dans l'itinéraire
- Propose des activités variées et authentiques, pas seulement les sites touristiques classiques
- Les horaires doivent être réalistes (3-4 activités max par jour)
- Adapte les recommandations au budget disponible
- Pour les hébergements, propose EXACTEMENT 3 options : assigne "budget" au moins cher, "rapport" au meilleur rapport qualité/prix, "coup_de_coeur" au plus agréable/luxueux
- Pour les restaurants, propose 5-6 adresses VARIÉES (pas de chaînes, pas de fast-food, que des établissements locaux et authentiques bien notés) : assigne "chef" UNIQUEMENT à un restaurant gastronomique ou très bien noté par les locaux (jamais une chaîne, jamais un fast-food), "rapport" au meilleur rapport qualité/prix parmi les adresses locales, null pour les autres

Réponds UNIQUEMENT avec un JSON valide, sans texte avant ni après, sans balises markdown. Structure exacte :

{
  "resume": "Résumé engageant du voyage en 2-3 phrases",
  "conseils_pratiques": {
    "meilleure_periode": "Infos sur la météo à cette période",
    "meteo": "Températures et conditions attendues",
    "monnaie": "Devise locale et taux de change approximatif",
    "langue": "Langue(s) parlée(s) et mots utiles",
    "visa": "Informations visa pour les Français",
    "conseils": ["Conseil essentiel 1", "Conseil essentiel 2", "Conseil essentiel 3"]
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
      "photo_query": "2-3 mots anglais décrivant l'hôtel ex: luxury hotel room",
      "badge": "budget",
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
      "description": "Pourquoi ce restaurant est incontournable (2 phrases max)",
      "photo_query": "2-3 mots anglais décrivant le plat ou la cuisine ex: sushi japanese food",
      "badge": null
    }
  ],
  "transport": {
    "depart_has_airport": true,
    "depart_airport": "Nom et code IATA de l'aéroport de départ ou le plus proche",
    "depart_drive_km": null,
    "depart_drive_duration": null,
    "depart_fuel_estimate": null,
    "depart_tolls_estimate": null,
    "destination_has_airport": true,
    "destination_airport": "Nom et code IATA de l'aéroport d'arrivée ou le plus proche",
    "destination_drive_km": null,
    "destination_drive_duration": null,
    "destination_fuel_estimate": null,
    "destination_tolls_estimate": null,
    "flight_duration": "Durée estimée du vol",
    "iata_from": "code IATA aéroport départ ex CDG",
    "iata_to": "code IATA aéroport arrivée ex FCO"
  },
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
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 65536
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

    // Photos : Google Places (précis) avec fallback Pixabay (stock)
    const placesKey = process.env.GOOGLE_PLACES_API_KEY;
    const pixabayKey = process.env.PIXABAY_API_KEY;

    const getPlacesPhoto = async (name, city) => {
      if (!placesKey) return null;
      try {
        const searchRes = await fetch('https://places.googleapis.com/v1/places:searchText', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': placesKey,
            'X-Goog-FieldMask': 'places.photos'
          },
          body: JSON.stringify({ textQuery: `${name} ${city}`, languageCode: 'fr' })
        });
        const sd = await searchRes.json();
        const photoName = sd.places?.[0]?.photos?.[0]?.name;
        if (!photoName) return null;
        return `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=400&key=${placesKey}`;
      } catch { return null; }
    };

    const getPixabayPhoto = async (query, category) => {
      if (!pixabayKey) return null;
      try {
        const q = encodeURIComponent(query || 'travel');
        const cat = category ? `&category=${category}` : '';
        // per_page=5 + pick first to have more chances of a relevant result
        const r = await fetch(`https://pixabay.com/api/?key=${pixabayKey}&q=${q}&image_type=photo&per_page=5&safesearch=true&orientation=horizontal&min_width=400${cat}`);
        const j = await r.json();
        return j.hits?.[0]?.webformatURL || null;
      } catch { return null; }
    };

    const getPhoto = async (name, city, fallbackQuery, category) => {
      const placesUrl = await getPlacesPhoto(name, city);
      if (placesUrl) return placesUrl;
      return getPixabayPhoto(fallbackQuery, category);
    };

    const [restoPhotos, hotelPhotos] = await Promise.all([
      // category=food force Pixabay à chercher dans les photos de nourriture uniquement
      Promise.all((data.restaurants || []).map(r => getPhoto(r.nom, destination, r.photo_query || r.type + ' food dish', 'food'))),
      // category=travel pour les hôtels
      Promise.all((data.hebergements || []).map(h => getPhoto(h.nom, destination, h.photo_query || 'hotel room interior', 'travel')))
    ]);

    if (data.restaurants) data.restaurants = data.restaurants.map((r, i) => ({ ...r, photo_url: restoPhotos[i] }));
    if (data.hebergements) data.hebergements = data.hebergements.map((h, i) => ({ ...h, photo_url: hotelPhotos[i] }));

    return res.status(200).json(data);

  } catch (err) {
    console.error('Erreur génération:', err.message);
    return res.status(500).json({ error: err.message || 'Erreur lors de la génération.' });
  }
};
