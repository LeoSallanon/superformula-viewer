# Superformula Viewer

Web app React + TypeScript (Vite) pour explorer la superformule en plein écran, avec design sombre éditorial et contrôles synchronisés.

## Lancer en local

```bash
npm install
npm run dev
```

## Build de production

```bash
npm run build
npm run preview
```

## Déploiement GitHub Pages

1. Pousser sur la branche `main`.
2. Ouvrir **Settings → Pages → Source** et sélectionner **GitHub Actions**.
3. Le workflow `.github/workflows/deploy-pages.yml` construit puis publie automatiquement le dossier `dist`.

> `vite.config.ts` utilise `base: '/superformula-viewer/'` pour un déploiement en sous-chemin de repository projet.

## Dépannage “page blanche”

Si vous avez une page blanche sur `https://<user>.github.io/superformula-viewer/`, la cause la plus fréquente est une mauvaise source Pages :

- ❌ `Deploy from a branch` (main / root)
- ✅ `GitHub Actions`

Le repository contient du TypeScript source (`/src/main.tsx`) : il doit être compilé par le workflow avant publication.
