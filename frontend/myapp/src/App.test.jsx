import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

describe('App routing and auth shell', () => {
  beforeEach(() => {
    global.fetch = vi.fn((url) => {
      if (String(url).includes('/auth/me')) {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ message: 'Authentication required.' }),
        });
      }

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve('{}'),
      });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders login page when session is missing', async () => {
    render(<App />);
    expect(await screen.findByText(/welcome back/i)).toBeInTheDocument();
  });
});
