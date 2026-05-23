/**
 * Schéma IndexedDB de FlowEase — définit les stores et leurs index.
 *
 * @remarks
 * Toute migration de schéma se fait via upgradeSchema() en incrémentant
 * DB_VERSION. Ne jamais supprimer un store en production sans migration
 * explicite — risque de perte de données utilisateur.
 *
 * Référence MDN : https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
 */

import type { IDBPDatabase } from 'idb';

export const DB_NAME = 'flowease-db';
export const DB_VERSION = 3;

/**
 * Noms de tous les object stores de la base de données.
 *
 * @remarks
 * Constante centrale — toujours utiliser ces valeurs plutôt que des
 * chaînes littérales dans le code pour éviter les fautes de frappe.
 */
export const STORES = {
  MEALS: 'meals',
  SYMPTOMS: 'symptoms',
  INTAKES: 'intakes',
  NOTES: 'notes',
  TREATMENTS: 'treatments',
  CURES: 'cures',
  INSIGHTS: 'insights',
  REPORTS: 'reports',
  COACH_SESSIONS: 'coach-sessions',
  SYMPTOM_CONFIG: 'symptom-config',
  USER_PROFILE: 'user-profile',
} as const;

export type StoreName = typeof STORES[keyof typeof STORES];

/**
 * Applique les migrations de schéma IndexedDB selon la version.
 *
 * @remarks
 * Appelée automatiquement par openDB lors d'une montée de version.
 * Chaque bloc `if (oldVersion < N)` est cumulatif et idempotent.
 *
 * @param db - Instance de la base ouverte en phase d'upgrade
 * @param oldVersion - Version précédente de la base (0 si création)
 */
export function upgradeSchema(db: IDBPDatabase, oldVersion: number): void {
  if (oldVersion < 1) {
    const meals = db.createObjectStore(STORES.MEALS, { keyPath: 'id' });
    meals.createIndex('occurredAt', 'occurredAt');
    meals.createIndex('mealType', 'mealType');

    const symptoms = db.createObjectStore(STORES.SYMPTOMS, { keyPath: 'id' });
    symptoms.createIndex('occurredAt', 'occurredAt');
    symptoms.createIndex('category', 'category');

    const intakes = db.createObjectStore(STORES.INTAKES, { keyPath: 'id' });
    intakes.createIndex('confirmedAt', 'confirmedAt');
    intakes.createIndex('treatmentId', 'treatmentId');
    intakes.createIndex('status', 'status');

    const notes = db.createObjectStore(STORES.NOTES, { keyPath: 'id' });
    notes.createIndex('occurredAt', 'occurredAt');
    notes.createIndex('tags', 'tags', { multiEntry: true });

    const treatments = db.createObjectStore(STORES.TREATMENTS, { keyPath: 'id' });
    treatments.createIndex('category', 'category');
    treatments.createIndex('active', 'active');

    const cures = db.createObjectStore(STORES.CURES, { keyPath: 'id' });
    cures.createIndex('treatmentId', 'treatmentId');
    cures.createIndex('status', 'status');

    const insights = db.createObjectStore(STORES.INSIGHTS, { keyPath: 'id' });
    insights.createIndex('createdAt', 'createdAt');

    const reports = db.createObjectStore(STORES.REPORTS, { keyPath: 'id' });
    reports.createIndex('generatedAt', 'generatedAt');

    const coachSessions = db.createObjectStore(STORES.COACH_SESSIONS, { keyPath: 'id' });
    coachSessions.createIndex('startedAt', 'startedAt');

    db.createObjectStore(STORES.SYMPTOM_CONFIG, { keyPath: 'id' });
  }

  if (oldVersion < 2) {
    db.createObjectStore(STORES.USER_PROFILE, { keyPath: 'id' });
  }

  if (oldVersion < 3) {
    // Recreate intakes store with confirmedAt index (replaces the incorrect occurredAt index from v1)
    if (db.objectStoreNames.contains(STORES.INTAKES)) {
      db.deleteObjectStore(STORES.INTAKES);
    }
    const intakes = db.createObjectStore(STORES.INTAKES, { keyPath: 'id' });
    intakes.createIndex('confirmedAt', 'confirmedAt');
    intakes.createIndex('treatmentId', 'treatmentId');
    intakes.createIndex('status', 'status');
  }
}
