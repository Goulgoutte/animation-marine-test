# Prompt : app de veille emploi et CRM pour une décoratrice en animation

## Contexte

Je veux que tu construises une petite application web personnelle pour ma sœur, décoratrice dans le cinéma d'animation (décor couleur, layout décor, background). Le secteur est en crise en France depuis 2024 : peu d'offres publiées, beaucoup de postes pourvus par réseau ou candidature spontanée. L'app doit donc l'aider à trois choses :

1. Repérer automatiquement les offres d'emploi ET les productions qui démarrent (pour candidater spontanément au bon moment).
2. Suivre ses candidatures et ses relances.
3. Suivre ses contacts professionnels et ses échanges avec eux.

Interface entièrement en français, utilisable confortablement sur téléphone et sur ordinateur. Une seule utilisatrice.

## Périmètre de recherche (règle centrale de l'app)

Ma sœur ne cherche que :
- de l'**animation 2D** (dessin traditionnel, 2D numérique, cut-out, Toon Boom Harmony, TVPaint...). Tout ce qui est uniquement 3D est exclu.
- des postes **sur place à Paris** (rayon réglable, par défaut Paris et petite couronne), **ou en télétravail complet**, en France comme à l'international.

Tout ce qui ne respecte pas ces deux critères est masqué par défaut (pas supprimé), avec un interrupteur « Afficher les résultats hors périmètre » pour vérifier que le filtre ne se trompe pas. Ces critères sont modifiables dans les Réglages.

## Contraintes techniques

- Uniquement des outils gratuits, open source ou auto-hébergeables. Aucune API payante, aucun service cloud payant, aucune clé d'API payante.
- Stack conseillée : Next.js (App Router) + TypeScript, SQLite avec Drizzle ORM, Playwright pour les pages chargées en JavaScript, Cheerio pour les pages HTML statiques, node-cron pour la planification. Le tout lançable en local avec `docker compose up`.
- Classification et extraction : d'abord des règles par mots-clés (voir plus bas). En option seulement, un modèle local via Ollama pour améliorer l'extraction, désactivable, jamais obligatoire.
- Notifications : optionnelles, via ntfy (auto-hébergeable) ou un simple mail SMTP configuré par l'utilisatrice.
- Scraping responsable : respecter robots.txt, limiter le rythme (une requête toutes les quelques secondes par domaine), user-agent honnête, mise en cache. Ne PAS scraper LinkedIn, Indeed, Glassdoor ni les sites qui l'interdisent dans leurs conditions : pour eux, prévoir un ajout manuel d'offre (coller une URL et remplir un mini formulaire).

## Page 1 : Veille

Deux onglets, et sur chacun un filtre de catégorie avec deux valeurs :
- **Décor** (catégorie principale, affichée par défaut)
- **Autres métiers de l'animation** (animation, storyboard, layout perso, compositing, design, production...)

### Onglet « Offres d'emploi »
Offres publiées auxquelles on candidate directement. Pour chaque offre : titre du poste, studio, production ou série si indiquée, lieu, pays, technique (2D, 3D, inconnue), mode de travail (sur place à Paris, télétravail complet, hybride, sur place ailleurs), exigence de résidence ou de permis de travail (par exemple « télétravail mais résident en Irlande uniquement » ou « résident UK »), type de contrat (CDDU, CDD, CDI, freelance, stage), niveau (junior, confirmé, senior, lead), date de début, date limite, date de publication, lien source, extrait de l'annonce.
- Une offre en télétravail réservée aux résidents d'un autre pays doit porter un badge bien visible « Résidence exigée : pays », car elle n'est pas accessible depuis Paris.
- Une offre dont la technique ou le mode de travail n'a pas pu être déterminé est affichée avec un badge « À vérifier » plutôt que masquée.
- Badge « Nouveau » sur ce qui est apparu depuis la dernière visite.
- Badge « Probablement expirée » si la page source n'existe plus ou si la date limite est passée.
- Dédoublonnage : la même offre relayée par plusieurs sites ne doit apparaître qu'une fois, avec la liste des sources.
- Bouton « Ajouter à mes candidatures » qui crée une fiche dans la page 2, préremplie.
- Bouton « Masquer » pour ce qui ne l'intéresse pas.

