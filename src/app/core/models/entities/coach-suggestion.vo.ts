/**
 * Value object représentant une suggestion proactive du Coach dans le journal.
 *
 * @remarks
 * Respecte SRP — structure de données pure, sans logique.
 * Produit par GetJournalSuggestionsUseCase, affiché dans journal-home.
 * Les suggestions sont évaluées localement (aucun appel IA).
 */
export interface CoachSuggestionVO {
  readonly type: 'no_recent_meal' | 'symptom_trending_up';
  readonly message: string;
}
