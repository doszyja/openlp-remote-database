import { stripOpenLpTextForSpellcheck } from './strip-openlp-text.util';

describe('stripOpenLpTextForSpellcheck', () => {
  it('removes OpenLP formatting tags', () => {
    expect(stripOpenLpTextForSpellcheck('{st}Panie{/st} {it}nasz{/it}')).toBe(
      'Panie nasz',
    );
  });

  it('normalizes line breaks', () => {
    expect(stripOpenLpTextForSpellcheck('linia<br/>druga')).toBe('linia druga');
  });
});