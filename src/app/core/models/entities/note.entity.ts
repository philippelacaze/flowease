/**
 * Mode de saisie d'une note.
 *
 * @remarks
 * Discriminant permettant de tracer l'origine de la saisie pour les statistiques d'usage.
 */
export type NoteInputMode = 'text' | 'voice' | 'photo';

/**
 * Lien vers une autre entrée du journal.
 *
 * @remarks
 * Value object permettant d'associer une note à un repas, un symptôme ou une prise.
 * entryType discrimine le store IndexedDB cible pour la résolution de l'entité liée.
 */
export interface LinkedEntry {
  readonly entryId: string;
  readonly entryType: 'meal' | 'symptom' | 'intake';
}

/**
 * Entité représentant une note libre dans le journal quotidien.
 *
 * @remarks
 * Interface readonly — jamais de mutation directe.
 * id, createdAt sont assignés par AddNoteUseCase.
 * Flux de taguage IA : TagNoteUseCase écrit dans aiTagSuggestions (en attente de confirmation).
 * ConfirmNoteTagsUseCase déplace les tags validés dans tags[] et vide aiTagSuggestions.
 *
 * @param id - UUID v4 assigné par crypto.randomUUID()
 * @param createdAt - Timestamp d'enregistrement
 * @param occurredAt - Heure de l'événement noté (peut différer de createdAt)
 * @param inputMode - Canal de saisie (text, voice, photo)
 * @param content - Contenu textuel de la note
 * @param imageBase64 - Image encodée en base64 (si inputMode === 'photo')
 * @param tags - Tags confirmés par l'utilisateur
 * @param aiTagSuggestions - Tags proposés par l'IA, en attente de confirmation (absent si aucune suggestion)
 * @param summary - Résumé court généré par TagNoteUseCase (vide si IA indisponible)
 * @param linkedEntries - Entrées du journal liées à cette note
 * @param editedAt - Timestamp de la dernière modification (absent si jamais édité)
 */
export interface NoteEntity {
  readonly id: string;
  readonly createdAt: Date;
  readonly occurredAt: Date;
  readonly inputMode: NoteInputMode;
  readonly content: string;
  readonly imageBase64?: string;
  readonly tags: ReadonlyArray<string>;
  readonly aiTagSuggestions?: ReadonlyArray<string>;
  readonly summary: string;
  readonly linkedEntries: ReadonlyArray<LinkedEntry>;
  readonly editedAt?: Date;
}
