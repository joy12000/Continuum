import { describe, it, expect } from 'vitest';
import { splitSentences, mapSources } from '../rag';

describe('splitSentences', () => {
  it.skip('should split sentences correctly', () => {
    const text = '이것은 첫 번째 문장입니다. 이것은 두 번째 문장입니다! 그리고 이것은 세 번째 문장? 네 번째입니다.다섯 번째입니다요';
    const sentences = splitSentences(text);
    expect(sentences).toEqual([
      '이것은 첫 번째 문장입니다.',
      '이것은 두 번째 문장입니다!',
      '그리고 이것은 세 번째 문장?',
      '네 번째입니다.',
      '다섯 번째입니다요'
    ]);
  });

  it.skip('should handle single sentences', () => {
    const text = '이것은 단일 문장입니다.';
    const sentences = splitSentences(text);
    expect(sentences).toEqual(['이것은 단일 문장입니다.']);
  });

  it('should handle empty strings', () => {
    const text = '';
    const sentences = splitSentences(text);
    expect(sentences).toEqual([]);
  });
});

describe('mapSources', () => {
  it('should map sources correctly', () => {
    const sentences = [{ text: '이것은 첫 번째 문장입니다.', sourceNoteId: null }];
    const context = [
      { id: '1', content: '이것은 첫 번째 문장입니다. 이것은 컨텍스트입니다.' },
      { id: '2', content: '이것은 두 번째 컨텍스트입니다.' },
    ];
    const { sentences: mappedSentences, sources } = mapSources(sentences, context);
    expect(mappedSentences[0].sourceNoteId).toBe('1');
    expect(sources).toHaveLength(1);
    expect(sources[0].noteId).toBe('1');
  });

  it('should not map sources if similarity is too low', () => {
    const sentences = [{ text: '이것은 관련 없는 문장입니다.', sourceNoteId: null }];
    const context = [
      { id: '1', content: '이것은 첫 번째 컨텍스트입니다.' },
      { id: '2', content: '이것은 두 번째 컨텍스트입니다.' },
    ];
    const { sentences: mappedSentences, sources } = mapSources(sentences, context);
    expect(mappedSentences[0].sourceNoteId).toBe(null);
    expect(sources).toHaveLength(0);
  });
});