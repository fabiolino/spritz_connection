# Spritz Connection — PWA

Feed d'événements, fiche détaillée, inscription avec paiement SumUp, chat par
événement en temps réel, espace admin pour valider les co-organisateurs.

## 1. Installer et lancer en local
```
npm install
npm run dev
```
Fonctionne tout de suite avec des données de démo.

## 2. Supabase — déjà configuré
`supabase-schema.sql` a déjà été exécuté sur ton projet. Renseigne
`VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans `.env`.

## 3. SumUp — déjà configuré
Renseigne `SUMUP_API_KEY` et `SUMUP_MERCHANT_CODE` dans `.env` (et dans les
variables d'environnement Vercel — jamais dans le code front).

## 4. Déployer sur Vercel
1. Pousse ce dossier sur un repo GitHub.
2. Sur vercel.com → "Add New" → "Project" → sélectionne le repo.
3. Settings > Environment Variables → ajoute `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY`, `SUMUP_API_KEY`, `SUMUP_MERCHANT_CODE`,
   `PUBLIC_APP_URL` (à compléter avec l'URL Vercel après le premier déploiement).
4. Deploy. La fonction `api/create-sumup-checkout.js` est détectée
   automatiquement comme endpoint serverless.

Une fois déployée, "Ajouter à l'écran d'accueil" installe l'app sur mobile
sans passer par les stores.

## Ce qu'il reste à connecter
- Authentification utilisateur (les pages tournent sur données de démo tant
  qu'aucune session Supabase n'existe)
- Webhook SumUp pour confirmer le paiement côté serveur de façon fiable
- CGV / mentions légales / conformité RGPD
