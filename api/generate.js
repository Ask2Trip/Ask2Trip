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

IMPORTANT TRANSPORT : Analyse le trajet entre ${depart || 'France'} et ${destination} et détermine pour CHAQUE mode (avion, train, voiture) s'il est pertinent (pertinent: true/false) :
- Pour un trajet DOMESTIQUE ou court (même pays, ou pays voisins bien connectés, ex: Grenoble → Disneyland Paris, Lyon → Barcelone) : l'avion est RAREMENT pertinent (mets pertinent=false avec la raison, sauf si la distance est vraiment grande comme un trajet transcontinental). Privilégie le train (mode_recommande="train") s'il existe une liaison directe ou avec peu de correspondances, sinon la voiture.
- Pour un trajet international lointain (ex: France → Japon, France → États-Unis) : l'avion est quasi systématiquement pertinent et recommandé, le train n'est pertinent que sur certains corridors (ex: France → Italie/Espagne/Allemagne/UK en TGV/Eurostar), sinon mets pertinent=false pour le train avec la raison ("pas de liaison ferroviaire directe transcontinentale").
- Si la ville de départ ou la destination n'a pas d'aéroport direct ET que l'avion est pertinent, calcule le trajet voiture vers l'aéroport le plus proche (distance km, durée, carburant €, péages €) dans la section avion.
- mode_recommande doit être le mode le plus rapide ET pratique porte-à-porte pour CE trajet précis, pas un choix par défaut.

