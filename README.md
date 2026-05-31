# 📦 Product Service — Microservice Catalogue

![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-CI/CD-2088FF?logo=github&logoColor=white)
![Trivy](https://img.shields.io/badge/Trivy-security_scan-1904DA?logo=aqua&logoColor=white)
![GHCR](https://img.shields.io/badge/GHCR-registry-24292e?logo=github&logoColor=white)

Microservice de gestion du catalogue produits — partie de l'architecture microservices e-commerce déployée sur **Kubernetes** (Helm) ou **Docker Swarm** (Kong Gateway).

> 💡 **Objectif Portfolio** : Ce service illustre le pipeline CI/CD complet avec GitHub Actions — test → build Docker → scan de vulnérabilités → push GitHub Container Registry → déploiement Helm.

---

## 🗺️ Positionnement dans l'Architecture

```
                Frontend (192.168.56.114)
                        │
                        ▼
┌─────────────────────────────────────────────┐
│  Kubernetes Cluster (192.168.56.111)        │
│  Ingress :30080                             │
│  ├── 🔐 auth-service    :3001               │
│  ├── 📦 product-service :3002  ← Ce service │
│  ├── 🛒 order-service   :3003               │
│  └── ⭐ review-service  :3004               │
└─────────────────────────────────────────────┘
                        │
                        ▼
  MariaDB (192.168.56.115:3306) — ecommerce_db
```

**Rôle de ce service :** Expose le catalogue produits (liste, recherche, filtrage par catégorie, CRUD admin). Service public — pas d'authentification requise pour la lecture.

---

## 📡 Endpoints

| Méthode | Endpoint | Auth | Description |
|---------|----------|:----:|-------------|
| `GET` | `/api/products` | — | Liste tous les produits |
| `GET` | `/api/products/:id` | — | Détails d'un produit |
| `GET` | `/api/products/search?q=...` | — | Recherche fulltext |
| `GET` | `/api/products/category/:cat` | — | Filtrer par catégorie |
| `POST` | `/api/products` | Admin | Créer un produit |
| `PUT` | `/api/products/:id` | Admin | Modifier un produit |
| `DELETE` | `/api/products/:id` | Admin | Supprimer un produit |
| `GET` | `/api/products/health` | — | Liveness probe |
| `GET` | `/api/products/ready` | — | Readiness probe |
| `GET` | `/api/products/metrics` | — | Métriques Prometheus |

---

## 🔄 Pipeline CI/CD (GitHub Actions)

```
                    GitHub Push / Pull Request
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Job 1 : Test API (parallèle)                              │
│  └── npm install + test-api.sh : 10-13 tests endpoints      │
│  └── Dépendance : PostgreSQL 15                             │
├─────────────────────────────────────────────────────────────┤
│  Job 2 : Dependency Scanning (parallèle)                    │
│  └── Trivy FS scan : scanne les vulnérabilités dépendances  │
├─────────────────────────────────────────────────────────────┤
│  Job 3 : Build Docker Image (après tests réussis)          │
│  └── Docker multi-stage : Node 20 Alpine                    │
│  └── Sauvegarde l'image en artefact                         │
├─────────────────────────────────────────────────────────────┤
│  Job 4 : Scan Container (main uniquement)                  │
│  └── Trivy container scan : détecte vulnérabilités critiques│
├─────────────────────────────────────────────────────────────┤
│  Job 5 : Push to GHCR (main uniquement)                    │
│  └── GitHub Container Registry : ghcr.io/...               │
│  └── Tags : commit-sha + latest                            │
└─────────────────────────────────────────────────────────────┘
```

**Fichier CI/CD :**
- `.github/workflows/ci.yml` — Pipeline GitHub Actions complète avec tests, scans de sécurité et déploiement

---

## ⚡ Quick Start

```bash
git clone https://github.com/yaraportfolio/ecommerce-product-service.git
cd ecommerce-product-service
npm install
npm start
# ✅ http://localhost:3002/api/products/health
```

**Avec PostgreSQL (pour les tests) :**
```bash
docker run -d --name postgres-test \
  -e POSTGRES_DB=products_db \
  -e POSTGRES_USER=devops_user \
  -e POSTGRES_PASSWORD=devops_password \
  -p 5432:5432 \
  postgres:15-alpine

npm test
```

---

## ⚙️ Variables d'Environnement

| Variable | Description | Valeur | Requis |
|----------|-------------|--------|--------|
| `PORT` | Port du service | `3002` | ✅ |

| `NODE_ENV` | Environnement | `production` | ❌ |
| `DB_HOST` | IP serveur MariaDB | `192.168.56.115` | ✅ |
| `DB_PORT` | Port MariaDB | `3306` | ✅ |
| `DB_NAME` | Base de données | `ecommerce_db` | ✅ |
| `DB_USER` | Utilisateur BD | `devops_user` | ✅ |
| `DB_PASSWORD` | Mot de passe BD | — | ✅ |
| `JWT_SECRET` | Clé JWT (pour endpoints Admin) | — | ✅ |

---

## 📁 Structure du Projet

```
ecommerce-product-service/
├── src/
│   ├── config/database.js        # Pool de connexions MariaDB
│   ├── middleware/
│   │   ├── authMiddleware.js     # Vérification JWT (routes Admin)
│   │   └── metrics.js            # Collecte métriques Prometheus
│   ├── routes/product.js         # Tous les endpoints produits
│   └── server.js
├── testapi/
│   ├── test-api.sh               # Tests intégration (10-13 tests)
│   ├── data-test-api.sql         # Données de test BD
├── .github/workflows/
│   └── ci.yml                    # Pipeline GitHub Actions
├── Dockerfile
├── package.json
├── package-lock.json
└── .env.example
```

---

## 🚀 Déploiement

### Docker

```bash
# Build local
docker build -t product-service:latest .

# Run avec variables d'environnement
docker run -d \
  --name product-service \
  -p 3002:3002 \
  -e NODE_ENV=production \
  -e DB_HOST=192.168.56.115 \
  -e DB_PORT=3306 \
  -e DB_NAME=ecommerce_db \
  -e DB_USER=devops_user \
  -e DB_PASSWORD=devops_password \
  -e JWT_SECRET=your_secret_min_32_chars \
  product-service:latest
```

### Docker (depuis GitHub Container Registry)

```bash
# Login (remplace TON_GITHUB_TOKEN par un token GitHub)
echo TON_GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Pull image
docker pull ghcr.io/yaraportfolio/product-service:latest

# Run
docker run -d \
  --name product-service \
  -p 3002:3002 \
  -e DB_HOST=192.168.56.115 \
  -e DB_PASSWORD=devops_password \
  -e JWT_SECRET=your_secret_min_32_chars \
  ghcr.io/yaraportfolio/product-service:latest
```

### Kubernetes (via Helm Chart)

```bash
helm upgrade ecommerce-microservices . \
  --reuse-values \
  --set services.productService.image.tag=v3.2
```

---

## 🧪 Tests

```bash
# Health
curl http://localhost:3002/api/products/health

# Liste produits
curl http://localhost:3002/api/products

# Recherche
curl "http://localhost:3002/api/products/search?q=laptop"

# Par catégorie
curl http://localhost:3002/api/products/category/Electronics

# Suite complète
cd testapi && bash test-api.sh
```

---

## 🔗 Projets Liés

| Composant | Repository |
|-----------|------------|
| 🔐 Auth Service | [auth-service](https://github.com/yaraportfolio/ecommerce-auth-service) |
| 🛒 Order Service | [order-service](https://github.com/yaraportfolio/ecommerce-order-service) |
| ⭐ Review Service | [review-service](https://github.com/yaraportfolio/ecommerce-review-service) |
| 📦 Product Service | [product-service](https://github.com/yaraportfolio/ecommerce-product-service) |
| ⎈ Helm Chart | [k8s-helm-chart](https://github.com/yaraportfolio/k8s-helm-chart) |
| 🗄️ Base de données | [ecommerce-database](https://github.com/yaraportfolio/ecommerce-database) |

---

## 👨‍💻 Auteur

**Yara Mahi Mohamed** — Portfolio DevOps & SRE

*⭐ N'oubliez pas de star ce repo si vous le trouvez utile !*
