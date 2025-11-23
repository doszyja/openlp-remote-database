import { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  Pagination,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Divider,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
} from '@mui/material';
import { Close as CloseIcon, FilterList as FilterListIcon, Clear as ClearIcon, Download as DownloadIcon, Link as LinkIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuditLogs } from '../hooks/useAuditLogs';
import { AuditLogAction } from '@openlp/shared/types/audit-log';
// Simple date formatter (no external dependency needed)
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
}

function getActionLabel(action: AuditLogAction): string {
  switch (action) {
    case AuditLogAction.LOGIN:
      return 'Logowanie';
    case AuditLogAction.SONG_EDIT:
      return 'Edycja pieśni';
    case AuditLogAction.SONG_DELETE:
      return 'Usunięcie pieśni';
    case AuditLogAction.ZIP_EXPORT:
      return 'Eksport ZIP';
    default:
      return action;
  }
}

function getActionColor(action: AuditLogAction): 'default' | 'primary' | 'success' | 'warning' | 'error' {
  switch (action) {
    case AuditLogAction.LOGIN:
      return 'success';
    case AuditLogAction.SONG_EDIT:
      return 'primary';
    case AuditLogAction.SONG_DELETE:
      return 'error';
    case AuditLogAction.ZIP_EXPORT:
      return 'warning';
    default:
      return 'default';
  }
}

