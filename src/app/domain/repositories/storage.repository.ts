/**
 * Interface générique de stockage persistant.
 *
 * @remarks
 * Port central du pattern Repository. Respecte ISP : chaque entité
 * hérite d'une version typée de StorageRepository plutôt que d'utiliser
 * cette interface directement. Implémenté par IndexedDBAdapter.
 *
 * Exemple d'injection TestBed :
 * ```typescript
 * providers: [{ provide: STORAGE_PORT, useClass: FakeStorageAdapter }]
 * ```
 *
 * @typeParam T - Type de l'entité stockée (doit avoir une propriété `id: string`)
 */
export interface StorageRepository<T extends { id: string }> {
  /**
   * Récupère une entité par son identifiant unique.
   *
   * @param store - Nom du store IndexedDB cible
   * @param id - Identifiant de l'entité
   * @returns L'entité trouvée ou undefined si absente
   */
  get(store: string, id: string): Promise<T | undefined>;

  /**
   * Récupère toutes les entités d'un store.
   *
   * @param store - Nom du store IndexedDB cible
   * @returns Tableau de toutes les entités (vide si aucune)
   */
  getAll(store: string): Promise<T[]>;

  /**
   * Récupère les entités d'un store dont l'index est compris entre two bornes.
   *
   * @param store - Nom du store IndexedDB cible
   * @param index - Nom de l'index IndexedDB à requêter
   * @param lower - Borne inférieure (incluse)
   * @param upper - Borne supérieure (incluse)
   * @returns Entités dans la plage demandée
   */
  getRange(store: string, index: string, lower: IDBValidKey, upper: IDBValidKey): Promise<T[]>;

  /**
   * Persiste une entité (insert ou update selon présence de l'id).
   *
   * @param store - Nom du store IndexedDB cible
   * @param entity - Entité à persister
   * @returns L'identifiant de l'entité persistée
   */
  save(store: string, entity: T): Promise<string>;

  /**
   * Supprime une entité par son identifiant.
   *
   * @param store - Nom du store IndexedDB cible
   * @param id - Identifiant de l'entité à supprimer
   */
  delete(store: string, id: string): Promise<void>;

  /**
   * Supprime toutes les entités d'un store.
   *
   * @param store - Nom du store IndexedDB cible
   */
  clear(store: string): Promise<void>;
}
