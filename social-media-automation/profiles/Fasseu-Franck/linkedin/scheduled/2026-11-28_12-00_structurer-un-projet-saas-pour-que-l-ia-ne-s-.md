---
title: "Structurer un projet SaaS pour que l'IA ne s'y perde jamais"
day: "2026-11-28"
time: "12:00"
date: "2026-11-28T12:00:00+01:00"
platform: "LinkedIn"
theme: "Dev Niche / AI Builder"
category: "Positionnement"
status: "Idée"
priority: "Haute"
isAboutProduct: false
tags: "Dev, CleanArchitecture, SaaS, TypeScript, Antigravity, BestPractices"
cta: "Vous appliquez la Clean Architecture sur vos projets SaaS ?"
---

# Structurer un projet SaaS pour que l'IA ne s'y perde jamais

Si votre assistant IA génère du code incohérent, le problème ne vient pas du modèle. Il vient de l'arborescence de vos dossiers.

Quand on fait intervenir des agents de code comme Antigravity sur une base de code conséquente, la clarté de la structure est la clé absolue.

Si votre logique métier est éparpillée entre des composants d'interface, des server actions anonymes et des utilitaires fourre-tout, aucun LLM ne pourra deviner vos intentions.

Voici la règle d'or d'architecture appliquée sur Onixe :

1. Le domaine métier est strictement isolé dans un dossier '/core', indépendant de tout framework web.
2. Chaque entité possède son schéma Zod, ses types TypeScript stricts et ses fonctions pures associées.
3. Les couches d'accès aux données (Prisma/Postgres) et les routes d'API ne font que consommer ces briques sans jamais redéfinir la logique.

Grâce à cette séparation étanche, quand je demande à un agent d'implémenter une nouvelle règle d'évaluation, il lui suffit de lire le module de domaine pour comprendre exactement ce qu'il doit produire.

Zéro hallucination. Des PRs propres du premier coup.

Comment est structurée votre codebase pour faciliter le travail avec l'IA ?

Vous appliquez la Clean Architecture sur vos projets SaaS ?
