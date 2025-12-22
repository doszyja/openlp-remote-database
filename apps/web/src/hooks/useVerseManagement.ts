import { useCallback } from 'react';
import type { UseFormSetValue } from 'react-hook-form';
import { generateVerseOrderString, getVerseTypePrefix } from '../utils/verseParser';
import type { VerseFormData, SongFormData, VerseFormType } from './useSongFormData';

/**
 * Hook to manage verse operations (add, remove)
 */
export function useVerseManagement(
  sourceVerses: VerseFormData[],
  verseOrder: string,
  setValue: UseFormSetValue<SongFormData>
) {
  /**
   * Add a new verse to sourceVerses
   * Automatically generates sourceId and adds to verseOrder if needed
   */
  const addVerse = useCallback(
    (type: VerseFormType = 'verse') => {
      const prefix = getVerseTypePrefix(type);
      const existingOfType = sourceVerses.filter(v => v.type === type);
      const newNumber =
        existingOfType.length > 0
          ? Math.max(
              ...existingOfType.map(v => {
                const label = v.label || '';
                const numMatch = label.match(/\d+/);
                return numMatch ? parseInt(numMatch[0], 10) : 0;
              })
            ) + 1
          : 1;

      const newSourceId = `${prefix}${newNumber}`;
      const newOrder =
        sourceVerses.length > 0 ? Math.max(...sourceVerses.map(v => v.order)) + 1 : 1;

      const newVerse: VerseFormData = {
        order: newOrder,
        content: '',
        label: newSourceId,
        type,
        sourceId: newSourceId,
      };

      setValue('sourceVerses', [...sourceVerses, newVerse]);

      // Automatically add to order string if it's empty, otherwise append
      const currentOrder = verseOrder.trim();
      if (currentOrder) {
        // Check if already in order string
        const orderPattern = new RegExp(`\\b${newSourceId}\\b`, 'i');
        if (!orderPattern.test(currentOrder)) {
          // Add to the end
          setValue('verseOrder', `${currentOrder} ${newSourceId}`, { shouldValidate: true });
        }
      } else {
        // If order string is empty, set it to just this verse
        setValue('verseOrder', newSourceId, { shouldValidate: true });
      }
    },
    [sourceVerses, verseOrder, setValue]
  );

  /**
   * Remove a verse from sourceVerses
   * Also removes it from verseOrder string
   */
  const removeVerse = useCallback(
    (index: number) => {
      if (sourceVerses.length === 1) return;

      const verseToRemove = sourceVerses[index];
      const newSourceVerses = sourceVerses.filter((_, i) => i !== index);

      // Get the identifier to remove
      const verseId =
        verseToRemove.sourceId ||
        verseToRemove.label ||
        `${getVerseTypePrefix(verseToRemove.type || 'verse')}${verseToRemove.order}`;

      // Remove from order string
      const orderPattern = new RegExp(`\\b${verseId}\\b`, 'gi');
      const newOrder = verseOrder.replace(orderPattern, '').replace(/\s+/g, ' ').trim();

      setValue('sourceVerses', newSourceVerses);

      // If order string becomes empty, generate default order
      if (newOrder) {
        setValue('verseOrder', newOrder, { shouldValidate: true });
      } else {
        const defaultOrder = generateVerseOrderString(
          newSourceVerses.map(v => ({
            order: v.order,
            content: v.content,
            label: v.label ?? null,
            type: v.type ?? 'verse',
          }))
        );
        setValue('verseOrder', defaultOrder, { shouldValidate: true });
      }
    },
    [sourceVerses, verseOrder, setValue]
  );

  return {
    addVerse,
    removeVerse,
  };
}
