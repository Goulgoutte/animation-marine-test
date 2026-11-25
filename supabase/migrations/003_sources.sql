-- Veille animation : sources de collecte gérables depuis l'app (idempotent, à coller dans SQL Editor).
-- Fichier généré par `pnpm migration` (collector/) à partir de collector/config/sources.json : ne pas éditer les INSERT à la main.
--
-- Les sources ne sont pas sensibles (URLs publiques de sites d'emploi et de presse) :
--   * lecture publique : anon (la collecte GitHub Actions, avec la clé publique) et authenticated ;
--   * écriture réservée aux utilisateurs connectés :
--       - une source ajoutée dans l'app porte user_id = auth.uid() : seule sa propriétaire la modifie ou la supprime ;
--       - les sources par défaut (INSERT en bas de ce fichier) ont user_id null : toute personne connectée peut les
--         modifier (fréquence, activation, sélecteurs), personne ne peut les supprimer ;
--       - user_id ne change jamais après l'insertion (déclencheur).
-- Une source collectée = actif et fréquence échue (voir collector/src/collect.ts).

create table if not exists public.sources (
  id text primary key,
  nom text not null,
  url text not null,
  type text not null default 'actualite',        -- emploi | carriere-studio | actualite | base-projets
  methode text not null default 'html',          -- rss | html | playwright | manuel | lever | recruitee | teamtailor | workable | smartrecruiters | werecruit | cnc
  frequence text not null default 'quotidien',   -- 3h | 6h | 12h | quotidien | hebdo
  actif boolean not null default true,
  config jsonb not null default '{}'::jsonb,     -- selecteurs, filtre (regex sur le titre), studio, technique, lieuDefaut
  notes text,
  ajoutee_par_utilisatrice boolean not null default false,
  user_id uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sources_frequence_check check (frequence in ('3h', '6h', '12h', 'quotidien', 'hebdo'))
);

create index if not exists sources_user_idx on public.sources (user_id);

create or replace function public.sources_avant_maj() returns trigger
language plpgsql as $$
begin
  new.user_id := old.user_id;          -- la propriété d'une ligne ne change pas
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists sources_avant_maj on public.sources;
create trigger sources_avant_maj before update on public.sources
  for each row execute function public.sources_avant_maj();

alter table public.sources enable row level security;

drop policy if exists sources_select_publique on public.sources;
create policy sources_select_publique on public.sources for select to anon, authenticated using (true);

drop policy if exists sources_insert_connecte on public.sources;
create policy sources_insert_connecte on public.sources for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists sources_update_proprietaire on public.sources;
create policy sources_update_proprietaire on public.sources for update to authenticated
  using (user_id is null or user_id = auth.uid())
  with check (user_id is null or user_id = auth.uid());

drop policy if exists sources_delete_proprietaire on public.sources;
create policy sources_delete_proprietaire on public.sources for delete to authenticated
  using (user_id = auth.uid());

grant select on public.sources to anon, authenticated;
grant insert, update, delete on public.sources to authenticated;

-- Sources par défaut (user_id null). on conflict do nothing : relancer le fichier n'écrase aucun réglage.
insert into public.sources (id, nom, url, type, methode, frequence, actif, config, notes) values
  ('jobotropo', 'Jobotropo', 'https://www.jobotropo.com/jobs', 'emploi', 'playwright', '6h', true, '{"selecteurs":{"item":"article.job-full-card","titre":".job-role","studio":".organization-first-header h3","lieu":"[data-tag=location]"},"filtre":"."}'::jsonb, 'Contenu chargé en JavaScript (10 premières offres, cartes sans lien : ancre sur la page). Beaucoup de 3D : le filtre périmètre trie.'),
  ('afjv-emploi', 'AFJV emploi (graphisme et animation)', 'https://emploi.afjv.com/', 'emploi', 'html', '6h', true, '{"selecteurs":{"item":"a[href*=''/emploi-'']"},"filtre":"animat|décor|decor|background|layout|2d|storyboard|dessin|illustrat|infograph|coloriste|graphiste"}'::jsonb, 'Beaucoup de jeu vidéo : le filtre garde les intitulés liés à l''animation et au dessin.'),
  ('3dvf-emploi', '3DVF emploi', 'https://3dvf.com/offres-emploi/feed/', 'emploi', 'rss', '12h', true, '{}'::jsonb, 'Flux valide mais vide : 3DVF affiche « 0 dernières offres d''emploi » (vérifié le 25/11/2026).'),
  ('animworks-studiowatch', 'anim.works StudioWatch', 'https://anim.works/studiowatch/', 'emploi', 'html', '6h', false, '{"selecteurs":{"item":"a"}}'::jsonb, 'Liste rendue en JavaScript, logos et compteurs sans lien exploitable : pas de flux ni d''API publique. Ajout manuel.'),
  ('cojob', 'Cojob (animateur 2D 3D)', 'https://www.cojob.fr/', 'emploi', 'html', '6h', false, '{}'::jsonb, 'Bloque la récupération automatique (redirige vers okapijob.com). Pas de flux public : ajout manuel.'),
  ('francetravail', 'France Travail (décorateur animation, animateur 2D et 3D)', 'https://candidat.francetravail.fr/offres/emploi', 'emploi', 'playwright', '6h', false, '{}'::jsonb, 'L''API officielle « Offres d''emploi » exige une clé OAuth (compte développeur) et le robots.txt du site interdit la recherche : ajout manuel.'),
  ('jobvfx', 'JobVFX', 'https://jobvfx.com/', 'emploi', 'html', '6h', false, '{"selecteurs":{"item":"a[href*=''job'']"}}'::jsonb, 'Page de catégories (VFX/3D/jeu), pas d''offres : sans intérêt pour la 2D.'),
  ('zerply', 'Zerply industry-jobs', 'https://zerply.com/industry-jobs', 'emploi', 'playwright', '6h', false, '{}'::jsonb, 'L''URL /industry-jobs renvoie 404 (25/11/2026) : site probablement fermé.'),
  ('animation-ireland-emploi', 'Animation Ireland emploi (flux job_feed)', 'https://animationireland.com/?feed=job_feed', 'emploi', 'rss', '12h', true, '{}'::jsonb, 'Flux job_feed valide mais vide le 25/11/2026. Beaucoup d''offres avec résidence irlandaise exigée quand il se remplit.'),
  ('animation-ireland-rss', 'Animation Ireland (actualités)', 'https://animationireland.com/feed', 'actualite', 'rss', '12h', true, '{}'::jsonb, null),
  ('awn-rss', 'Animation World Network (flux, dont Studio Jobs Roundup)', 'https://www.awn.com/rss.xml', 'actualite', 'rss', '6h', true, '{}'::jsonb, null),
  ('indeed', 'Indeed', 'https://fr.indeed.com/', 'emploi', 'manuel', '6h', false, '{}'::jsonb, 'Scraping interdit : ajout manuel.'),
  ('linkedin', 'LinkedIn', 'https://www.linkedin.com/jobs/', 'emploi', 'manuel', '6h', false, '{}'::jsonb, 'JAMAIS de collecte automatique : ajout manuel seulement.'),
  ('instagram', 'Instagram', 'https://www.instagram.com/', 'actualite', 'manuel', '12h', false, '{}'::jsonb, 'JAMAIS de collecte automatique : ajout manuel seulement.'),
  ('fost', 'FOST (Paris, Angoulême)', 'https://fost.studio/jobs/', 'carriere-studio', 'html', 'quotidien', true, '{"selecteurs":{"item":"a"},"studio":"FOST (Paris, Angoulême)","technique":"2D"}'::jsonb, 'Page recrutement : candidature par formulaire Tally, aucune offre publiée (stages et alternances sur LinkedIn/Instagram, non collectés).'),
  ('mist', 'MIST', 'https://mist.studio/work/all/', 'carriere-studio', 'html', 'quotidien', true, '{"selecteurs":{"item":"a"},"studio":"MIST","technique":"2D"}'::jsonb, 'Page « Recrutements » : « annonces en cours » vide le 25/11/2026.'),
  ('xilam', 'Xilam', 'https://xilam.com/category/offres-emploi/feed/', 'carriere-studio', 'rss', '12h', true, '{"studio":"Xilam","technique":"2D"}'::jsonb, 'Flux WordPress de la catégorie « offres d''emploi » de xilam.com/rejoignez-nous/ (la page elle-même est rendue en JavaScript).'),
  ('ellipse', 'Ellipse Animation', 'https://www.ellipseanimation.com/careers/', 'carriere-studio', 'html', '12h', true, '{"selecteurs":{"item":".accordion.job","titre":".job__title","lieu":".job__info span:nth-of-type(2)","sansLien":true},"filtre":".","studio":"Ellipse Animation","technique":"2D","lieuDefaut":"Paris"}'::jsonb, 'Offres déroulées en accordéon sur la page careers (nouvelle ligne anime : Creative Producer – Anime).'),
  ('malil', 'Malil Art (Angoulême, layout BG et BG couleur)', 'https://www.malil-art.com/', 'carriere-studio', 'html', 'quotidien', false, '{"selecteurs":{"item":"a"},"studio":"Malil Art (Angoulême, layout BG et BG couleur)","technique":"2D","lieuDefaut":"Angoulême"}'::jsonb, 'Aucune page recrutement ni lien carrière sur le site (Angoulême) : candidature par e-mail, ajout manuel.'),
  ('enclume', 'Enclume Animation (Bruxelles)', 'https://www.enclumeanimation.com/jobs-stages', 'carriere-studio', 'html', 'quotidien', true, '{"selecteurs":{"item":"a"},"studio":"Enclume Animation","technique":"2D","lieuDefaut":"Bruxelles"}'::jsonb, 'Page « Jobs & stages » : aucune offre le 25/11/2026 (candidature spontanée par formulaire Jotform). Bruxelles : télétravail jamais à temps plein.'),
  ('caribara', 'Caribara (Paris)', 'https://www.caribara-animation.com/contact/', 'carriere-studio', 'html', 'quotidien', false, '{"selecteurs":{"item":"a"},"studio":"Caribara (Paris)","technique":"2D"}'::jsonb, 'caribara.com n''est pas le studio : le site est caribara-animation.com, dont la page Contact renvoie vers les réseaux sociaux (non collectés) pour les offres. Actualités suivies par le flux caribara-actus.'),
  ('zag', 'ZAG (Paris)', 'https://www.zag.com/', 'carriere-studio', 'html', 'quotidien', false, '{"selecteurs":{"item":"a"},"studio":"ZAG (Paris)","technique":"2D"}'::jsonb, 'Site rendu en JavaScript, aucune page recrutement exposée (zagtoon.com : pas de flux).'),
  ('lacachette', 'La Cachette (Paris)', 'https://www.lacachette.fr/', 'carriere-studio', 'html', 'quotidien', false, '{"selecteurs":{"item":"a"},"studio":"La Cachette (Paris)","technique":"2D"}'::jsonb, 'lacachette.fr est une librairie, pas le studio : domaine erroné, studio non retrouvé.'),
  ('bobbypills', 'Bobbypills (Paris)', 'https://www.bobbypills.com/', 'carriere-studio', 'html', 'quotidien', false, '{"selecteurs":{"item":"a"},"studio":"Bobbypills (Paris)","technique":"2D"}'::jsonb, 'Aucune page recrutement sur le site (candidature par e-mail).'),
  ('folivari', 'Folivari (Paris)', 'https://folivari.com/', 'carriere-studio', 'html', 'quotidien', false, '{"selecteurs":{"item":"a"},"studio":"Folivari (Paris)","technique":"2D"}'::jsonb, 'Aucune page recrutement ni offre sur le site ; flux WordPress vide.'),
  ('superprod', 'Superprod (WeRecruit)', 'https://careers.werecruit.io/fr/superprod', 'carriere-studio', 'werecruit', '6h', true, '{"studio":"Superprod","technique":"2D"}'::jsonb, 'Page careers.werecruit.io : liste d''offres embarquée dans la page (window.allOffers). Inclut Production Designer, Adult Animated Series (Paris).'),
  ('teamto', 'TeamTO (nouvelle activité 2D et anime)', 'https://www.teamto.com/', 'carriere-studio', 'html', 'quotidien', false, '{"selecteurs":{"item":"a"},"studio":"TeamTO (nouvelle activité 2D et anime)","technique":"2D"}'::jsonb, 'Site rendu en JavaScript, aucune page recrutement exposée.'),
  ('suncreature', 'SunCreature', 'https://www.suncreature.com/', 'carriere-studio', 'html', 'quotidien', false, '{"selecteurs":{"item":"a"},"studio":"SunCreature","technique":"2D"}'::jsonb, 'Aucune page recrutement exposée.'),
  ('sacrebleu', 'Sacrebleu Productions (Paris)', 'https://www.sacrebleuprod.com/', 'carriere-studio', 'html', 'quotidien', false, '{"selecteurs":{"item":"a"},"studio":"Sacrebleu Productions (Paris)","technique":"2D"}'::jsonb, 'sacrebleuprod.com injoignable (connexion réinitialisée) : domaine à retrouver.'),
  ('bluespirit', 'Blue Spirit (Paris)', 'https://www.bluespirit.com/', 'carriere-studio', 'html', 'quotidien', false, '{"selecteurs":{"item":"a"},"studio":"Blue Spirit (Paris)","technique":"2D"}'::jsonb, 'HTTP 403 (protection anti-robot) : non contourné. Pas de flux public.'),
  ('miyu', 'Miyu (Paris)', 'https://www.miyu-productions.com/', 'carriere-studio', 'html', 'quotidien', false, '{"selecteurs":{"item":"a"},"studio":"Miyu (Paris)","technique":"2D"}'::jsonb, 'Domaine miyu-productions.com introuvable (DNS) : à retrouver.'),
  ('2minutes', '2 Minutes (Paris)', 'https://www.2minutes.tv/', 'carriere-studio', 'html', 'quotidien', false, '{"selecteurs":{"item":"a"},"studio":"2 Minutes (Paris)","technique":"2D"}'::jsonb, 'Site injoignable (timeout) le 25/11/2026.'),
  ('ooolala', 'OOOLALA', 'https://www.ooolala.com/', 'carriere-studio', 'html', 'quotidien', false, '{"selecteurs":{"item":"a"},"studio":"OOOLALA","technique":"2D","lieuDefaut":"Angoulême"}'::jsonb, 'Application web sans page recrutement exposée (/lander).'),
  ('folimage', 'Folimage', 'https://www.folimage.fr/fr/', 'carriere-studio', 'html', 'quotidien', false, '{"selecteurs":{"item":"a"},"studio":"Folimage","technique":"2D","lieuDefaut":"Valence"}'::jsonb, 'Aucune page recrutement exposée.'),
  ('jpl', 'JPL Films', 'https://jplfilms.com/', 'carriere-studio', 'html', 'quotidien', false, '{"selecteurs":{"item":"a"},"studio":"JPL Films","technique":"2D","lieuDefaut":"Paris"}'::jsonb, 'Aucune page recrutement exposée.'),
  ('andarta', 'Andarta Pictures (Valence)', 'https://andarta-pictures.com/fr/recrutement/', 'carriere-studio', 'html', 'quotidien', true, '{"selecteurs":{"item":"main a[href*=''/recrutement/'']"},"studio":"Andarta Pictures","technique":"2D","lieuDefaut":"Valence"}'::jsonb, 'Page recrutement : « Aucune offre actuellement » le 25/11/2026 (formulaires Google par métier).'),
  ('normaal', 'Normaal', 'https://normaal.fr/', 'carriere-studio', 'html', 'quotidien', false, '{"selecteurs":{"item":"a"},"studio":"Normaal","technique":"2D","lieuDefaut":"Belgique"}'::jsonb, 'Aucune page recrutement exposée ; flux vide.'),
  ('cartoonsaloon', 'Cartoon Saloon', 'https://www.cartoonsaloon.ie/irish-animation-studio/careers/', 'carriere-studio', 'html', 'quotidien', false, '{"selecteurs":{"item":"a"},"studio":"Cartoon Saloon","technique":"2D","lieuDefaut":"Kilkenny"}'::jsonb, 'Offres dans un iframe Occupop (api.occupop.com) : aucune vacance ouverte le 25/11/2026. Collecteur Occupop à écrire si le studio recrute.'),
  ('studiosouza', 'Studio Souza', 'https://www.studiosouza.com/', 'carriere-studio', 'html', 'quotidien', false, '{"selecteurs":{"item":"a"},"studio":"Studio Souza","technique":"2D","lieuDefaut":"Inconnu"}'::jsonb, 'Aucune page recrutement exposée.'),
  ('waooh', 'Waooh (Liège)', 'https://www.waooh.be/jobs/', 'carriere-studio', 'html', 'quotidien', true, '{"selecteurs":{"item":"a[href*=''/job_offer/'']"},"studio":"Waooh","technique":"2D","lieuDefaut":"Liège"}'::jsonb, 'Seule offre publiée : candidature spontanée (exclue). Liège : télétravail ?'),
  ('kavaleer', 'Kavaleer', 'https://kavaleer.com/jobs/', 'carriere-studio', 'html', 'quotidien', true, '{"selecteurs":{"item":"a"},"studio":"Kavaleer","technique":"2D","lieuDefaut":"Dublin"}'::jsonb, 'Page Jobs : « Nothing Found » le 25/11/2026 (Dublin).'),
  ('fargo', 'Fargo', 'https://www.fargo-animation.com/', 'carriere-studio', 'html', 'quotidien', false, '{"selecteurs":{"item":"a"},"studio":"Fargo","technique":"2D","lieuDefaut":"Angoulême"}'::jsonb, 'fargo-animation.com injoignable.'),
  ('jammedia', 'Jam Media', 'https://www.jam-media.com/', 'carriere-studio', 'html', 'quotidien', false, '{"selecteurs":{"item":"a"},"studio":"Jam Media","technique":"2D","lieuDefaut":"Dublin"}'::jsonb, 'jam-media.com est en vente (hugedomains) : studio sans site.'),
  ('stim', 'Stim Studio', 'https://www.stimstudio.com/fr/recrutement', 'carriere-studio', 'html', 'quotidien', false, '{"selecteurs":{"item":"a"},"studio":"Stim Studio","technique":"3D"}'::jsonb, 'Studio 3D : désactivé par défaut. La page /fr/recrutement est lisible (liste de liens) si besoin.'),
  ('illumination-paris', 'Illumination (Lever)', 'https://jobs.lever.co/illumination', 'carriere-studio', 'lever', '6h', true, '{"selecteurs":{"item":"a"},"studio":"Illumination","technique":"3D"}'::jsonb, 'API publique Lever (api.lever.co/v0/postings/illumination) : 0 offre publiée le 25/11/2026. Studio majoritairement 3D, mais storyboard/design 2D possibles : le classement décide.'),
  ('dwarf', 'Dwarf Animation', 'https://www.dwarfanimation.com/careers', 'carriere-studio', 'html', 'quotidien', false, '{"selecteurs":{"item":"a"},"studio":"Dwarf Animation","technique":"3D"}'::jsonb, 'Studio 3D : page careers « no position available » le 25/11/2026.'),
  ('angel', 'Angel Studios', 'https://www.angel.com/careers', 'carriere-studio', 'html', 'quotidien', false, '{"selecteurs":{"item":"a"},"studio":"Angel Studios","technique":"2D"}'::jsonb, 'Angel Studios (distribution/streaming), hors animation 2D : sans objet.'),
  ('filmfrance-annuaire', 'Film France : annuaire des studios d''animation', 'https://www.filmfrance.net/en/plan-your-production/animation-studios/', 'base-projets', 'html', 'quotidien', false, '{}'::jsonb, 'Annuaire de studios, pas une source d''offres : sert à trouver de nouveaux studios, jamais collecté.'),
  ('catsuka', 'Catsuka', 'https://www.catsuka.com/syndication/rss2/news.php', 'actualite', 'rss', '6h', true, '{}'::jsonb, null),
  ('cartoonbrew', 'Cartoon Brew', 'https://www.cartoonbrew.com/feed', 'actualite', 'rss', '6h', true, '{}'::jsonb, null),
  ('animationmagazine', 'Animation Magazine', 'https://www.animationmagazine.net/feed/', 'actualite', 'rss', '12h', false, '{}'::jsonb, 'HTTP 403 (protection anti-robot) sur tous les flux : non contourné. Alternative : Google Actualités RSS site:animationmagazine.net (voir les sources Google Actualités, en attente).'),
  ('kidscreen', 'Kidscreen', 'https://kidscreen.com/feed/', 'actualite', 'rss', '12h', false, '{}'::jsonb, 'Flux protégé par un défi anti-robot (HTTP 202 vide) : non contourné.'),
  ('deadline-animation', 'Deadline (animation)', 'https://deadline.com/tag/animation/feed/', 'actualite', 'rss', '6h', true, '{}'::jsonb, null),
  ('variety-animation', 'Variety (animation)', 'https://variety.com/t/animation/feed/', 'actualite', 'rss', '6h', true, '{}'::jsonb, null),
  ('skwigly', 'Skwigly', 'https://www.skwigly.co.uk/feed/', 'actualite', 'rss', '12h', true, '{}'::jsonb, null),
  ('3dvf-actu', '3DVF actualités', 'https://www.3dvf.com/feed', 'actualite', 'rss', '6h', true, '{}'::jsonb, null),
  ('ecran-total', 'Écran Total', 'https://www.ecran-total.fr/feed/', 'actualite', 'rss', '12h', false, '{}'::jsonb, 'Flux /feed/ redirigé puis HTTP 403 (anti-robot) : non contourné.'),
  ('magelis', 'Magelis (pôle image d''Angoulême)', 'https://www.magelis.org/feed/', 'actualite', 'rss', '12h', true, '{}'::jsonb, null),
  ('cineuropa', 'Cineuropa', 'https://www.cineuropa.org/rss', 'actualite', 'rss', '12h', false, '{}'::jsonb, '403 lors des tests.'),
  ('screendaily', 'Screen Daily', 'https://www.screendaily.com/', 'actualite', 'html', '12h', false, '{"selecteurs":{"item":"h2 a, h3 a, article a"}}'::jsonb, 'Flux RSS introuvable : à tester en HTML.'),
  ('broadcast', 'Broadcast', 'https://www.broadcastnow.co.uk/', 'actualite', 'html', '12h', false, '{"selecteurs":{"item":"h2 a, h3 a, article a"}}'::jsonb, 'Flux RSS introuvable ; contenu en partie payant.'),
  ('satellifax', 'Satellifax', 'https://www.satellifax.com/', 'actualite', 'manuel', '12h', false, '{}'::jsonb, 'Payant : titres publics uniquement, sinon saisie manuelle.'),
  ('lefilmfrancais', 'Le Film Français', 'https://www.lefilmfrancais.com/', 'actualite', 'manuel', '12h', false, '{}'::jsonb, 'Payant : titres publics uniquement, sinon saisie manuelle.'),
  ('cnc', 'CNC (communiqués et aides)', 'https://www.cnc.fr/rss', 'actualite', 'html', '12h', false, '{"selecteurs":{"item":"h2 a, h3 a, article a"}}'::jsonb, '« /rss » du CNC renvoie une page HTML, pas un flux. Remplacée par les pages de résultats des commissions (aide aux techniques d''animation).'),
  ('afca', 'AFCA (Association française du cinéma d''animation)', 'https://www.afca.asso.fr/', 'actualite', 'html', '12h', false, '{"selecteurs":{"item":"h2 a, h3 a, article a"}}'::jsonb, 'Pas de flux (404) ; page d''accueil sans article exploitable.'),
  ('cartoon-media', 'Cartoon Media (Cartoon Forum, Cartoon Movie)', 'https://www.cartoon-media.eu/', 'base-projets', 'html', 'quotidien', false, '{"selecteurs":{"item":"h2 a, h3 a, article a"}}'::jsonb, 'Pas de flux (404) et page d''accueil sans article exploitable.'),
  ('unifrance', 'Unifrance', 'https://www.unifrance.org/', 'actualite', 'html', '12h', false, '{"selecteurs":{"item":"h2 a, h3 a, article a"}}'::jsonb, 'Cloudflare (« Just a moment ») sur tout le site : non contourné.'),
  ('scriptoclap', 'Scriptoclap (projets en développement)', 'https://www.scriptoclap.fr/', 'base-projets', 'html', 'quotidien', false, '{"selecteurs":{"item":"h2 a, h3 a, article a"}}'::jsonb, 'Injoignable lors des tests : très utile, à réessayer.'),
  ('aura-cinema', 'Auvergne-Rhône-Alpes Cinéma', 'https://www.auvergnerhonealpes-cinema.fr/', 'actualite', 'html', '12h', false, '{"selecteurs":{"item":"h2 a, h3 a, article a"}}'::jsonb, 'Pas de flux ; page d''accueil sans article exploitable.'),
  ('animfrance', 'Animation France', 'https://www.animfrance.fr/', 'actualite', 'html', '12h', false, '{"selecteurs":{"item":"h2 a, h3 a, article a"}}'::jsonb, 'Pas de flux (404) ; page d''accueil sans article exploitable.'),
  ('annecy-mifa', 'Annecy / MIFA', 'https://www.annecyfestival.com/', 'actualite', 'html', '12h', false, '{"selecteurs":{"item":"h2 a, h3 a, article a"}}'::jsonb, 'Pas de flux (404) ; page d''accueil sans article exploitable. Les résultats du festival sont de toute façon des palmarès, exclus du classement.'),
  ('cartoon-movie', 'Cartoon Movie', 'https://www.cartoon-media.eu/cartoon-movie', 'base-projets', 'html', 'quotidien', false, '{"selecteurs":{"item":"h2 a, h3 a, article a"}}'::jsonb, 'Même domaine que Cartoon Media : désactivé tant que l''URL n''est pas confirmée.'),
  ('fortiche', 'Fortiche (Paris)', 'https://forticheprod.com/jobs', 'carriere-studio', 'html', '12h', true, '{"selecteurs":{"item":"a.e-con[href*=''/job-offers/'']","titre":"h5.elementor-heading-title"},"studio":"Fortiche","lieuDefaut":"Paris"}'::jsonb, 'Page jobs de forticheprod.com (cartes Elementor). Studio Paris 2D/3D (Arcane).'),
  ('magic-design', 'Magic Design Studios (Montpellier)', 'https://www.magicdesignstudios.com/jobs-alert', 'carriere-studio', 'html', '12h', true, '{"selecteurs":{"item":"h1","sansLien":true},"studio":"Magic Design Studios","technique":"2D","lieuDefaut":"Montpellier"}'::jsonb, 'Page JOBS (Wix) : un h1 par offre. Jeu vidéo 2D (Spine), télétravail partiel possible.'),
  ('weworkremotely-design', 'We Work Remotely (design, télétravail)', 'https://weworkremotely.com/categories/remote-design-jobs.rss', 'emploi', 'rss', '12h', true, '{"filtre":"animat|background|storyboard|illustrat|2d|concept art|colou?r|visual development"}'::jsonb, 'Flux RSS officiel de la catégorie design : tout est en télétravail, le filtre ne garde que les intitulés d''animation et d''illustration. Résidence exigée détectée par le classement.'),
  ('animationcareerreview', 'Animation Career Review', 'https://www.animationcareerreview.com/rss.xml', 'actualite', 'rss', '12h', true, '{}'::jsonb, 'Flux d''actualités sur les carrières en animation (pas des offres).'),
  ('waooh-actus', 'Waooh (actualités)', 'https://www.waooh.be/feed/', 'actualite', 'rss', 'quotidien', true, '{}'::jsonb, 'Flux WordPress du studio de Liège.'),
  ('xilam-actus', 'Xilam (actualités)', 'https://xilam.com/feed/', 'actualite', 'rss', 'quotidien', true, '{}'::jsonb, 'Annonces de mise en production (ex. Chickies).'),
  ('ellipse-actus', 'Ellipse Animation (actualités)', 'https://www.ellipseanimation.com/news/feed/', 'actualite', 'rss', 'quotidien', true, '{}'::jsonb, null),
  ('fost-actus', 'FOST (actualités)', 'https://fost.studio/feed/', 'actualite', 'rss', 'quotidien', true, '{}'::jsonb, null),
  ('mist-actus', 'Mist (actualités)', 'https://mist.studio/feed/', 'actualite', 'rss', 'quotidien', true, '{}'::jsonb, null),
  ('caribara-actus', 'Caribara (actualités)', 'https://www.caribara-animation.com/feed/', 'actualite', 'rss', 'quotidien', true, '{}'::jsonb, null),
  ('kavaleer-actus', 'Kavaleer (actualités)', 'https://kavaleer.com/feed/', 'actualite', 'rss', 'quotidien', true, '{}'::jsonb, null),
  ('animationxpress', 'AnimationXpress', 'https://www.animationxpress.com/feed/', 'actualite', 'rss', '12h', true, '{}'::jsonb, null),
  ('c21media', 'C21Media (TV et coproductions)', 'https://www.c21media.net/feed/', 'actualite', 'rss', '12h', true, '{}'::jsonb, 'Presse économique de la fiction TV : annonces de séries et coproductions.'),
  ('indiewire-animation', 'IndieWire (animation)', 'https://www.indiewire.com/c/animation/feed/', 'actualite', 'rss', '12h', true, '{}'::jsonb, null),
  ('fortiche-actus', 'Fortiche (actualités)', 'https://forticheprod.com/feed/', 'actualite', 'rss', 'quotidien', false, '{}'::jsonb, 'Le robots.txt de forticheprod.com interdit /feed/ : non collecté.'),
  ('cnc-animation-2026', 'Aide aux techniques d’animation du CNC, commission 2026', 'https://www.cnc.fr/professionnels/aides-et-financements/resultats-commissions/aide-aux-techniques-danimation--resultats-de-la-commission-en-2026_2585167', 'base-projets', 'cnc', 'hebdo', true, '{}'::jsonb, 'Page de résultats : titre, producteur, format et montant de chaque projet aidé (cnc.fr, robots.txt respecté).'),
  ('cnc-animation-2025-12', 'Aide aux techniques d’animation du CNC, commission du 2 décembre 2025', 'https://www.cnc.fr/professionnels/aides-et-financements/resultats-commissions/aide-aux-techniques-danimation--resultats-de-la-commission-du-2-decembre-2025_2512567', 'base-projets', 'cnc', 'hebdo', true, '{}'::jsonb, 'Page de résultats : titre, producteur, format et montant de chaque projet aidé (cnc.fr, robots.txt respecté).'),
  ('cnc-animation-2025-09', 'Aide aux techniques d’animation du CNC, commission du 17 septembre 2025', 'https://www.cnc.fr/professionnels/aides-et-financements/resultats-commissions/aide-aux-techniques-danimation--resultats-de-la-commission-du-17-septembre-2025_2504716', 'base-projets', 'cnc', 'hebdo', true, '{}'::jsonb, 'Page de résultats : titre, producteur, format et montant de chaque projet aidé (cnc.fr, robots.txt respecté).'),
  ('cnc-animation-2025-06', 'Aide aux techniques d’animation du CNC, commission du 26 juin 2025', 'https://www.cnc.fr/professionnels/aides-et-financements/resultats-commissions/aide-aux-techniques-danimation--resultats-de-la-commission-du-26-juin-2025_2504660', 'base-projets', 'cnc', 'hebdo', true, '{}'::jsonb, 'Page de résultats : titre, producteur, format et montant de chaque projet aidé (cnc.fr, robots.txt respecté).'),
  ('cnc-animation-2025-03', 'Aide aux techniques d’animation du CNC, commission du 25 mars 2025', 'https://www.cnc.fr/professionnels/aides-et-financements/resultats-commissions/aide-aux-techniques-danimation--resultats-de-la-commission-du-25-mars-2025_2419453', 'base-projets', 'cnc', 'hebdo', true, '{}'::jsonb, 'Page de résultats : titre, producteur, format et montant de chaque projet aidé (cnc.fr, robots.txt respecté).'),
  ('gn-fr-series-2d', 'Google Actualités : séries d’animation 2D en production', 'https://news.google.com/rss/search?q=s%C3%A9rie+animation+2D+production&hl=fr&gl=FR&ceid=FR:fr', 'actualite', 'rss', '6h', false, '{}'::jsonb, 'Désactivée : le robots.txt de news.google.com interdit tout (Disallow: /) et ne mentionne pas /rss. En attente d''une décision (voir compte rendu) ; prête à activer. Pour un site bloqué, ajouter « site:domaine » à la requête.'),
  ('gn-fr-longs', 'Google Actualités : longs métrages d’animation en production', 'https://news.google.com/rss/search?q=long+m%C3%A9trage+d%27animation+production+OR+pr%C3%A9production&hl=fr&gl=FR&ceid=FR:fr', 'actualite', 'rss', '6h', false, '{}'::jsonb, 'Désactivée : le robots.txt de news.google.com interdit tout (Disallow: /) et ne mentionne pas /rss. En attente d''une décision (voir compte rendu) ; prête à activer. Pour un site bloqué, ajouter « site:domaine » à la requête.'),
  ('gn-fr-studios', 'Google Actualités : studios d’animation français', 'https://news.google.com/rss/search?q=studio+d%27animation+fran%C3%A7ais+s%C3%A9rie+OR+film&hl=fr&gl=FR&ceid=FR:fr', 'actualite', 'rss', '6h', false, '{}'::jsonb, 'Désactivée : le robots.txt de news.google.com interdit tout (Disallow: /) et ne mentionne pas /rss. En attente d''une décision (voir compte rendu) ; prête à activer. Pour un site bloqué, ajouter « site:domaine » à la requête.'),
  ('gn-fr-decors', 'Google Actualités : décors et animation 2D', 'https://news.google.com/rss/search?q=d%C3%A9cors+%22animation+2D%22&hl=fr&gl=FR&ceid=FR:fr', 'actualite', 'rss', '6h', false, '{}'::jsonb, 'Désactivée : le robots.txt de news.google.com interdit tout (Disallow: /) et ne mentionne pas /rss. En attente d''une décision (voir compte rendu) ; prête à activer. Pour un site bloqué, ajouter « site:domaine » à la requête.'),
  ('gn-fr-cnc', 'Google Actualités : aide du CNC à l’animation', 'https://news.google.com/rss/search?q=CNC+aide+animation+s%C3%A9rie+OR+film+financement&hl=fr&gl=FR&ceid=FR:fr', 'actualite', 'rss', '6h', false, '{}'::jsonb, 'Désactivée : le robots.txt de news.google.com interdit tout (Disallow: /) et ne mentionne pas /rss. En attente d''une décision (voir compte rendu) ; prête à activer. Pour un site bloqué, ajouter « site:domaine » à la requête.'),
  ('gn-en-series', 'Google News : 2D animated series in production', 'https://news.google.com/rss/search?q=2D+animated+series+%22in+production%22+OR+greenlit&hl=en&gl=US&ceid=US:en', 'actualite', 'rss', '6h', false, '{}'::jsonb, 'Désactivée : le robots.txt de news.google.com interdit tout (Disallow: /) et ne mentionne pas /rss. En attente d''une décision (voir compte rendu) ; prête à activer. Pour un site bloqué, ajouter « site:domaine » à la requête.'),
  ('gn-en-features', 'Google News : hand-drawn animated feature in production', 'https://news.google.com/rss/search?q=hand-drawn+animated+feature+production&hl=en&gl=US&ceid=US:en', 'actualite', 'rss', '6h', false, '{}'::jsonb, 'Désactivée : le robots.txt de news.google.com interdit tout (Disallow: /) et ne mentionne pas /rss. En attente d''une décision (voir compte rendu) ; prête à activer. Pour un site bloqué, ajouter « site:domaine » à la requête.'),
  ('gn-en-french', 'Google News : French animation studio series announced', 'https://news.google.com/rss/search?q=French+animation+studio+series+announced+Paris&hl=en&gl=US&ceid=US:en', 'actualite', 'rss', '6h', false, '{}'::jsonb, 'Désactivée : le robots.txt de news.google.com interdit tout (Disallow: /) et ne mentionne pas /rss. En attente d''une décision (voir compte rendu) ; prête à activer. Pour un site bloqué, ajouter « site:domaine » à la requête.'),
  ('productions-connues', 'Productions repérées à la main', 'https://github.com', 'base-projets', 'manuel', 'quotidien', false, '{}'::jsonb, 'Fichier collector/config/productions-connues.json : toujours intégré à la collecte.')
on conflict (id) do nothing;
