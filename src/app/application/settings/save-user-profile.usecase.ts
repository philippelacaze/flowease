import { Injectable, inject } from '@angular/core';
import type { UserProfileEntity } from '../../domain/entities/user-profile.entity';
import type { StorageRepository } from '../../domain/repositories/storage.repository';
import { STORAGE_PORT } from '../tokens';

/** id singleton du profil — il n'existe qu'un seul profil par base. */
const PROFILE_ID = 'singleton' as const;

/**
 * Persiste le profil médical et les préférences de l'utilisateur dans IndexedDB.
 *
 * @remarks
 * Respecte SRP : écriture du profil uniquement dans le store 'user-profile'.
 * Stocké dans IndexedDB (pas localStorage) pour isoler les données médicales
 * des API accessibles aux extensions navigateur.
 * Le profil est un document singleton identifié par id = 'singleton'.
 * Toujours met à jour updatedAt au moment de la sauvegarde.
 *
 * Exemple d'injection TestBed :
 * ```typescript
 * providers: [{ provide: STORAGE_PORT, useValue: mockStorage }]
 * ```
 */
@Injectable({ providedIn: 'root' })
export class SaveUserProfileUseCase {
  private readonly storage = inject<StorageRepository<UserProfileEntity>>(STORAGE_PORT as never);

  /**
   * Persiste le profil avec un id singleton et un timestamp de mise à jour rafraîchi.
   *
   * @param profile - Profil à enregistrer (sans id ni updatedAt)
   */
  async execute(profile: Omit<UserProfileEntity, 'id' | 'updatedAt'>): Promise<void> {
    await this.storage.save('user-profile', { ...profile, id: PROFILE_ID, updatedAt: new Date() });
  }
}
