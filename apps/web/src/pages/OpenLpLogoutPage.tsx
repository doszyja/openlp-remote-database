import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Alert, Box, CircularProgress, Typography, Button } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const OPENLP_CALLBACK_PORT_KEY = 'openlp_callback_port';

function parseCallbackPort(value: string | null): number | null {
  const parsed = parseInt(value || '', 10);
  if (!Number.isFinite(parsed) || parsed < 1024 || parsed > 65535) {
    return null;
  }
  return parsed;
}

/**
 * OpenLP Song Stats plugin opens this URL to clear the browser session and notify
 * the local callback server on 127.0.0.1:{port} when the port is known.
 */
export default function OpenLpLogoutPage() {
  const [searchParams] = useSearchParams();
  const { logout, isLoading } = useAuth();
  const [status, setStatus] = useState<'pending' | 'done' | 'error'>('pending');
  const [error, setError] = useState<string | null>(null);
  const [notifiedPlugin, setNotifiedPlugin] = useState(false);

  const from = searchParams.get('from') || 'openlp';

  const callbackPort = useMemo(() => {
    const fromUrl = parseCallbackPort(searchParams.get('port'));
    if (fromUrl !== null) {
      return fromUrl;
    }
    if (typeof window === 'undefined') {
      return null;
    }
    return parseCallbackPort(sessionStorage.getItem(OPENLP_CALLBACK_PORT_KEY));
  }, [searchParams]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const run = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        logout();
        if (token) {
          await fetch('/api/auth/logout', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => undefined);
        }

        if (callbackPort !== null) {
          const params = new URLSearchParams({
            logout: '1',
            from,
          });
          sessionStorage.removeItem(OPENLP_CALLBACK_PORT_KEY);
          setNotifiedPlugin(true);
          window.location.href = `http://127.0.0.1:${callbackPort}/callback?${params.toString()}`;
        } else {
          sessionStorage.removeItem(OPENLP_CALLBACK_PORT_KEY);
          setNotifiedPlugin(false);
        }

        setStatus('done');
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Nie udało się zakończyć sesji.';
        setError(message);
        setStatus('error');
      }
    };

    void run();
  }, [callbackPort, from, isLoading, logout]);

  if (status === 'error' && error) {
    return (
      <Box sx={{ p: 4, maxWidth: 480, mx: 'auto' }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button component={Link} to="/songs">
          Wróć do pieśni
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4, maxWidth: 480, mx: 'auto', textAlign: 'center' }}>
      <Typography variant="h5" gutterBottom>
        Wylogowywanie OpenLP…
      </Typography>
      {status === 'pending' && (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {callbackPort !== null
              ? `Czyszczenie sesji w przeglądarce i powiadomienie wtyczki na porcie ${callbackPort}.`
              : 'Czyszczenie sesji w przeglądarce…'}
          </Typography>
          <CircularProgress />
        </>
      )}
      {status === 'done' && notifiedPlugin && (
        <Alert severity="success" sx={{ mt: 2 }}>
          Przekierowano do OpenLP. Możesz zamknąć tę kartę.
        </Alert>
      )}
      {status === 'done' && !notifiedPlugin && (
        <>
          <Alert severity="success" sx={{ mt: 2, textAlign: 'left' }}>
            Wylogowano z przeglądarki. Sesja na stronie pieśni została zakończona.
          </Alert>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'left' }}>
            Lokalna wtyczka OpenLP nie została powiadomiona (brak parametru{' '}
            <code>port</code> w adresie). Jeśli w OpenLP nadal widzisz połączenie, użyj
            wylogowania w ustawieniach wtyczki lub połącz się ponownie.
          </Typography>
          <Button component={Link} to="/" sx={{ mt: 2 }}>
            Strona główna
          </Button>
        </>
      )}
    </Box>
  );
}