export default function AuditLogPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [filters, setFilters] = useState<{
    action?: string;
    username?: string;
    songId?: string;
    fromDate?: string;
    toDate?: string;
  }>({});
  const [showFilters, setShowFilters] = useState(false);
  const limit = 50;
  
  // Reset page when filters change
  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);
  
  const { data, isLoading, error } = useAuditLogs(page, limit, Object.keys(filters).length > 0 ? filters : undefined);
  
  const handleFilterChange = (key: string, value: string | undefined) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      if (value && value.trim()) {
        newFilters[key as keyof typeof newFilters] = value;
      } else {
        delete newFilters[key as keyof typeof newFilters];
      }
      return newFilters;
    });
    setPage(1); // Reset to first page when filters change
  };
  
  const clearFilters = () => {
    setFilters({});
    setPage(1);
  };
  
  const hasActiveFilters = Object.keys(filters).length > 0;
  
  // Export to CSV
  const handleExportCSV = () => {
    if (!data?.data) return;
    
    const headers = ['Data', 'Akcja', 'Użytkownik', 'Pieśń', 'ID Pieśni'];
    const rows = data.data.map(log => [
      formatDate(log.createdAt),
      getActionLabel(log.action),
      log.username,
      log.songTitle || '-',
      log.songId || '-',
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Calculate statistics
  const stats = useMemo(() => {
    if (!data?.data) return null;
    
    const actionCounts: Record<string, number> = {};
    const userCounts: Record<string, number> = {};
    
    data.data.forEach(log => {
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
      userCounts[log.username] = (userCounts[log.username] || 0) + 1;
    });
    
    return {
      total: data.total,
      actionCounts,
      userCounts,
      mostActiveUser: Object.entries(userCounts).sort((a, b) => b[1] - a[1])[0]?.[0],
      mostCommonAction: Object.entries(actionCounts).sort((a, b) => b[1] - a[1])[0]?.[0],
    };
  }, [data]);

  const handleRowClick = (log: any) => {
    setSelectedLog(log);
    setDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);
    setSelectedLog(null);
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ py: { xs: 2, sm: 3, md: 4 }, px: { xs: 2, sm: 3, md: 4 } }}>
        <Alert severity="error">
          Nie udało się załadować logów audytu. Spróbuj ponownie.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ py: { xs: 2, sm: 3, md: 4 }, px: { xs: 2, sm: 3, md: 4 } }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Typography
          variant="h4"
          component="h1"
          sx={{
            fontWeight: 500,
            fontSize: { xs: '1.5rem', sm: '2rem' },
          }}
        >
          Logi Audytu
        </Typography>
        <Stack direction="row" spacing={1}>
          {hasActiveFilters && (
            <Button
              startIcon={<ClearIcon />}
              onClick={clearFilters}
              size="small"
              variant="outlined"
            >
              Wyczyść Filtry
            </Button>
          )}
          <Button
            startIcon={<FilterListIcon />}
            onClick={() => setShowFilters(!showFilters)}
            size="small"
            variant={showFilters ? 'contained' : 'outlined'}
          >
            Filtry
          </Button>
          <Button
            startIcon={<DownloadIcon />}
            onClick={handleExportCSV}
            size="small"
            variant="outlined"
            disabled={!data?.data || data.data.length === 0}
          >
            Eksport CSV
          </Button>
        </Stack>
      </Box>
      
      {stats && (
        <Paper
          elevation={0}
          sx={{
            mb: 3,
            p: 2,
            bgcolor: 'background.paper',
            boxShadow: (theme) =>
              theme.palette.mode === 'dark'
                ? '0 4px 16px rgba(0, 0, 0, 0.2)'
                : '0 4px 16px rgba(0, 0, 0, 0.08)',
            border: (theme) =>
              theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.05)',
          }}
        >
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Łącznie logów
                </Typography>
                <Typography variant="h6">{stats.total}</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Najczęstsza akcja
                </Typography>
                <Typography variant="h6">
                  {stats.mostCommonAction ? getActionLabel(stats.mostCommonAction as AuditLogAction) : '-'}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Najaktywniejszy użytkownik
                </Typography>
                <Typography variant="h6">{stats.mostActiveUser || '-'}</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Akcje na tej stronie
                </Typography>
                <Typography variant="h6">{data?.data.length || 0}</Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}

      {showFilters && (
        <Paper
          elevation={0}
          sx={{
            mb: 3,
            p: 2,
            bgcolor: 'background.paper',
            boxShadow: (theme) =>
              theme.palette.mode === 'dark'
                ? '0 4px 16px rgba(0, 0, 0, 0.2)'
                : '0 4px 16px rgba(0, 0, 0, 0.08)',
            border: (theme) =>
              theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.05)',
          }}
        >
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Akcja</InputLabel>
                <Select
                  value={filters.action || ''}
                  label="Akcja"
                  onChange={(e) => handleFilterChange('action', e.target.value || undefined)}
                >
                  <MenuItem value="">Wszystkie</MenuItem>
                  <MenuItem value={AuditLogAction.LOGIN}>Logowanie</MenuItem>
                  <MenuItem value={AuditLogAction.SONG_EDIT}>Edycja pieśni</MenuItem>
                  <MenuItem value={AuditLogAction.SONG_DELETE}>Usunięcie pieśni</MenuItem>
                  <MenuItem value={AuditLogAction.ZIP_EXPORT}>Eksport ZIP</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Użytkownik"
                value={filters.username || ''}
                onChange={(e) => handleFilterChange('username', e.target.value || undefined)}
                placeholder="Wyszukaj użytkownika..."
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                label="ID Pieśni"
                value={filters.songId || ''}
                onChange={(e) => handleFilterChange('songId', e.target.value || undefined)}
                placeholder="Wprowadź ID pieśni..."
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Od daty"
                type="date"
                value={filters.fromDate || ''}
                onChange={(e) => handleFilterChange('fromDate', e.target.value || undefined)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Do daty"
                type="date"
                value={filters.toDate || ''}
                onChange={(e) => handleFilterChange('toDate', e.target.value || undefined)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </Paper>
      )}

      {data && data.data.length === 0 ? (
        <Alert severity="info">Brak logów audytu.</Alert>
      ) : (
        <>
          <Paper
            elevation={0}
            sx={{
              mb: 3,
              bgcolor: 'background.paper',
              boxShadow: (theme) =>
                theme.palette.mode === 'dark'
                  ? '0 4px 16px rgba(0, 0, 0, 0.2)'
                  : '0 4px 16px rgba(0, 0, 0, 0.08)',
              border: (theme) =>
                theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.05)',
            }}
          >
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Data</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Akcja</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Użytkownik</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Pieśń</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data?.data.map((log) => (
                    <TableRow 
                      key={log._id} 
                      hover 
                      onClick={() => handleRowClick(log)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>
                        {formatDate(log.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getActionLabel(log.action)}
                          color={getActionColor(log.action)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{log.username}</TableCell>
                      <TableCell>
                        {log.songTitle ? (
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {log.songTitle}
                            </Typography>
                            {log.songId && (
                              <Box display="flex" alignItems="center" gap={0.5} mt={0.5}>
                                <Typography variant="caption" color="text.secondary">
                                  ID: {log.songId}
                                </Typography>
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/songs/${log.songId}`);
                                  }}
                                  sx={{ 
                                    p: 0.25,
                                    ml: 0.5,
                                    '&:hover': {
                                      bgcolor: 'action.hover',
                                    },
                                  }}
                                  title="Przejdź do pieśni"
                                >
                                  <LinkIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            )}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            -
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {data && (
            <Stack alignItems="center" sx={{ mt: 3 }}>
              <Pagination
                count={data.totalPages || 1}
                page={page}
                onChange={(_, newPage) => setPage(newPage)}
                color="primary"
                size="large"
                showFirstButton
                showLastButton
              />
              {data.total && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Wyświetlanie {((page - 1) * limit) + 1}-{Math.min(page * limit, data.total)} z {data.total} logów
                </Typography>
              )}
            </Stack>
          )}
        </>
      )}

      {/* Details Modal */}
      <Dialog
        open={detailsOpen}
        onClose={handleCloseDetails}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            maxHeight: '90vh',
          },
        }}
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Szczegóły Logu Audytu</Typography>
            <IconButton onClick={handleCloseDetails} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedLog && (
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Data
                </Typography>
                <Typography variant="body1">{formatDate(selectedLog.createdAt)}</Typography>
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Akcja
                </Typography>
                <Chip
                  label={getActionLabel(selectedLog.action)}
                  color={getActionColor(selectedLog.action)}
                  size="small"
                />
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Użytkownik
                </Typography>
                <Typography variant="body1">{selectedLog.username}</Typography>
                {selectedLog.discordId && (
                  <Typography variant="caption" color="text.secondary">
                    Discord ID: {selectedLog.discordId}
                  </Typography>
                )}
              </Box>

              {selectedLog.songTitle && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Pieśń
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {selectedLog.songTitle}
                    </Typography>
                    {selectedLog.songId && (
                      <Typography variant="caption" color="text.secondary">
                        ID: {selectedLog.songId}
                      </Typography>
                    )}
                  </Box>
                </>
              )}

              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Zmienione Wartości
                    </Typography>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        mt: 1,
                        bgcolor: (theme) =>
                          theme.palette.mode === 'dark'
                            ? 'rgba(255, 255, 255, 0.05)'
                            : 'rgba(0, 0, 0, 0.02)',
                      }}
                    >
                      <Stack spacing={2}>
                        {Object.entries(selectedLog.metadata).map(([key, value]) => {
                          const isChangeObject = value && typeof value === 'object' && 'old' in value && 'new' in value;
                          const displayKey = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
                          
                          return (
                            <Box key={key}>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem', mb: 1, display: 'block' }}
                              >
                                {displayKey}
                              </Typography>
                              {isChangeObject ? (
                                <Stack spacing={1}>
                                  <Box
                                    sx={{
                                      p: 1.5,
                                      borderRadius: 1,
                                      bgcolor: (theme) =>
                                        theme.palette.mode === 'dark'
                                          ? 'rgba(211, 47, 47, 0.1)'
                                          : 'rgba(211, 47, 47, 0.05)',
                                      border: (theme) =>
                                        theme.palette.mode === 'dark'
                                          ? '1px solid rgba(211, 47, 47, 0.3)'
                                          : '1px solid rgba(211, 47, 47, 0.2)',
                                    }}
                                  >
                                    <Typography variant="caption" color="error" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>
                                      Stara wartość:
                                    </Typography>
                                    <Typography
                                      variant="body2"
                                      sx={{
                                        fontFamily: 'monospace',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                        fontSize: '0.875rem',
                                      }}
                                    >
                                      {value.old === null || value.old === undefined ? '(puste)' : String(value.old)}
                                    </Typography>
                                  </Box>
                                  <Box
                                    sx={{
                                      p: 1.5,
                                      borderRadius: 1,
                                      bgcolor: (theme) =>
                                        theme.palette.mode === 'dark'
                                          ? 'rgba(46, 125, 50, 0.1)'
                                          : 'rgba(46, 125, 50, 0.05)',
                                      border: (theme) =>
                                        theme.palette.mode === 'dark'
                                          ? '1px solid rgba(46, 125, 50, 0.3)'
                                          : '1px solid rgba(46, 125, 50, 0.2)',
                                    }}
                                  >
                                    <Typography variant="caption" color="success.main" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>
                                      Nowa wartość:
                                    </Typography>
                                    <Typography
                                      variant="body2"
                                      component="div"
                                      sx={{
                                        fontFamily: 'monospace',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                        fontSize: '0.875rem',
                                      }}
                                    >
                                      {(() => {
                                        const oldVal = value.old === null || value.old === undefined ? '' : String(value.old);
                                        const newVal = value.new === null || value.new === undefined ? '' : String(value.new);
                                        
                                        // If values are the same, just show it
                                        if (oldVal === newVal) {
                                          return newVal || '(puste)';
                                        }
                                        
                                        // If old is empty, show all new value in bold
                                        if (!oldVal) {
                                          return <span style={{ fontWeight: 'bold' }}>{newVal || '(puste)'}</span>;
                                        }
                                        
                                        // If new is empty
                                        if (!newVal) {
                                          return '(puste)';
                                        }
                                        
                                        // Use word-based diff for better readability
                                        const oldWords = oldVal.split(/(\s+)/);
                                        const newWords = newVal.split(/(\s+)/);
                                        const parts: Array<{ text: string; changed: boolean }> = [];
                                        
                                        // Simple word-by-word comparison
                                        let oldIdx = 0;
                                        let newIdx = 0;
                                        
                                        while (oldIdx < oldWords.length || newIdx < newWords.length) {
                                          if (oldIdx < oldWords.length && newIdx < newWords.length && oldWords[oldIdx] === newWords[newIdx]) {
                                            // Same word
                                            if (parts.length === 0 || parts[parts.length - 1].changed) {
                                              parts.push({ text: newWords[newIdx], changed: false });
                                            } else {
                                              parts[parts.length - 1].text += newWords[newIdx];
                                            }
                                            oldIdx++;
                                            newIdx++;
                                          } else {
                                            // Different - add new word as changed
                                            if (newIdx < newWords.length) {
                                              if (parts.length === 0 || !parts[parts.length - 1].changed) {
                                                parts.push({ text: newWords[newIdx], changed: true });
                                              } else {
                                                parts[parts.length - 1].text += newWords[newIdx];
                                              }
                                              newIdx++;
                                            } else {
                                              oldIdx++;
                                            }
                                          }
                                        }
                                        
                                        return (
                                          <>
                                            {parts.map((part, idx) => (
                                              <span 
                                                key={idx} 
                                                style={{ 
                                                  fontWeight: part.changed ? 'bold' : 'normal',
                                                  backgroundColor: part.changed ? 'rgba(46, 125, 50, 0.2)' : 'transparent',
                                                }}
                                              >
                                                {part.text}
                                              </span>
                                            ))}
                                          </>
                                        );
                                      })()}
                                    </Typography>
                                  </Box>
                                </Stack>
                              ) : (
                                <Box
                                  sx={{
                                    p: 1.5,
                                    borderRadius: 1,
                                    bgcolor: (theme) =>
                                      theme.palette.mode === 'dark'
                                        ? 'rgba(255, 255, 255, 0.05)'
                                        : 'rgba(0, 0, 0, 0.02)',
                                    border: (theme) =>
                                      theme.palette.mode === 'dark'
                                        ? '1px solid rgba(255, 255, 255, 0.1)'
                                        : '1px solid rgba(0, 0, 0, 0.1)',
                                  }}
                                >
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      fontFamily: 'monospace',
                                      whiteSpace: 'pre-wrap',
                                      wordBreak: 'break-word',
                                    }}
                                  >
                                    {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                          );
                        })}
                      </Stack>
                    </Paper>
                  </Box>
                </>
              )}

              <Divider />

              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Adres IP
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {selectedLog.ipAddress || '-'}
                </Typography>
              </Box>

              {selectedLog.userAgent && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      User Agent
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                      {selectedLog.userAgent}
                    </Typography>
                  </Box>
                </>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetails}>Zamknij</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

