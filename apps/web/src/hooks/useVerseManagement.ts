import { useCallback } from 'react';
import type { UseFormSetValue, UseFormTrigger } from 'react-hook-form';
import { generateVerseOrderString, getVerseTypePrefix } from '../utils/verseParser';
import type { VerseFormData, SongFormData, VerseFormType } from './useSongFormData';

/**
 * Hook to manage verse operations (add, remove)
 */
export function useVerseManagement(
  sourceVerses: VerseFormData[],
  verseOrder: string,
  setValue: UseFormSetValue<SongFormData>,
  trigger: UseFormTrigger<SongFormData>
) {
  /**
   * Add a new verse to sourceVerses
   * Automatically generates sourceId and adds to verseOrder if needed
   */
  const addVerse = useCallback(
    (type: VerseFormType = 'verse') => {
      const prefix = getVerseTypePrefix(type);
      const existingOfType = sourceVerses.filter(v => v.type === type);

      // Extract numbers from sourceId (e.g., "v1" -> 1, "v2" -> 2)
      // sourceId is more reliable than label because it's always in format "v1", "c1", etc.
      const existingNumbers = existingOfType
        .map(v => {
          // Use sourceId first (most reliable), fallback to label
          const id = v.sourceId || v.label || '';
          const numMatch = id.match(/\d+/);
          return numMatch ? parseInt(numMatch[0], 10) : 0;
        })
        .filter(num => num > 0); // Filter out invalid numbers

      const newNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;

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

      // Calculate new order string first
      const currentOrder = verseOrder.trim();
      let newOrderString: string;
      if (currentOrder) {
        // Check if already in order string
        const orderPattern = new RegExp(`\\b${newSourceId}\\b`, 'i');
        if (!orderPattern.test(currentOrder)) {
          // Add to the end
          newOrderString = `${currentOrder} ${newSourceId}`;
        } else {
          // Already in order, no need to update
          newOrderString = currentOrder;
        }
      } else {
        // If order string is empty, set it to just this verse
        newOrderString = newSourceId;
      }

      // Update both values in a batch to ensure they're both updated before validation
      // First, add the new verse to sourceVerses (without validation)
      setValue('sourceVerses', [...sourceVerses, newVerse], { shouldValidate: false });

      // Then, update verseOrder (without validation)
      setValue('verseOrder', newOrderString, { shouldValidate: false });

      // Trigger validation after both values are updated
      // Use requestAnimationFrame to ensure React has processed both setValue calls
      requestAnimationFrame(() => {
        // Use another requestAnimationFrame to ensure form state is fully updated
        requestAnimationFrame(() => {
          trigger('verseOrder');
        });
      });
    },
    [sourceVerses, verseOrder, setValue, trigger]
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
