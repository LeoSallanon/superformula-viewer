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
2. Vérifier que **Settings → Pages → Source** est configuré sur **GitHub Actions**.
3. Le workflow `.github/workflows/deploy-pages.yml` construit puis publie automatiquement le dossier `dist`.

> `vite.config.ts` utilise `base: '/superformula-viewer/'` pour un déploiement en sous-chemin de repository projet.
