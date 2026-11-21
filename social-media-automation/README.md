# 🚀 Social Media Automation Engine

Système d'automatisation et de programmation de publications multi-profils et multi-plateformes (**LinkedIn** & **Facebook**), synchronisé avec **Notion** (*Content Hub*) et gérant une logique de persona stricte.

---

## 📁 Architecture des dossiers

```text
social-media-automation/
├── cli.js                              # Interface en ligne de commande unifiée
├── package.json                        # Scripts npm et métadonnées
├── config/
│   └── default-settings.json           # Fuseaux horaires, endpoints API, quotas de caractères
├── core/
│   ├── rules-engine.js                 # Moteur de règles éditoriales & logique de CTA conditionnel
│   ├── notion-sync.js                  # Synchronisation bidirectionnelle avec Notion
│   ├── publisher.js                    # Moteur de publication automatique & archivage
│   └── local-exporter.js               # Exportateur de posts vers fichiers Markdown locaux
├── platforms/
│   ├── linkedin/
│   │   ├── client.js                   # Client API LinkedIn (Composio / REST API 202610)
│   │   └── formatter.js                # Formatage du texte pour l'algorithme LinkedIn (< 3000 car.)
│   └── facebook/
│       ├── client.js                   # Client API Facebook Graph
│       └── formatter.js                # Formatage du texte pour les pages & feeds Facebook
└── profiles/
    ├── Fasseu-Franck/                  # 👤 Ton profil personnel (Fondateur tech Onixe)
    │   ├── profile.json                # Configuration, persona, règles CTA, créneaux (8h, 12h, 18h)
    │   ├── linkedin/
    │   │   ├── drafts/                 # Brouillons en cours de relecture
    │   │   ├── scheduled/              # 36 posts prêts et programmés (fichiers .md)
    │   │   ├── published/              # Archive des posts publiés avec URLs et IDs
    │   │   └── media/                  # Images, bannières et infographies associées
    │   ├── facebook/
    │   │   ├── drafts/
    │   │   ├── scheduled/              # 36 posts programmés au format Facebook
    │   │   ├── published/
    │   │   └── media/
    │   └── analytics/                  # Rapports d'engagement et statistiques
    │
    ├── Onixe-App/                      # 🏢 Profil de marque officielle Onixe
    │   ├── profile.json
    │   ├── linkedin/
    │   └── facebook/
    │
    └── _template_client/               # ⚡ Modèle prêt à dupliquer pour n'importe quel autre client
        ├── profile.json
        ├── linkedin/
        └── facebook/
```

---

## 🎯 Règle stricte des Call-to-Action (CTA)

Le moteur applique automatiquement la règle demandée par Franck :

1. **Quand la publication parle d'Onixe** (créneaux de 08h00 - Vision EdTech / Produit, et annonce du 30 novembre) :
   - Le CTA intègre obligatoirement le lien vers l'accès anticipé : `https://onixe.app/waitlist` ou `https://onixe.app`.
2. **Quand la publication NE parle PAS d'Onixe** (créneaux de 12h00 - Niche Dev / Antigravity / Google Suite / Architecture, et créneaux de 18h00 - Mindset / Tips Bâtisseur) :
   - **Zéro lien Onixe**.
   - Le CTA se termine par une question ouverte ou binaire adressée aux pairs (développeurs, CTOs, fondateurs) pour maximiser les commentaires et l'engagement naturel.

---

## 💻 Commandes CLI disponibles

Depuis le dossier `social-media-automation` :

### 1. Consulter le statut des publications d'un profil
```bash
node cli.js status --profile Fasseu-Franck
```

### 2. Exporter et régénérer tous les posts en fichiers Markdown locaux
```bash
node cli.js export-local --profile Fasseu-Franck
```

### 3. Auditer la conformité des CTAs de tous les posts programmés
```bash
node cli.js audit-cta --profile Fasseu-Franck
```

### 4. Publier immédiatement les posts arrivés à échéance (ou test à blanc)
```bash
# Test à blanc (affiche ce qui serait publié sans envoyer)
node cli.js publish-due --profile Fasseu-Franck --dry-run

# Publication réelle
node cli.js publish-due --profile Fasseu-Franck
```

### 5. Créer un nouveau profil pour un autre client en 1 seconde
```bash
node cli.js create-client --name Nom-Du-Client
```
*Cette commande duplique automatiquement `_template_client` et configure un nouveau dossier client avec ses sous-dossiers `linkedin` et `facebook`.*

---

## 🔗 Synchronisation Notion

La base de données Notion **Content Hub** (`346fb75f-5244-8082-abd6-ca783b5c4666`) est alignée avec ces fichiers. Les 36 posts y sont présents avec leurs dates de diffusion, leurs hooks, leurs statuts et leurs métadonnées.
