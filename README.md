# EHS Transport — Architecture Railway

## Structure

```
transport-api/   ← Backend FastAPI Python (logique + données)
transport-front/ ← Frontend React + Nginx (interface)
```

---

## Déploiement

### 1. Backend — transport-api

**Variables d'environnement Railway :**
```
API_KEY=une_cle_secrete_longue
DATA_DIR=/app/data
PORT=8000  (Railway l'injecte automatiquement)
```

**Fichiers Excel à uploader dans Railway :**
Place tes deux fichiers Excel dans un volume Railway monté sur `/app/data` :
- `fichiercone.xlsx`
- `Grille_transport_EHS_2026.xlsx`

Ou colle-les directement dans le repo dans un dossier `data/` (mais alors retire `data/` du `.gitignore`).

**Déploiement :**
```bash
cd transport-api
git init && git add . && git commit -m "init"
# Crée un service Railway, connecte ce repo
```

---

### 2. Frontend — transport-front

**Variables d'environnement Railway :**
```
VITE_API_URL=https://ton-api.railway.app
VITE_API_KEY=une_cle_secrete_longue  (la même que le backend)
```

**Déploiement :**
```bash
cd transport-front
git init && git add . && git commit -m "init"
# Crée un second service Railway dans le même projet, connecte ce repo
```

---

## Test local

```bash
# Backend
cd transport-api
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend (autre terminal)
cd transport-front
npm install
npm run dev
```

Le frontend cherchera l'API sur `http://localhost:8000` par défaut.

---

## Ajouter un client externe plus tard

Pour donner accès à un client, crée une clé API différente et ajoute une route `/api/calcul-client` avec des tarifs spécifiques filtrés par clé.
