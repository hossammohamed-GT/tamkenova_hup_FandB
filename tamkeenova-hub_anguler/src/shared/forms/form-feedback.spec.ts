import { describe, expect, it } from 'vitest';
import { FormFeedback } from './form-feedback';
describe('FormFeedback field mapping', () => {
  it('maps the exact reported legacy nested whitelist errors without deleting user fields', () => {
    const f = new FormFeedback();
    f.fail({
      error: {
        message: [
          'property short_description_ar should not exist',
          'property short_description_en should not exist',
          'property content_type should not exist',
          'sections.0.lessons.0.property description_en should not exist',
          'sections.0.lessons.1.property description_ar should not exist',
        ],
      },
    });
    expect(Object.keys(f.fields())).toEqual([
      'short_description_ar',
      'short_description_en',
      'content_type',
      'sections.0.lessons.0.description_en',
      'sections.0.lessons.1.description_ar',
    ]);
    expect(f.general()).toContain('API is out of date');
    expect(f.fields()['content_type'][0]).toContain('keep your data');
  });
  it('prefers structured server paths and clears only the edited field', () => {
    const f = new FormFeedback();
    f.fail({
      error: {
        field_errors: { price: ['Invalid price'], category_id: ['Inactive category'] },
        message: ['Redundant summary'],
      },
    });
    f.clearField('price');
    expect(f.fields()).toEqual({ category_id: ['Inactive category'] });
    expect(f.general()).toBe('');
  });
  it('keeps unrecognized, authorization and network errors at the affected action, not on an arbitrary field', () => {
    const f = new FormFeedback();
    f.fail({ error: { message: 'Draft changed; refresh' } });
    expect(f.general()).toBe('Draft changed; refresh');
    expect(f.fields()).toEqual({});
    f.fail({ status: 0 });
    expect(f.general()).toContain('Please retry');
  });
  it('handles unprefixed legacy validation paths and refuses prototype keys', () => {
    const f = new FormFeedback();
    f.fail({
      error: {
        message: [
          'price must not be less than 0',
          'sections.0.lessons.1.title_ar must be longer than 2 characters',
        ],
      },
    });
    expect(Object.keys(f.fields())).toEqual(['price', 'sections.0.lessons.1.title_ar']);
    f.fail({
      error: {
        field_errors: JSON.parse(
          '{"__proto__":["bad"],"constructor":["bad"],"toString":["safe"],"title_en":["invalid"]}',
        ),
      },
    });
    expect(Object.keys(f.fields())).toEqual(['toString', 'title_en']);
    expect(({} as any).bad).toBeUndefined();
  });
  it('does not mistake intentionally forbidden owner/status fields for an old API', () => {
    const f = new FormFeedback();
    f.fail({ error: { message: ['property owner_trainer_id should not exist'] } });
    expect(f.general()).not.toContain('out of date');
    expect(f.fields()['owner_trainer_id']).toEqual(['should not exist']);
  });
});
