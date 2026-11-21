# 🚀 LinkedIn Automation MCP Server

Serveur MCP (Model Context Protocol) haute performance pour l'**automatisation complète des publications LinkedIn** (création immédiate, planification différée via file d'attente locale, carrousels PDF, images, premier commentaire automatique, audit de hook et analytics).

Conforme aux spécifications du **SDK TypeScript MCP v2** (`@modelcontextprotocol/server`) et compatible avec **Google Antigravity**, **Claude Desktop**, **Cursor** et tout client MCP.

---

## 🌟 Fonctionnalités Principales

- **Publication immédiate** (`linkedin_create_post`) : Texte enrichi, conversion automatique Markdown vers caractères Unicode (gras 𝗯𝗼𝗹𝗱, italique 𝘪𝘵𝘢𝘭𝘪𝘤), liens avec carte d'aperçu, images et carrousels.
- **Stratégie Premier Commentaire** : Publication automatique d'un premier commentaire sous votre post (idéal pour placer des liens sans subir la pénalité d'algorithme LinkedIn sur les posts avec liens externes).
- **Moteur de Planification Local** (`linkedin_schedule_post`, `linkedin_publish_due_posts`) : Planifiez des publications à l'avance dans une file d'attente persistante (`linkedin-queue.json`), sans dépendre d'un service tiers payant.
- **Upload de Médias** (`linkedin_upload_image`, `linkedin_upload_document`) :
  - Images (`.png`, `.jpg`, `.webp`, `.gif`) depuis chemin local ou URL web.
  - Carrousels / PDF multi-pages natifs pour LinkedIn (`.pdf`).
- **Audit & Optimisation Copywriting** (`linkedin_format_post`) :
  - Détection du seuil d'accroche avant le bouton *"...voir plus"* (210 caractères).
  - Contrôle de la limite des 3 000 caractères.
  - Audit du nombre de hashtags (recommandation 3 à 5 hashtags pour maximiser la portée).
  - Détection d'appel à l'action (Call-to-Action).
- **Analytics & Statistiques** (`linkedin_get_post_analytics`) : Réactions, commentaires, partages.
- **Gestion des Profils & Pages Entreprise** (`linkedin_get_profile`) : Découverte automatique de votre URN personnel (`urn:li:person:...`) et des pages entreprises administrées (`urn:li:organization:...`).

---

## 🛠️ Configuration & Prérequis

### 1. Variables d'Environnement

Créez un fichier `.env` à la racine de `linkedin-mcp-server/` ou injectez ces variables dans votre configuration MCP :

| Variable | Requis | Description |
|---|---|---|
| `LINKEDIN_ACCESS_TOKEN` | **Oui** (pour les appels API LinkedIn) | Jeton d'accès OAuth 2.0 LinkedIn avec les scopes nécessaires. |
| `LINKEDIN_AUTHOR_URN` | Optionnel | URN par défaut de l'auteur (`urn:li:person:xyz` ou `urn:li:organization:123`). Détecté automatiquement si omis. |
| `LINKEDIN_API_VERSION` | Optionnel | Version REST de LinkedIn (par défaut: `202401`). |
| `LINKEDIN_QUEUE_FILE` | Optionnel | Fichier JSON de persistance de la file de planification (par défaut: `./linkedin-queue.json`). |
| `TRANSPORT` | Optionnel | `stdio` (par défaut) ou `http`. |
| `PORT` | Optionnel | Port d'écoute en mode HTTP (par défaut: `3000`). |

### 2. Permissions LinkedIn requises (OAuth Scopes)

Votre application LinkedIn Developer doit disposer des produits suivants :
- **Share on LinkedIn** : octroie le scope `w_member_social`.
- **Sign In with LinkedIn using OpenID Connect** : octroie les scopes `openid`, `profile`, `email`.
- *(Optionnel pour les pages entreprises)* : **Community Management API** pour `w_organization_social` et `r_organization_social`.

---

## 📦 Installation & Compilation

```bash
cd linkedin-mcp-server
npm install
npm run build
```

Pour vérifier le bon fonctionnement :
```bash
npm run smoke
```

---

## 🔧 Intégration dans Google Antigravity

Ajoutez le serveur dans votre fichier de configuration global Antigravity (`~/.gemini/config/mcp_config.json`) ou au niveau du projet :

```json
{
  "mcpServers": {
    "linkedin": {
      "command": "node",
      "args": ["d:/GitHub/Antigravity-Agents/linkedin-mcp-server/dist/index.js"],
      "env": {
        "LINKEDIN_ACCESS_TOKEN": "VOTRE_JETON_OAUTH_LINKEDIN",
        "LINKEDIN_QUEUE_FILE": "d:/GitHub/Antigravity-Agents/linkedin-mcp-server/linkedin-queue.json"
      }
    }
  }
}
```

---

## 💻 Intégration dans Claude Desktop

Dans votre fichier `claude_desktop_config.json` :

```json
{
  "mcpServers": {
    "linkedin": {
      "command": "node",
      "args": [
        "d:\\GitHub\\Antigravity-Agents\\linkedin-mcp-server\\dist\\index.js"
      ],
      "env": {
        "LINKEDIN_ACCESS_TOKEN": "VOTRE_JETON_OAUTH_LINKEDIN"
      }
    }
  }
}
```

---

## 📚 Référence des Outils (14 Outils)

### Publications
1. **`linkedin_create_post`** : Publie immédiatement un post (texte, image, carrousel, lien, premier commentaire).
2. **`linkedin_get_post`** : Récupère les données d'un post par son URN.
3. **`linkedin_delete_post`** : Supprime un post sur LinkedIn.
4. **`linkedin_list_posts`** : Liste les derniers posts publiés par le profil ou la page entreprise.

### Planification & Automatisation
5. **`linkedin_schedule_post`** : Enregistre un post dans la file d'attente pour publication à une date/heure précise (ISO 8601).
6. **`linkedin_list_scheduled_posts`** : Liste les posts en attente, publiés ou échoués.
7. **`linkedin_cancel_scheduled_post`** : Annule une publication planifiée par son identifiant de tâche.
8. **`linkedin_publish_due_posts`** : Scanne la file d'attente et publie immédiatement tous les posts dont l'échéance est atteinte (déclenchable via tâche planifiée ou cron Antigravity).

### Médias & Documents
9. **`linkedin_upload_image`** : Télécharge une image locale ou depuis une URL et renvoie un URN `urn:li:image:...`.
10. **`linkedin_upload_document`** : Télécharge un PDF multi-pages et renvoie un URN de carrousel `urn:li:document:...`.

### Optimisation & Copywriting
11. **`linkedin_format_post`** : Audit complet du post (accroche, 210 caractères avant fold, hashtags, CTA, conversion Markdown vers gras/italique Unicode).

### Engagement & Profil
12. **`linkedin_add_comment`** : Ajoute un commentaire sous n'importe quel post.
13. **`linkedin_get_post_analytics`** : Récupère les métriques d'engagement (likes, commentaires, partages).
14. **`linkedin_get_profile`** : Récupère l'identité du profil connecté et les pages entreprise accessibles.

---

## 🗂️ Ressources & Prompts MCP

### Ressources
- `linkedin://profile` : Données du compte et des pages administrées.
- `linkedin://queue` : État de la file d'attente des posts programmés.
- `linkedin://status` : État de configuration du serveur MCP.

### Prompts
- **`draft_linkedin_post`** : Modèle guidé pour concevoir un post LinkedIn à fort impact respectant les meilleures pratiques de rétention.
- **`schedule_weekly_calendar`** : Générateur de calendrier éditorial hebdomadaire prêt à planifier.
