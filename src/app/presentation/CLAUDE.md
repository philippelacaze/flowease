# Règles couche Presentation

Tu travailles dans la couche Presentation de FlowEase.

## Imports autorisés
- Depuis application/ (use cases uniquement)
- Depuis domain/ (entités et types pour les templates)
- Angular Material, Angular CDK
- @angular/core, @angular/router, @angular/forms

## Imports interdits
- Rien de infrastructure/ (pas d'AnthropicAdapter, pas d'IndexedDBAdapter)
- Pas d'appels HTTP directs
- Pas d'accès direct à localStorage ou IndexedDB

## Pattern composant standalone
```typescript
@Component({
  selector: 'app-mon-composant',
  standalone: true,
  imports: [/* Material + shared components */],
  templateUrl: './mon-composant.component.html',
})
export class MonComposant {
  constructor(private readonly monUseCase: MonUseCase) {}
}
```

## Accessibilité — obligatoire
- aria-label sur tout élément interactif sans texte visible
- data-testid sur tout élément ciblé par un test E2E
- Zones tappables min 44×44px (padding si nécessaire)
- Feedback visuel immédiat après chaque action utilisateur

## Mode dégradé IA — pattern UI
```typescript
protected aiUnavailable = false;

async onAction(): Promise<void> {
  const result = await this.useCase.execute(input);
  this.aiUnavailable = result.length === 0;
  // ne jamais bloquer la saisie si IA indisponible
}
```

```html
<div *ngIf="aiUnavailable"
     data-testid="ai-unavailable"
     role="status">
  Analyse IA indisponible — saisie manuelle possible
</div>
```

## Offline — pattern UI
```typescript
protected isOnline = navigator.onLine;

ngOnInit() {
  window.addEventListener('online',  () => this.isOnline = true);
  window.addEventListener('offline', () => this.isOnline = false);
}
```

## Règle FAB et boutons d'action principale
Le chemin le plus court vers l'action principale = 1 tap.
Pas de confirmation pour les actions réversibles.
Confirmation en 2 étapes uniquement pour les destructions de données.
