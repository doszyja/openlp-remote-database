import { useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Stack,
} from '@mui/material';
import ProtectedRoute from '../components/ProtectedRoute';
import {
  usePresentationEvents,
  usePresentationStats,
} from '../hooks/usePresentationStats';

function PresentationStatsContent() {
  const [clientId, setClientId] = useState('');
  const days = 30;
  const [page] = useState(1);

  const summaryQuery = usePresentationStats(clientId || undefined, days);
  const eventsQuery = usePresentationEvents(
    page,
    30,
    clientId || undefined,
  );

  if (summaryQuery.isLoading) {
    return (
      <Box display="flex" justifyContent="center" py={6}>
        <CircularProgress />
      </Box>
    );
  }

  if (summaryQuery.isError) {
    return (
      <Alert severity="error">
        Nie udało się pobrać statystyk prezentacji. Wymagane uprawnienia edycji.
      </Alert>
    );
  }

  const summary = summaryQuery.data;

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h4" gutterBottom>
        Statystyki prezentacji (OpenLP)
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Zdarzenia wysyłane z wtyczki Song Stats, gdy pieśń idzie na żywo.
      </Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <TextField
          label="Client ID (opcjonalnie)"
          size="small"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          placeholder="church / site id z OpenLP"
          fullWidth
        />
      </Stack>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6">Podsumowanie ({days} dni)</Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          Łącznie zdarzeń: <strong>{summary?.totalEvents ?? 0}</strong>
        </Typography>
        {summary?.byDay?.length ? (
          <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {summary.byDay.map((row: { date: string; count: number }) => (
              <Typography key={row.date} variant="caption" component="div">
                {row.date}: {row.count}
              </Typography>
            ))}
          </Box>
        ) : null}
      </Paper>

      <Typography variant="h6" gutterBottom>
        Najczęściej prezentowane pieśni
      </Typography>
      <TableContainer component={Paper} sx={{ mb: 4 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Tytuł</TableCell>
              <TableCell align="right">Liczba</TableCell>
              <TableCell>Ostatnio</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(summary?.bySong ?? []).map(
              (row: {
                title: string;
                count: number;
                lastPresentedAt?: string;
              }) => (
                <TableRow key={`${row.title}-${row.count}`}>
                  <TableCell>{row.title}</TableCell>
                  <TableCell align="right">{row.count}</TableCell>
                  <TableCell>
                    {row.lastPresentedAt
                      ? new Date(row.lastPresentedAt).toLocaleString()
                      : '—'}
                  </TableCell>
                </TableRow>
              ),
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="h6" gutterBottom>
        Ostatnie zdarzenia
      </Typography>
      {eventsQuery.isLoading ? (
        <CircularProgress size={24} />
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Czas</TableCell>
                <TableCell>Tytuł</TableCell>
                <TableCell>Client</TableCell>
                <TableCell>OpenLP ID</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(eventsQuery.data?.data ?? []).map(
                (row: {
                  id: string;
                  presentedAt: string;
                  title: string;
                  clientId?: string;
                  openlpSongId?: number;
                }) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      {new Date(row.presentedAt).toLocaleString()}
                    </TableCell>
                    <TableCell>{row.title}</TableCell>
                    <TableCell>{row.clientId || '—'}</TableCell>
                    <TableCell>{row.openlpSongId ?? '—'}</TableCell>
                  </TableRow>
                ),
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

export default function PresentationStatsPage() {
  return (
    <ProtectedRoute>
      <PresentationStatsContent />
    </ProtectedRoute>
  );
}