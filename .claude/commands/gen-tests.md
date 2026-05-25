# /gen-tests

Génère les tests Vitest pour le fichier fourni en argument,
selon les conventions de test FlowEase.

## Instructions

Lis le fichier cible, identifie sa couche (domain/application/infrastructure/presentation),
puis génère le fichier .spec.ts correspondant selon le template de sa couche.

---

## Template Domain (value objects / fonctions pures)

```typescript
// NOM.vo.spec.ts
import { describe, it, expect } from 'vitest';
import { maFonction } from './nom.vo';

describe('NomVO', () => {
  describe('maFonction', () => {
    it('comportement attendu pour le cas nominal', () => {
      expect(maFonction('valeur')).toBe(true);
    });

    it('comportement attendu pour le cas limite', () => {
      expect(maFonction('autre')).toBe(false);
    });
  });
});
```
Règles : zéro mock, zéro TestBed, 100% coverage cible.

---

## Template Application (use cases)

Générer 3 blocs describe :

```typescript
// MON-USE-CASE.usecase.spec.ts
import { TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MonUseCase } from './mon-use-case.usecase';
import { MON_PORT_TOKEN } from '../tokens';
import { NullAIAdapter } from '../../infrastructure/ai/null/null-ai.adapter';

describe('MonUseCase', () => {

  describe('comportement nominal — IA disponible', () => {
    const mockPort = { maMethode: vi.fn() };

    beforeEach(() => {
      vi.clearAllMocks();
      mockPort.maMethode.mockResolvedValue([/* données valides */]);
      TestBed.configureTestingModule({
        providers: [
          MonUseCase,
          { provide: MON_PORT_TOKEN, useValue: mockPort }
        ]
      });
    });

    it('retourne le résultat du port quand disponible', async () => {
      const useCase = TestBed.inject(MonUseCase);
      const result = await useCase.execute(/* input */);
      expect(result).toEqual(/* attendu */);
    });
  });

  describe('mode dégradé — NullAIAdapter', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          MonUseCase,
          { provide: MON_PORT_TOKEN, useClass: NullAIAdapter }
        ]
      });
    });

    it('retourne un état vide sans lever d\'exception', async () => {
      const useCase = TestBed.inject(MonUseCase);
      const result = await useCase.execute(/* input */);
      expect(result).toEqual(/* état vide */);
    });
  });
});
```

---

## Template Infrastructure — IndexedDBAdapter

```typescript
import 'fake-indexeddb/auto';
// IDBFactory réinitialisé en beforeEach pour isolation
```
Cas obligatoires : save+getById, getRange, erreur si store inexistant.

---

## Template Infrastructure — AnthropicAdapter

```typescript
// Utiliser provideHttpClient() + provideHttpClientTesting()
// afterEach : httpTesting.verify()
```
Cas obligatoires : header x-api-key présent, null si apiKey absent,
null si erreur réseau, [] si JSON invalide.

---

## Template Presentation (composants TestBed)

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('MonComposant', () => {
  let fixture: ComponentFixture<MonComposant>;
  const mockUseCase = { execute: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockUseCase.execute.mockResolvedValue(/* valeur par défaut */);
    await TestBed.configureTestingModule({
      imports: [MonComposant, NoopAnimationsModule],
      providers: [{ provide: MonUseCase, useValue: mockUseCase }]
    }).compileComponents();
    fixture = TestBed.createComponent(MonComposant);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  // Tests interactions + mode dégradé IA visible mais non bloquant
  // data-testid et aria-label présents
});
```
Cas obligatoires : interaction principale, mode dégradé IA visible mais non bloquant,
data-testid et aria-label présents.

---

## Règles de nommage

- describe() : nom de la classe testée
- describe imbriqué : contexte ("avec IA disponible", "mode dégradé", "erreur réseau")
- it() : comportement attendu en français, jamais le nom de la méthode
  ✅ "retourne un tableau vide sans lever d'exception"
  ❌ "execute() returns empty array"
