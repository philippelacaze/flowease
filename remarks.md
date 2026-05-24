# Remarques architecture / conception

## sendMessage — streaming SSE vs appel simple

**Fichier concerné :** `src/app/infrastructure/ai/anthropic/anthropic.adapter.ts`

**Situation actuelle :** `sendMessage` utilise `fetch` avec `stream: true` et lit le `ReadableStream` token par token via SSE (`content_block_delta`). Angular `HttpClient` ne supporte pas le stream progressif (bufferise la réponse complète), d'où l'usage direct de `fetch`.

**Question ouverte :** Est-ce que l'UX streaming vaut la complexité pour une app mobile de suivi santé ?
- Si les réponses du coach sont courtes (< 200 tokens), la différence perceptible est faible.
- On pourrait simplifier en remplaçant `sendMessage` par un appel `callApi` standard (non-streaming), en supprimant la logique de lecture du `ReadableStream` et l'animation de frappe dans `coach-chat.component.ts`.
- Avantage : suppression du seul `fetch` hors `AnthropicClient`, uniformité totale du code HTTP.
- Inconvénient : perte de l'affichage progressif pour les réponses longues.
