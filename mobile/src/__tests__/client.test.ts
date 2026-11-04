/** Unit tests for the API client error envelope mapping. */
import { ApiError } from '@/api/client';

describe('ApiError', () => {
  it('exposes status, code and details', () => {
    const err = new ApiError(400, {
      code: 'validation_error',
      message: 'Bad input',
      details: { severity: ['out of range'] },
    });
    expect(err.status).toBe(400);
    expect(err.code).toBe('validation_error');
    expect(err.message).toBe('Bad input');
    expect(err.details).toEqual({ severity: ['out of range'] });
    expect(err).toBeInstanceOf(Error);
  });
});
