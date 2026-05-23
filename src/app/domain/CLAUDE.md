# Règles couche Domain

Tu travailles dans la couche Domain de FlowEase.

## Règle absolue
ZÉRO import externe dans ce dossier.
Pas de @Injectable, pas de HttpClient, pas de idb, pas de RxJS.
Uniquement du TypeScript pur.

## Ce qu'on crée ici
- Interfaces readonly (jamais de classes)
- Types union et enums TypeScript
- Fonctions pures (value objects)
- Interfaces de ports (repositories)

## Pattern entité
```typescript
export interface NomEntity {
  readonly id: string;          // UUID v4
  readonly timestamp: Date;     // horodatage saisie
  // ... autres champs readonly
}
```

## Pattern value object
```typescript
export type MonType = 'valeur1' | 'valeur2';

export function maFonctionPure(val: MonType): boolean {
  // logique pure, pas d'effet de bord
}
```

## Pattern port IA
```typescript
export interface MonPort {
  maMethode(input: string): Promise<ResultatVO | null>;
  // null = IA indisponible — jamais throw
}
```

## JSDoc minimum
Chaque interface exportée doit avoir :
- Une description courte
- @remarks expliquant son rôle dans l'architecture