INSTRUCTIONS :
- Génère EXACTEMENT ${nbJours} jours dans l'itinéraire
- Pour les coordonnées GPS (lat/lng) : utilise des coordonnées TERRESTRES précises (jamais dans la mer, jamais dans l'eau). Si tu n'es pas sûr de la position exacte d'un lieu, utilise le centre-ville ou une place principale de la destination.
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
          "lat": 35.6762,
          "lng": 139.6503
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
      "points_forts": ["Avantage 1", "Avantage 2"],
      "lat": 35.6762,
      "lng": 139.6503
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
      "badge": null,
      "lat": 35.6762,
      "lng": 139.6503
    }
  ],
  "transport": {
    "mode_recommande": "avion | train | voiture - choisis le plus pertinent pour CE trajet précis",
    "avion": {
      "pertinent": true,
      "raison_si_non_pertinent": "Si pertinent=false, explique pourquoi (ex: trajet domestique court, train plus rapide porte-à-porte)",
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
    "train": {
      "pertinent": true,
      "raison_si_non_pertinent": "Si pertinent=false (ex: pas de liaison ferroviaire directe, trajet transcontinental), explique pourquoi",
      "gare_depart": "Nom de la gare de départ la plus proche",
      "gare_arrivee": "Nom de la gare d'arrivée la plus proche de la destination",
      "duree_estimee": "Durée totale estimée du trajet en train",
      "prix_estime": "Fourchette de prix aller simple par personne, ex: 45-90€",
      "type_train": "Ex: TGV direct, ou TGV + correspondance régionale"
    },
    "voiture": {
      "pertinent": true,
      "distance_km": null,
      "duree_estimee": null,
      "carburant_estime": null,
      "peages_estime": null
    }
  },
  "budget_estime": {
    "trajet": "XXX€ (coût du transport aller-retour, quel que soit le mode : avion, train ou voiture - utilise le mode recommandé dans la section transport)",
    "hebergement": "XXX€",
    "activites": "XXX€",
    "repas": "XXX€",
    "divers": "XXX€",
    "total_par_personne": "XXX€"
  }
}`;

  // Alerte Discord en cas de problème (fallback ou erreur finale) - ne bloque jamais la réponse user
  const notifyDiscord = async (message) => {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) return;
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: message })
      });
    } catch (e) { /* ne jamais faire échouer la requête pour une alerte */ }
  };

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;

    // Gemini : 2.5-flash (primaire) → 3.5-flash (fallback) → Groq llama-3.3-70b (gratuit, illimité)
    const GEMINI_MODELS = [
      { model: 'gemini-2.5-flash', version: 'v1beta' },
      { model: 'gemini-3.5-flash', version: 'v1beta' }
    ];

    const callGemini = async ({ model, version }) => {
      const url = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${apiKey}`;
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 65536 }
        })
      });
      return r;
    };

    const callGroq = async () => {
      return fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: 'Tu es un expert en planification de voyages. Réponds UNIQUEMENT avec du JSON valide, sans texte avant ni après, sans balises markdown.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 32768
        })
      });
    };

    // ── Try Gemini models ──────────────────────────────────────────────────────
    let geminiRes = apiKey ? await callGemini(GEMINI_MODELS[0]) : null;

    // Fallback sur les modèles suivants si surchargé, quota dépassé ou erreur
    for (let i = 1; geminiRes && i < GEMINI_MODELS.length && !geminiRes.ok && [400, 404, 429, 500, 503].includes(geminiRes.status); i++) {
      console.log(`${GEMINI_MODELS[i-1].model} indisponible (${geminiRes.status}), fallback sur ${GEMINI_MODELS[i].model}`);
      await notifyDiscord(`⚠️ **Ask2Trip** — \`${GEMINI_MODELS[i-1].model}\` indisponible (${geminiRes.status}), fallback sur \`${GEMINI_MODELS[i].model}\`. Surveille si ça se reproduit souvent → quota bientôt épuisé.`);
      await new Promise(r => setTimeout(r, 1000));
      geminiRes = await callGemini(GEMINI_MODELS[i]);
    }

    if (!geminiRes || !geminiRes.ok) {
      const errData = geminiRes ? await geminiRes.json().catch(() => ({})) : {};
      const msg = errData.error?.message || '';
      const isQuota = msg.toLowerCase().includes('quota') || (geminiRes && geminiRes.status === 429);
      await notifyDiscord(`🚨 **Ask2Trip — tous les modèles Gemini ont échoué** (${geminiRes?.status || 'null'}), tentative Groq...\n\`${msg.slice(0,200)}\``);
      geminiRes = null; // force fallback Groq
    }

    // ── Extraction du texte brut selon le provider ───────────────────────────
    let rawText;
    if (geminiRes && geminiRes.ok) {
      const geminiData = await geminiRes.json();
      rawText = geminiData.candidates[0].content.parts[0].text.trim();
    } else if (groqKey) {
      // Groq : gratuit, 14 400 requêtes/jour, modèle Llama 3.3 70B
      console.log('Fallback Groq llama-3.3-70b-versatile');
      await notifyDiscord('⚠️ **Ask2Trip** — Gemini indisponible, fallback Groq activé.');
      const groqRes = await callGroq();
      if (!groqRes.ok) {
        const groqErr = await groqRes.json().catch(() => ({}));
        await notifyDiscord(`🚨 **Ask2Trip — Groq aussi en échec** (${groqRes.status})\n\`${JSON.stringify(groqErr).slice(0,200)}\``);
        throw new Error('Tous les services IA sont temporairement indisponibles. Réessaie dans quelques minutes ⏳');
      }
      const groqData = await groqRes.json();
      rawText = groqData.choices[0].message.content.trim();
    } else {
      throw new Error('Service IA indisponible. Réessaie dans quelques minutes ⏳');
    }

    const clean = rawText
      .replace(/^```json\n?/, '')
      .replace(/^```\n?/, '')
      .replace(/\n?```$/, '')
      .trim();

    const data = JSON.parse(clean);

    // Photos : Google Places (précis) avec fallback Pixabay (stock)
    const placesKey = process.env.GOOGLE_PLACES_API_KEY;
    const pixabayKey = process.env.PIXABAY_API_KEY;

    // getPlacesData : photo + coordonnées GPS précises en un seul appel API
    const getPlacesData = async (query, opts = {}) => {
      if (!placesKey) return { photo_url: null, lat: null, lng: null };
      try {
        const mask = opts.noPhoto ? 'places.location' : 'places.photos,places.location';
        const searchRes = await fetch('https://places.googleapis.com/v1/places:searchText', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': placesKey,
            'X-Goog-FieldMask': mask
          },
          body: JSON.stringify({ textQuery: query, languageCode: 'fr' })
        });
        const sd = await searchRes.json();
        const place = sd.places?.[0];
        const photoName = place?.photos?.[0]?.name;
        const lat = place?.location?.latitude ?? null;
        const lng = place?.location?.longitude ?? null;
        const photo_url = photoName
          ? `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=400&key=${placesKey}`
          : null;
        return { photo_url, lat, lng };
      } catch { return { photo_url: null, lat: null, lng: null }; }
    };
    const getPlacesPhoto = async (name, city) => {
      const d = await getPlacesData(`${name} ${city}`);
      return d.photo_url;
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

    // Géocodage précis des activités via Google Places (corrige les coords IA souvent imprécises)
    if (placesKey && data.itineraire) {
      const geocodeAct = async (act) => {
        try {
          const d = await getPlacesData(`${act.activite} ${destination}`, { noPhoto: true });
          if (d.lat && d.lng) { act.lat = d.lat; act.lng = d.lng; }
        } catch {}
        return act;
      };
      for (const day of data.itineraire) {
        day.activites = await Promise.all((day.activites || []).map(geocodeAct));
      }
    }

    // Photos restaurants uniquement (Pixabay category=food = pertinent)
    // Hôtels : pas de photo Pixabay (jamais le bon hôtel) → dégradé coloré affiché à la place
    const restoPhotos = await Promise.all(
      (data.restaurants || []).map(r => getPixabayPhoto(r.photo_query || r.type + ' food dish', 'food'))
    );

    if (data.restaurants) data.restaurants = data.restaurants.map((r, i) => ({ ...r, photo_url: restoPhotos[i] }));
    if (data.hebergements) data.hebergements = data.hebergements.map(h => ({ ...h, photo_url: null }));

    return res.status(200).json(data);

  } catch (err) {
    console.error('Erreur génération:', err.message);
    // Si l'erreur ne vient pas déjà du bloc Gemini (ex: parsing JSON, bug inattendu), on alerte aussi
    if (!err.message.includes('surchargé')) {
      await notifyDiscord(`🚨 **Ask2Trip — erreur inattendue dans generate.js**\n\`${(err.message || '').slice(0,200)}\``);
    }
    return res.status(500).json({ error: err.message || 'Erreur lors de la génération.' });
  }
};