### Onglet « Productions »
Productions repérées dans l'actualité, pour candidater spontanément. Pour chaque production : titre, format (long métrage, série, court, spécial TV), technique (2D, 3D, stop motion, hybride), producteurs et studios de fabrication, pays coproducteurs, diffuseur ou distributeur, réalisateur, statut (développement, financement, préproduction, production, postproduction), date de démarrage annoncée, ville de fabrication si connue, contact de recrutement si trouvé, sources.
- Seules les productions en 2D sont affichées par défaut. Une production est mise en avant si au moins une partie de la fabrication se fait à Paris, ou si le studio de fabrication est connu pour travailler avec des artistes en télétravail.
- Indicateur « Bon moment pour candidater en décor » quand le statut est développement avancé, financement bouclé, préproduction ou début de production (les décors se font tôt dans la fabrication).
- Pour les coproductions internationales, afficher les pays coproducteurs et préciser, si l'info existe, quel pays fabrique les décors.
- Bouton « Préparer une candidature spontanée » qui crée une fiche dans la page 2 avec le canal « candidature spontanée ».
- Possibilité de corriger ou compléter une fiche à la main, et d'ajouter une production manuellement.

### Mots-clés de classification (à rendre éditables dans les réglages)
- Décor : décor, décors, décorateur, décoratrice, décor couleur, layout décor, layout BG, BG, background, background artist, background painter, colour artist, color artist, color key, color script, environment artist, environment design, matte painting, set design (animation), props et décors.
- 2D (inclusion) : 2D, animation traditionnelle, dessin animé, dessin à la main, hand-drawn, cut-out, puppet 2D, Toon Boom, Harmony, Storyboard Pro, TVPaint, Photoshop, Krita, Clip Studio, painted backgrounds.
- 3D (exclusion si aucun signal 2D) : 3D, CG, CGI, Maya, Blender, Houdini, Unreal, lookdev, surfacing, lighting artist, rigging 3D, modélisation, texturing.
- Télétravail : télétravail, 100 % télétravail, full remote, remote, work from home, à distance. Attention aux formules du type « remote, must be based in... » ou « UK residents only » qui doivent remplir le champ exigence de résidence.
- Paris sur place : Paris, 75, Île-de-France, Montreuil, Saint-Denis, Issy-les-Moulineaux, Boulogne-Billancourt, Clichy, Levallois, Arcueil, Vincennes, Pantin (liste éditable).
- Signaux de production : « en production », « lancement de la fabrication », « début de fabrication », « entre en production », « tour de table bouclé », « financement », « aide du CNC », « préproduction », « pitch », « Cartoon Forum », « Cartoon Movie », « Mifa », « recrute pour la série ».

## Sources à surveiller

Les sources doivent être stockées en base et gérables depuis une page Réglages : nom, URL, type (site d'emploi, page carrière de studio, média d'actualité, base de projets), méthode (RSS, HTML statique, Playwright), fréquence, actif ou non, date du dernier succès, dernière erreur. Ajoute un indicateur de santé par source pour voir tout de suite celles qui ne renvoient plus rien.

Liste de départ. Les sources marquées (vérifiée) ont été consultées pendant notre recherche, les autres sont à tester à l'installation :

