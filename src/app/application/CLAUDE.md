# Règles couche Application

Tu travailles dans la couche Application de FlowEase.

## Imports autorisés
- Depuis domain/ uniquement
- @angular/core pour @Injectable et @Inject
- Tokens depuis application/tokens.ts

## Imports interdits
- Rien de infrastructure/ (pas d'AnthropicAdapter, pas d'IndexedDBAdapter)
- Pas de HttpClient, pas de idb
- Pas de composants Angular

## Pattern use case standard
```typescript
@Injectable({ providedIn: 'root' })
export class MonUseCase {
  constructor(
    @Inject(MON_PORT_TOKEN) private readonly port: MonPort
  ) {}

  async execute(input: MonInput): Promise<MonOutput> {
    // logique métier
  }
}
```

## Pattern use case avec IA
```typescript
async execute(input: string): Promise<ResultatVO[]> {
  const result = await this.aiPort.analyser(input);
  return result ?? []; // mode dégradé — jamais throw
}
```

## Règle des tokens d'injection
Toujours utiliser les InjectionToken de application/tokens.ts.
Jamais injecter une classe concrète d'infrastructure/.

## Un use case = une responsabilité
Si tu te retrouves à faire deux choses dans execute(),
c'est deux use cases différents.
