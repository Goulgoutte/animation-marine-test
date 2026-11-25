# Veille animation

Veille emploi et suivi de candidatures (CRM) pour une décoratrice 2D en animation. Interface en français, pensée mobile d’abord, une seule utilisatrice. Hébergement entièrement gratuit : GitHub (Actions + Pages) et Supabase.

## Architecture

```
collector/            collecte (Node/TypeScript), lancée par GitHub Actions 2 fois par jour
  config/             sources et mots-clés (versionnés)
shared/types.ts       contrat de données entre la collecte et le site
web/                  site Next.js en export statique (web/out), publié sur GitHub Pages
  public/data/        offres.json, productions.json, sources.json (écrits par la collecte, commités)
  src/fixtures/       données d’exemple, utilisées si public/data est absent
supabase/schema.sql   tables personnelles + sécurité par utilisateur (RLS)
.github/workflows/    collect (collecte) et deploy (build + Pages)
```

- Offres, productions et santé des sources viennent des JSON commités par la collecte.
- Candidatures, relances, contacts, échanges, offres/productions ajoutées ou corrigées à la main, masquages et réglages vivent dans Supabase (chaque ligne appartient à son utilisateur).
- Sans Supabase configuré, le site passe en **mode démo** : bandeau « Mode démo », données dans le `localStorage` du navigateur.

## Mise en place de Supabase

1. Créer un projet gratuit sur supabase.com.
2. SQL Editor : coller le contenu de `supabase/schema.sql` et l’exécuter (le script peut être relancé sans risque).
3. Authentication > Providers : activer **Email** (lien magique ; les mots de passe ne servent pas).
4. Authentication > URL Configuration :
   - Site URL : `https://<utilisateur>.github.io/<nom-du-dépôt>/`
   - Redirect URLs : la même adresse, plus `http://localhost:3000/` pour le développement.
5. Pour réserver l’app à une seule personne : Authentication > Providers > Email, désactiver « Allow new users to sign up » après la première connexion.
6. Project Settings > API : noter l’**URL** du projet et la clé **anon** (publique, protégée par la RLS).

## Variables GitHub

Dépôt > Settings > Secrets and variables > Actions > onglet **Variables** (ce sont des valeurs publiques) :

| Variable | Valeur |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clé anon |

Le workflow `deploy` calcule tout seul `NEXT_PUBLIC_BASE_PATH` (`/<nom-du-dépôt>`) et `NEXT_PUBLIC_REPO_URL`.

## Activer GitHub Pages

Settings > Pages > Source : **GitHub Actions**. Le workflow `deploy.yml` publie à chaque push sur `main` et après chaque exécution réussie du workflow `Collecte`.

## Lancer en local

```bash
cd web
pnpm install
pnpm dev          # http://localhost:3000
```

Sans fichier `.env.local`, le site tourne en mode démo. Pour utiliser Supabase en local, copier `web/.env.example` en `web/.env.local` et le remplir.

Build statique :

```bash
pnpm build        # produit web/out
NEXT_PUBLIC_BASE_PATH=/mon-depot pnpm build   # comme sur GitHub Pages
```

## Connexion Gmail

Les brouillons et envois de mails passent par l'API Gmail, appelée directement depuis le navigateur. La connexion à l'app ne change pas : « Connecter Gmail » (Réglages > Compte, ou la fenêtre « Préparer le mail ») relance la connexion Google avec le droit supplémentaire `gmail.compose` (créer des brouillons et envoyer ; aucune lecture de la boîte).

Configuration côté Google Cloud (le projet qui porte l'identifiant OAuth utilisé par Supabase) :

1. **API et services > Bibliothèque** : activer l'**API Gmail**.
2. **Écran de consentement OAuth > Accès aux données** (Data Access) : ajouter le scope `https://www.googleapis.com/auth/gmail.compose`.
3. **Écran de consentement OAuth > Audience** : tant que l'app est en mode « Test », ajouter l'adresse Gmail de l'utilisatrice dans **Utilisateurs de test**.
4. Côté Supabase, rien à changer : le provider Google est déjà actif. Vérifier que la page courante (Candidatures, Contacts, Réglages) figure dans Authentication > URL Configuration > Redirect URLs, par exemple `https://<utilisateur>.github.io/<dépôt>/**`.

À savoir :

- `gmail.compose` est un scope « sensible » : tant que l'app n'est pas vérifiée par Google, l'écran de consentement affiche l'avertissement « Google n'a pas validé cette application » (Paramètres avancés > Accéder à … (non sécurisé)). Pour un usage personnel, rester en mode Test avec soi-même comme utilisateur de test suffit, sans vérification. En mode Test, l'autorisation expire au bout de 7 jours : il suffit de reconnecter Gmail.
- Le jeton d'accès Google dure environ **1 heure** et Supabase ne le rafraîchit pas. Il est gardé en mémoire et dans `sessionStorage` (jamais en base). Passé ce délai, ou sur une réponse 401 de Google, l'app affiche « Reconnecter Gmail ».
- Le profil d'envoi (prénom, signature, liens du portfolio et du CV) se règle dans Réglages > Compte ; les modèles de mail dans Réglages > Modèles de mail. L'adresse d'envoi affichée n'est prise en compte par Gmail que si c'est l'adresse du compte ou un alias vérifié.
- Mode démo : aucun appel à Google, les boutons simulent la création et l'envoi (« Mode démo : aucun mail réel »).
- Base de données : exécuter `supabase/migrations/005_mail.sql` sur un projet existant (idempotent).

## Ajouter une source

Les sources et mots-clés sont dans `collector/config/` (voir les fichiers présents pour le format). Modifier le fichier sur GitHub (le lien est dans Réglages), commiter : la prochaine collecte la prend en compte. La page Réglages affiche ensuite sa santé : vert (réussie depuis moins de 2 jours), orange (erreur, 0 résultat ou ancienne), rouge (rien depuis plus de 7 jours), gris (inactive ou manuelle).

LinkedIn et Instagram ne sont jamais collectés : utiliser « + Offre » / « + Production » dans la Veille.

## Collecte manuelle

Onglet **Actions** du dépôt > workflow **Collecte** > *Run workflow*. Le workflow `deploy` se lance ensuite tout seul. En local : voir le README ou le `package.json` de `collector/`.

## Notes

- Les jours ouvrés excluent samedi et dimanche, pas les jours fériés.
- « Nouveau » = apparu depuis la visite précédente (une visite = une session du navigateur).
- Sauvegarde : Réglages > « Télécharger la sauvegarde » (JSON complet). Exports CSV des trois pages au même endroit.