**Sites d'emploi spécialisés**
- jobotropo.com/jobs (vérifiée, contenu chargé en JavaScript, nécessite Playwright, très bonne source française)
- emploi.afjv.com (vérifiée, rubrique graphisme et animation)
- 3dvf.com, section emploi (vérifiée)
- anim.works/studiowatch (vérifiée, pages carrière de studios relevées chaque jour, surtout animation et jeu vidéo)
- cojob.fr, métier « animateur / animatrice 2D 3D, films d'animation » (vérifiée, a bloqué la récupération automatique, à tester)
- candidat.francetravail.fr, recherches « décorateur animation » et « animateur 2D et 3D » (vérifiée)
- jobvfx.com (vérifiée)
- zerply.com, industry-jobs (vérifiée)
- awn.com, récapitulatifs hebdomadaires « Studio Jobs Roundup » (vérifiée, a bloqué la récupération automatique, prévoir RSS)
- animationireland.com, offres d'emploi (vérifiée)

**Pages carrière de studios et productions**
- Construire automatiquement la liste à partir de l'annuaire des studios d'animation de Film France CNC : filmfrance.net/en/plan-your-production/animation-studios/ (vérifiée). Pour chaque studio, trouver et enregistrer sa page recrutement ou son adresse de candidature.
- Déjà repérés (vérifiées) : stimstudio.com/fr/recrutement, mist.studio, enclumeanimation.com (Bruxelles), ellipseanimation.com, xilam.com, malil-art.com (Angoulême, layout BG et BG couleur), fost.studio (Paris et Angoulême), illuminationstudiosparis.com, angel.com/careers.
- À ajouter et tester, en priorité les studios 2D parisiens : Caribara (Paris), ZAG (Paris), Sacrebleu Productions (Paris), FOST (Paris), La Cachette (Paris), Bobbypills (Paris), Folivari (Paris), Blue Spirit (Paris), Miyu (Paris), 2 Minutes, Superprod, TeamTO (nouvelle activité 2D et anime), SunCreature.
- Hors Paris, à garder uniquement pour leurs offres en télétravail : OOOLALA, Folimage, Fargo, JPL Films, Andarta (Valence), Normaal, Cartoon Saloon, Studio Souza, Waooh (Liège), Jam Media, Kavaleer.
- Les studios purement 3D (par exemple Stim, Dwarf, Illumination Paris) peuvent être désactivés par défaut.

