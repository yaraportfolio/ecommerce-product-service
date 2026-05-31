# 📦 Product Service — Microservice Catalogue

![Node.js](https://img.shields.io/badge/Node.js-18-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)
![Prometheus](https://img.shields.io/badge/Prometheus-metrics-E6522C?logo=prometheus&logoColor=white)
![Trivy](https://img.shields.io/badge/Trivy-security_scan-1904DA?logo=aqua&logoColor=white)
![Version](https://img.shields.io/badge/version-3.2-blue)

Microservice de gestion du catalogue produits — partie de l'architecture microservices e-commerce déployée sur **Kubernetes** (Helm) ou **Docker Swarm** (Kong Gateway).

> 💡 **Objectif Portfolio** : Ce service illustre le pipeline CI/CD complet — test → build Docker multi-stage → scan Trivy → push Harbor/Docker Hub → déploiement Helm.

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

## 🔄 Pipeline CI/CD

```
                        GitLab Push / PR
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Stage 1 — Test                                             │
│  └── test-api.sh : 10-13 tests endpoints API                │
├─────────────────────────────────────────────────────────────┤
│  Stage 2 — Build                                            │
│  └── Docker multi-stage : Node 18 → Node 18 Alpine (~80MB) │
├─────────────────────────────────────────────────────────────┤
│  Stage 3 — Security Scan                                    │
│  ├── security-scan.sh    : Trivy CVE scan                   │
│  └── git-security-scan.sh: Détection secrets dans le code   │
├─────────────────────────────────────────────────────────────┤
│  Stage 4 — Push                                             │
│  ├── Harbor   : harbor.myvbox.com/ecommerce/product-service  │
│  └── DockerHub: yaramahi/product-service:v3.2               │
└─────────────────────────────────────────────────────────────┘
```

<details>
  <summary><strong>🦊⚙️ Afficher l'Architecture du Pipeline CI/CD (Gitlab)</strong></summary>

![Pipeline CI/CD](https://gitlab.com/yara_portfolio/devops/ecommerce/ecommerce-frontend/-/raw/main/.img/Pipeline-CICD-GitLab.png)

</details>

**Fichiers CI/CD :**
- `.gitlab-ci.yml` — Pipeline GitLab
- `Jenkinsfile-ci` — Pipeline Jenkins (stages: Test → Build → Scan → Push)
- `Jenkins Harbor Guide` — Guide setup Jenkins + Harbor

---

## ⚡ Quick Start

```bash
git clone https://gitlab.com/yara_portfolio/devops/ecommerce/microservice/product-service.git
cd product-service
cp .env.example .env && nano .env

npm install && npm start
# ✅ http://localhost:3002/api/products/health
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
product-service/
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
│   ├── security-scan.sh          # Scan CVE Trivy
│   └── git-security-scan.sh      # Détection secrets
├── Dockerfile
├── Jenkinsfile-ci
├── .gitlab-ci.yml
└── .env.example
```

---

## 🚀 Déploiement

### Docker

```bash
docker build -t product-service:v3.2 .

docker run -d \
  --name product-service \
  -p 3002:3002 \
  -e DB_HOST=192.168.56.115 \
  -e DB_PASSWORD=devops_password \
  -e JWT_SECRET=your_secret_min_32_chars \
  product-service:v3.2
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
| 🔐 Auth Service | [auth-service](https://gitlab.com/yara_portfolio/devops/ecommerce/microservice/auth-service) |
| 🛒 Order Service | [order-service](https://gitlab.com/yara_portfolio/devops/ecommerce/microservice/order-service) |
| ⭐ Review Service | [review-service](https://gitlab.com/yara_portfolio/devops/ecommerce/microservice/review-service) |
| ⎈ Helm Chart | [k8s-helm-chart](https://gitlab.com/yara_portfolio/devops/ecommerce/devops-tools/k8s-helm-chart) |
| 🗄️ Base de données | [ecommerce-database](https://gitlab.com/yara_portfolio/devops/ecommerce/ecommerce-database) |

---

## 👨‍💻 Auteur

**Yara Mahi Mohamed** — Portfolio DevOps & SRE

*⭐ N'oubliez pas de star ce repo si vous le trouvez utile !*
