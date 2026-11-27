import { describe, expect, it } from 'vitest';
import { extractApiErrorMessage, getApiErrorMessage } from './apiErrorHandler';

describe('API error message extraction', () => {
  it('extracts lowercase message', () => {
    expect(extractApiErrorMessage({ response: { data: { message: 'Lowercase message' } } })).toBe('Lowercase message');
  });

  it('extracts uppercase Message', () => {
    expect(extractApiErrorMessage({ response: { data: { Message: 'Uppercase message' } } })).toBe('Uppercase message');
  });

  it('extracts title and reason fallbacks', () => {
    expect(extractApiErrorMessage({ response: { data: { title: 'Title message' } } })).toBe('Title message');
    expect(extractApiErrorMessage({ response: { data: { reason: 'Reason message' } } })).toBe('Reason message');
  });

  it('preserves generic 403 authorization handling', () => {
    expect(getApiErrorMessage({
      response: { status: 403, data: { Message: 'Backend permission detail' } },
    })).toEqual({ global: 'You do not have permission to perform this action.' });
  });

  it('uses uppercase Message for non-auth status handling', () => {
    expect(getApiErrorMessage({
      response: { status: 409, data: { Message: 'Conflict from backend' } },
    })).toEqual({ global: 'Conflict from backend' });
  });
});
