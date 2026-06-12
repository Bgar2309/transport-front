# ⚠️ Repo migré — voir `transport-api`

Ce dépôt a été fusionné dans le monorepo
[`bgar2309/transport-api`](https://github.com/bgar2309/transport-api)
(dossier `frontend/`), avec historique git préservé.

Le front et l'API sont désormais buildés et déployés ensemble en **un seul
service Railway** (le backend FastAPI sert le front buildé).

À faire une fois la migration en production :
1. Supprimer le service Railway `transport-front` (et ses variables `VITE_*`).
2. Archiver ce dépôt GitHub (Settings → Archive this repository).

Tout développement futur se fait dans `transport-api`.
