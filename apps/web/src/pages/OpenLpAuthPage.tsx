import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Typography,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { getApiUrlForOAuth } from '../utils/apiUrl';

const AUTH_TOKEN_KEY = 'auth_token';

async function requestOpenLpCode(
  state: string,
  port: number,
): Promise<{ code: string }> {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) {
    throw new Error('not_authenticated');
  }

  const params = new URLSearchParams({ state, port: String(port) });
  const res = await fetch(`/api/auth/openlp/authorize?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `HTTP ${res.status}`);
  }

  return res.json();
}

export default function OpenLpAuthPage() {
  const [searchParams] = useSearchParams();
  const { isAuthenticated, isLoading } = useAuth();
  const [status, setStatus] = useState<'idle' | 'working' | 'done' | 'error'>(
    'idle',
  );
  const [error, setError] = useState<string | null>(null);

  const port = parseInt(searchParams.get('port') || '', 10);
  const state = searchParams.get('state') || '';

  const returnUrl = `/auth/openlp?port=${encodeURIComponent(String(port))}&state=${encodeURIComponent(state)}`;

  useEffect(() => {
    if (!state || !Number.isFinite(port)) {
      setError('Brak parametru port lub state w adresie URL.');
      setStatus('error');
      return;
    }

    if (isLoading) {
      return;
    }

    if (!isAuthenticated) {
      setStatus('idle');
      return;
    }

    let cancelled = false;

    (async () => {
      setStatus('working');
      try {
        const { code } = await requestOpenLpCode(state, port);
        if (cancelled) return;
        const target = `http://127.0.0.1:${port}/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;
        window.location.href = target;
        setStatus('done');
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : 'Nie udało się wygenerować kodu.';
        setError(message);
        setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isLoading, port, state]);

  if (!state || !Number.isFinite(port)) {
    return (
      <Box sx={{ p: 4, maxWidth: 480, mx: 'auto' }}>
        <Alert severity="error">
          Otwórz tę stronę z wtyczki OpenLP (parametry port i state).
        </Alert>
      </Box>
    );
  }

  if (!isLoading && !isAuthenticated) {
    const apiUrl = getApiUrlForOAuth();
    const handleLogin = () => {
      sessionStorage.setItem('post_auth_redirect', returnUrl);
      window.location.href = `${apiUrl}/auth/discord`;
    };

    return (
      <Box sx={{ p: 4, maxWidth: 480, mx: 'auto', textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom>
          Połącz OpenLP z kontem
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Zaloguj się przez Discord, aby przekazać token do wtyczki Song Stats.
        </Typography>
        <Button variant="contained" onClick={handleLogin}>
          Zaloguj przez Discord
        </Button>
        <Typography variant="caption" display="block" sx={{ mt: 2 }}>
          Po logowaniu wrócisz tutaj i token trafi do OpenLP na porcie {port}.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4, maxWidth: 480, mx: 'auto', textAlign: 'center' }}>
      <Typography variant="h5" gutterBottom>
        Przekazywanie do OpenLP…
      </Typography>
      {(status === 'working' || status === 'idle') && <CircularProgress />}
      {status === 'done' && (
        <Alert severity="success" sx={{ mt: 2 }}>
          Przekierowano do OpenLP. Możesz zamknąć tę kartę.
        </Alert>
      )}
      {status === 'error' && error && (
        <>
          <Alert severity="error" sx={{ mt: 2, textAlign: 'left' }}>
            {error}
          </Alert>
          <Button component={Link} to="/songs" sx={{ mt: 2 }}>
            Wróć do pieśni
          </Button>
        </>
      )}
    </Box>
  );
}