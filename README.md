# Antigravity Agents & Skills

Ce dépôt contient la suite complète des **19 skills officiels d'Anthropic** ([anthropics/skills](https://github.com/anthropics/skills.git)), configurés et installés pour **Google Antigravity**.

---

## 📁 Structure du Projet

```text
Antigravity-Agents/
├── .agents/
│   ├── skills/              # Auto-découverte native par Antigravity
│   └── skills.json          # Déclaration explicite des chemins de compétences
├── skills/                  # Répertoire racine des 19 compétences
│   ├── academy-guide/
│   ├── algorithmic-art/
│   ├── brand-guidelines/
│   ├── canvas-design/
│   ├── claude-api/
│   ├── discernment-nudge/
│   ├── doc-coauthoring/
│   ├── docx/
│   ├── frontend-design/
│   ├── internal-comms/
│   ├── mcp-builder/
│   ├── pdf/
│   ├── pptx/
│   ├── skill-creator/
│   ├── slack-gif-creator/
│   ├── theme-factory/
│   ├── web-artifacts-builder/
│   ├── webapp-testing/
│   └── xlsx/
├── spec/                    # Spécification Agent Skills (agentskills.io)
├── template/                # Modèle de création de nouvelle compétence
├── README.md                # Ce document
└── THIRD_PARTY_NOTICES.md   # Mentions légales & licences tierces
```

---

## 🛠️ Emplacements d'Installation dans Antigravity

Les compétences sont déployées aux deux niveaux d'Antigravity :

1. **Workspace Local (`Antigravity-Agents`)** :
   - `d:/GitHub/Antigravity-Agents/.agents/skills/` (détection native prioritaire)
   - `d:/GitHub/Antigravity-Agents/skills/` (avec configuration dans `.agents/skills.json`)

2. **Global Machine (`~/.gemini/config/`)** :
   - **Plugin Antigravity** : `C:/Users/HP/.gemini/config/plugins/anthropic-skills/`
   - **Skills globaux** : `C:/Users/HP/.gemini/config/skills/`
   - Permet d'utiliser l'ensemble de ces compétences dans **n'importe quel autre projet ou session** Antigravity.

---

## 📚 Liste des 19 Compétences Installées

### 1. Suite Bureautique & Documents (Production)
| Skill | Description | Déclencheurs fréquents |
|---|---|---|
| **docx** | Création, manipulation et conversion de documents Word (.docx, .dotx). Gestion des styles, en-têtes, tables des matières et révisions. | `word`, `.docx`, `rapport Word`, `mise en page docx` |
| **xlsx** | Audit, formules de calcul, création et analyse de feuilles Excel (.xlsx, .csv). | `excel`, `.xlsx`, `tableau de calcul`, `audit formule` |
| **pptx** | Création de présentations PowerPoint professionnelles, choix de thèmes et typographie. | `powerpoint`, `.pptx`, `diapositives`, `slides` |
| **pdf** | Traitement, extraction de texte/images, formulaires interactifs et découpage de documents PDF. | `pdf`, `.pdf`, `extraire texte pdf`, `formulaire pdf` |

### 2. Design, Graphisme & Interface Frontend
| Skill | Description |
|---|---|
| **frontend-design** | Directives de design d'interface moderne, typographie soignée et identité visuelle distinctive (évite les rendus génériques). |
| **canvas-design** | Création d'illustrations et compositions graphiques vectorielles/bitmap via l'API Canvas HTML5/Node.js avec export PNG/PDF. |
| **algorithmic-art** | Génération d'art algorithmique et procédural avec p5.js et graines pseudo-aléatoires (seeded randomness). |
| **theme-factory** | Palette de couleurs cohérentes et thèmes pour styliser les applications et composants web. |
| **brand-guidelines** | Directives de marque, palettes de couleurs officielles et typographies Anthropic. |
| **slack-gif-creator** | Création et optimisation de GIF animés adaptés à la messagerie Slack. |

### 3. Développement, Tests & MCP (Model Context Protocol)
| Skill | Description |
|---|---|
| **mcp-builder** | Guide complet pour architecturer, implémenter et tester des serveurs MCP personnalisés. |
| **webapp-testing** | Boîte à outils pour interagir avec et tester des applications web locales via des scripts automatisés. |
| **web-artifacts-builder** | Conception d'artefacts web interactifs et composants React / Tailwind / shadcn. |
| **claude-api** | Documentation technique et guides d'intégration pour les API et SDK Claude. |

### 4. Rédaction, Méthodologie & Méta-Skills
| Skill | Description |
|---|---|
| **linkedin-fasseu-franck** | Rédaction et optimisation de posts LinkedIn authentiques et percutants dans le ton de conversation de Franck Fasseu (fondateur Onixe). |
| **skill-creator** | Outils pour concevoir, benchmarker, évaluer et affiner de nouvelles compétences pour agents IA. |
| **doc-coauthoring** | Workflow collaboratif et progressif pour la co-rédaction de documentation technique et de spécifications. |
| **internal-comms** | Guide de rédaction pour communications internes d'entreprise : mémos, annonces, bilans d'incident (post-mortems). |
| **academy-guide** | Recommandations de cours et de tutoriels d'apprentissage pour les agents. |
| **discernment-nudge** | Questions réflexives de suivi pour éprouver le raisonnement critique, valider les sources et vérifier la cohérence. |

---

## 🚀 Utilisation dans Antigravity

Grâce au système de **progressive disclosure** d'Antigravity :
- Les compétences sont indexées automatiquement par leur nom et description.
- Antigravity active automatiquement la compétence pertinente dès que votre demande correspond à son périmètre (par exemple, *"Génère un rapport Word .docx avec table des matières"* activera la compétence `docx`).
- Vous pouvez également invoquer explicitement une compétence en la nommant dans votre invite (ex. *"Utilise le skill frontend-design pour concevoir la page d'accueil"*).
