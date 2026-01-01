import { useState } from 'react';
import { Box, Button, Stack, Typography, Paper, Alert } from '@mui/material';
import { Error as ErrorIcon, BugReport as BugReportIcon } from '@mui/icons-material';

/**
 * Test page to demonstrate ErrorBoundary functionality
 * This page intentionally throws errors to show how ErrorBoundary handles them
 */
export default function ErrorTestPage() {
  const [shouldThrowError, setShouldThrowError] = useState(false);

  // Component that throws an error during render
  const ErrorComponent = () => {
    if (shouldThrowError) {
      throw new Error('To jest testowy błąd renderowania! Ten komponent celowo rzuca błąd.');
    }
    return null;
  };

  // Handler for async errors (promises)
  const handleAsyncError = () => {
    // This will be caught by unhandledrejection handler
    Promise.reject(new Error('To jest testowy błąd asynchroniczny (Promise rejection)!'));
  };

  // Handler for sync errors in event handlers
  const handleSyncError = () => {
    throw new Error('To jest testowy błąd synchroniczny w event handlerze!');
  };

  // Handler for setTimeout errors
  const handleTimeoutError = () => {
    setTimeout(() => {
      throw new Error('To jest testowy błąd w setTimeout!');
    }, 100);
  };

  return (
    <Box
      sx={{
        px: { xs: 2, sm: 3, md: 4 },
        py: { xs: 2, sm: 3 },
        maxWidth: '800px',
        mx: 'auto',
      }}
    >
      <Paper sx={{ p: 3 }}>
        <Stack spacing={3}>
          <Box display="flex" alignItems="center" gap={2}>
            <BugReportIcon color="error" sx={{ fontSize: 40 }} />
            <Typography variant="h4" component="h1">
              Strona Testowa ErrorBoundary
            </Typography>
          </Box>

          <Alert severity="warning">
            Ta strona służy do testowania ErrorBoundary. Kliknięcie przycisków poniżej spowoduje
            celowe rzucenie błędów, aby zobaczyć, jak ErrorBoundary je obsługuje.
          </Alert>

          <Typography variant="body1">
            ErrorBoundary przechwytuje błędy w komponentach React i wyświetla przyjazny komunikat
            błędu zamiast zawieszenia całej aplikacji.
          </Typography>

          <Box>
            <Typography variant="h6" gutterBottom>
              Testy błędów:
            </Typography>
            <Stack spacing={2} sx={{ mt: 2 }}>
              <Button
                variant="contained"
                color="error"
                startIcon={<ErrorIcon />}
                onClick={() => setShouldThrowError(true)}
                fullWidth
              >
                Rzuć błąd w renderowaniu (ErrorBoundary)
              </Button>

              <Button variant="outlined" color="error" onClick={handleAsyncError} fullWidth>
                Rzuć błąd asynchroniczny (Promise rejection)
              </Button>

              <Button variant="outlined" color="error" onClick={handleSyncError} fullWidth>
                Rzuć błąd synchroniczny (Event handler)
              </Button>

              <Button variant="outlined" color="error" onClick={handleTimeoutError} fullWidth>
                Rzuć błąd w setTimeout
              </Button>
            </Stack>
          </Box>

          <Alert severity="info">
            <Typography variant="body2">
              <strong>Uwaga:</strong> Błędy w event handlerach i asynchronicznym kodzie nie są
              przechwytywane przez ErrorBoundary, ale są logowane do konsoli przez globalne handlery
              błędów. Tylko błędy w renderowaniu komponentów są przechwytywane przez ErrorBoundary.
            </Typography>
          </Alert>

          {/* This component will throw an error when shouldThrowError is true */}
          <ErrorComponent />
        </Stack>
      </Paper>
    </Box>
  );
}
