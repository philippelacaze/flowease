/**
 * Implémentation IndexedDB du port StorageRepository.
 *
 * @remarks
 * Implémente StorageRepository — substitutable en test via fake-indexeddb.
 * Utiliser STORAGE_PORT (InjectionToken) pour injecter cet adapter dans
 * les use cases, jamais la classe concrète directement.
 *
 * Exemple d'injection en test :
 * ```typescript
 * import 'fake-indexeddb/auto';
 * providers: [{ provide: STORAGE_PORT, useClass: IndexedDBAdapter }]
 * ```
 */

import { Injectable } from '@angular/core';
import { openDB, IDBPDatabase } from 'idb';
import { StorageRepository } from '../../domain/repositories/storage.repository';
import { DB_NAME, DB_VERSION, upgradeSchema } from './indexeddb.schema';

@Injectable({ providedIn: 'root' })
export class IndexedDBAdapter implements StorageRepository<{ id: string }> {
  private db: IDBPDatabase | null = null;

  /**
   * Initialise la connexion à la base IndexedDB et applique les migrations.
   *
   * @remarks
   * Doit être appelée une seule fois au démarrage via APP_INITIALIZER
   * dans app.config.ts avant toute opération de lecture/écriture.
   *
   * @returns Promise résolue quand la base est prête
   */
  async init(): Promise<void> {
    this.db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        upgradeSchema(db, oldVersion);
      },
    });
  }

  private getDb(): IDBPDatabase {
    if (!this.db) {
      throw new Error('IndexedDBAdapter not initialized — call init() first');
    }
    return this.db;
  }

  /**
   * Récupère une entité par son identifiant.
   *
   * @param store - Nom du store IndexedDB cible
   * @param id - Identifiant unique de l'entité
   * @returns L'entité ou undefined si absente
   */
  async get<T extends { id: string }>(store: string, id: string): Promise<T | undefined> {
    return this.getDb().get(store, id) as Promise<T | undefined>;
  }

  /**
   * Récupère toutes les entités d'un store.
   *
   * @param store - Nom du store IndexedDB cible
   * @returns Tableau de toutes les entités
   */
  async getAll<T extends { id: string }>(store: string): Promise<T[]> {
    return this.getDb().getAll(store) as Promise<T[]>;
  }

  /**
   * Récupère les entités dont un index est compris entre deux bornes.
   *
   * @param store - Nom du store IndexedDB cible
   * @param index - Nom de l'index à requêter
   * @param lower - Borne inférieure (incluse)
   * @param upper - Borne supérieure (incluse)
   * @returns Entités dans la plage demandée
   */
  async getRange<T extends { id: string }>(
    store: string,
    index: string,
    lower: IDBValidKey,
    upper: IDBValidKey,
  ): Promise<T[]> {
    const range = IDBKeyRange.bound(lower, upper);
    return this.getDb().getAllFromIndex(store, index, range) as Promise<T[]>;
  }

  /**
   * Récupère toutes les entités correspondant à une valeur d'index.
   *
   * @param store - Nom du store IndexedDB cible
   * @param index - Nom de l'index à requêter
   * @param value - Valeur recherchée dans l'index
   * @returns Entités dont l'index correspond à la valeur
   */
  async getAllByIndex<T extends { id: string }>(
    store: string,
    index: string,
    value: IDBValidKey,
  ): Promise<T[]> {
    return this.getDb().getAllFromIndex(store, index, value) as Promise<T[]>;
  }

  /**
   * Persiste une entité (insert ou update selon présence de l'id).
   *
   * @param store - Nom du store IndexedDB cible
   * @param entity - Entité à persister
   * @returns L'identifiant de l'entité persistée
   */
  async save<T extends { id: string }>(store: string, entity: T): Promise<string> {
    await this.getDb().put(store, entity);
    return entity.id;
  }

  /**
   * Supprime une entité par son identifiant.
   *
   * @param store - Nom du store IndexedDB cible
   * @param id - Identifiant de l'entité à supprimer
   */
  async delete(store: string, id: string): Promise<void> {
    await this.getDb().delete(store, id);
  }

  /**
   * Supprime toutes les entités d'un store.
   *
   * @param store - Nom du store IndexedDB cible
   */
  async clear(store: string): Promise<void> {
    await this.getDb().clear(store);
  }
}
