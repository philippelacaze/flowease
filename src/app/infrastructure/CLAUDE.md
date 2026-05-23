# Règles couche Infrastructure

Tu travailles dans la couche Infrastructure de FlowEase.

## Rôle
Implémenter les interfaces définies dans domain/repositories/.
C'est la seule couche autorisée à toucher IndexedDB, localStorage, l'API Anthropic.

## Imports autorisés
- Depuis domain/ (interfaces à implémenter)
- Librairies externes : idb, jsPDF, HttpClient
- @angular/core pour @Injectable

## Imports interdits
- Rien de application/ (pas de use cases)
- Rien de presentation/ (pas de composants)

## Pattern adapter storage
```typescript
@Injectable({ providedIn: 'root' })
export class MonAdapter implements MonRepository {
  // implémentation concrète
}
```

## Pattern adapter IA — règles sécurité
```typescript
async maMethode(input: string): Promise<ResultatVO | null> {
  const apiKey = this.settings.getApiKey();
  if (!apiKey) return null;           // pas de clé → null, pas d'erreur

  try {
    const response = await firstValueFrom(this.http.post(...));
    return this.parseResponse(response);
  } catch {
    return null;                      // erreur réseau → null, jamais throw
  }
}

private parseResponse(response: unknown): ResultatVO[] {
  try {
    return JSON.parse(...);
  } catch {
    return [];                        // JSON invalide → vide, jamais throw
  }
}
```

## Clé API — règles absolues
- Lue via LocalSettingsAdapter.getApiKey() à chaque appel
- Jamais stockée en propriété de classe
- Jamais loguée (console, Sentry, erreurs)
- Jamais dans les messages d'erreur

## NullAIAdapter
Si tu ajoutes une méthode à un port IA,
tu DOIS l'ajouter aussi dans infrastructure/ai/null/null-ai.adapter.ts.