**Actualité des productions**
- catsuka.com (vérifiée)
- ecran-total.fr (vérifiée)
- 3dvf.com, actualités (vérifiée)
- magelis.org, actualités du pôle image d'Angoulême (vérifiée)
- cartoon-media.eu, projets Cartoon Forum et Cartoon Movie (vérifiée)
- unifrance.org, fiches films et actualités (vérifiée)
- scriptoclap.fr, base des projets en développement avec stade et contacts de production (vérifiée, très utile pour l'onglet Productions)
- auvergnerhonealpes-cinema.fr (vérifiée)
- À tester : animfrance.fr, cnc.fr (aides attribuées), annecyfestival.com (Mifa), cartoonbrew.com, animationmagazine.net, variety.com rubrique animation, cineuropa.org.

## Page 2 : Suivi des candidatures (CRM)

Vue tableau ET vue kanban par statut.

Champs d'une candidature : studio, poste ou type de candidature (offre publiée ou spontanée), production liée (lien vers la fiche Productions si elle existe), contact lié (lien vers la page 3), date d'envoi, canal (mail, formulaire du site, LinkedIn, salon ou festival, recommandation, autre), version du portfolio et du CV envoyée, statut, notes, pièces jointes ou liens.

Statuts : à préparer, envoyée, relancée, entretien ou test, refus, acceptée, sans réponse (clôturée).

Relances :
- Historique des relances (date, canal, note).
- Date de prochaine relance calculée automatiquement (par défaut 10 jours ouvrés après l'envoi, puis 15 jours après la première relance, délais réglables).
- Une section « À relancer aujourd'hui » tout en haut de la page.
- Passage automatique en « sans réponse » après la deuxième relance restée sans réponse, avec possibilité d'annuler.

Petit tableau de bord : nombre de candidatures envoyées ce mois, taux de réponse, répartition par canal et par catégorie (décor ou autre).

## Page 3 : Contacts professionnels (CRM)

Champs d'un contact : nom, prénom, studio ou structure, fonction (superviseur décor, directeur artistique, chargée de production, RH, réalisateur...), ville, email, téléphone, LinkedIn, comment on s'est rencontrés, étiquettes libres.

Journal des échanges, pour chaque contact : date, type (café, déjeuner, festival ou salon, visio, appel, message, mail), lieu, sujets abordés, ce qui a été promis de part et d'autre, prochaine action et sa date.

En haut de la fiche : la date du dernier échange et le nombre de jours écoulés depuis. Sur la liste : tri par « pas vu depuis longtemps », et rappel quand un contact n'a pas été recontacté depuis un délai réglable (par défaut 3 mois).

Liens croisés : depuis un contact, voir les candidatures et les productions liées. Depuis une candidature, voir les contacts liés.

## Design

- Hiérarchie de lecture très contrastée : mélanger de très grands éléments (chiffres clés, titres de section, nombre de nouvelles offres décor) et de très petits (métadonnées, sources, dates).
- Sobre, lisible, mobile d'abord. Navigation en barre basse sur mobile avec les trois pages : Veille, Candidatures, Contacts.
- Pas d'écran vide déroutant : chaque liste vide explique quoi faire.

## Livrables attendus

1. Le code complet, avec un README en français qui explique l'installation en local avec Docker, l'ajout d'une source, et le lancement manuel d'une collecte.
2. Un script de collecte lançable à la main et planifié (par défaut deux fois par jour).
3. Des données d'exemple pour tester les trois pages sans attendre la première collecte.
4. Export CSV des trois pages et sauvegarde de la base SQLite en un clic.

Commence par me proposer l'architecture et le schéma de base de données, puis construis l'app étape par étape en vérifiant chaque collecteur sur au moins trois sources réelles de la liste.

## Ajouts (25/11/2026) : sources et critères donnés par la sœur

Elle cherche des prods en présentiel à Paris, ou en distanciel si elles sont francophones ou anglophones
(langue de travail FR ou EN : une offre en télétravail dans une autre langue est hors périmètre).

Sources qu'elle utilise, à ajouter :
- Actualité et annonces de projets : Catsuka, Cartoon Brew, Animation Magazine, Kidscreen, Deadline,
  Variety, Screen Daily, Broadcast, Skwigly, Satellifax (payant), Le Film Français (payant), CNC, AFCA.
- Qui produit et recrute : Annecy / MIFA, Cartoon Movie, LinkedIn, Instagram.
LinkedIn et Instagram : JAMAIS de collecte automatique, ajout manuel seulement.
Satellifax et Le Film Français : ne collecter que ce qui est public (titres RSS), sinon source manuelle.

## Adaptation à l'hébergement gratuit (décision du 25/11/2026)

Pas de serveur permanent, pas de Docker en production :
- Collecte : script Node/TypeScript dans `collector/`, lancé par GitHub Actions deux fois par jour
  (Playwright disponible dans le runner). Il écrit `web/public/data/offres.json`, `productions.json`,
  `sources.json` (types dans `shared/types.ts`) et commite le résultat.
- Site : Next.js en export statique (`output: 'export'`) dans `web/`, publié sur GitHub Pages.
- Candidatures, contacts, relances, offres/productions ajoutées ou corrigées à la main, masquages,
  réglages personnels : Supabase (projet perso gratuit), connexion par lien e-mail, RLS par utilisateur.
  Schéma dans `supabase/schema.sql`.
- Sources et mots-clés : fichiers de config versionnés dans `collector/config/` ; la page Réglages
  les affiche (lecture seule + santé des sources) et renvoie vers le fichier à modifier sur GitHub.
- Pas d'Ollama, pas de ntfy/SMTP en v1.
