import {
  Typography,
  Box,
  Paper,
  Stack,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  LibraryMusic as LibraryMusicIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Visibility as VisibilityIcon,
  Lock as LockIcon,
  History as HistoryIcon,
} from '@mui/icons-material';

export default function HelpPage() {
  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - 64px)',
        display: 'flex',
        flexDirection: 'column',
        background: theme =>
          theme.palette.mode === 'dark'
            ? 'linear-gradient(180deg, #1A2332 0%, #1B2535 30%, #1E2A3A 60%, #1F2D3F 100%)'
            : 'linear-gradient(180deg, #ffffff 0%, #f8f9fa 30%, #f0f2f5 60%, #e8ecf1 100%)',
        position: 'relative',
        overflow: 'hidden',
        py: { xs: 4, sm: 6, md: 8 },
        px: { xs: 3, sm: 4 },
      }}
    >
      {/* Decorative elements */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: theme => (theme.palette.mode === 'dark' ? 0.02 : 0.015),
          backgroundImage:
            'radial-gradient(circle at 20% 30%, currentColor 0%, transparent 40%), radial-gradient(circle at 80% 70%, currentColor 0%, transparent 40%)',
          pointerEvents: 'none',
        }}
      />

      <Box
        sx={{
          flexGrow: 1,
          maxWidth: { xs: '100%', md: 900, lg: 1000 },
          width: '100%',
          mx: 'auto',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Header */}
        <Box sx={{ mb: 4, textAlign: { xs: 'left', md: 'center' } }}>
          <Typography
            variant="h3"
            component="h1"
            sx={{
              fontWeight: 300,
              fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
              letterSpacing: { xs: 1, sm: 2 },
              color: 'text.primary',
              mb: 2,
              fontFamily: '"Playfair Display", "Georgia", serif',
            }}
          >
            Instrukcja Użytkownika
          </Typography>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 400,
              color: 'text.secondary',
              fontSize: { xs: '0.9rem', sm: '1rem' },
            }}
          >
            Przewodnik po funkcjonalnościach aplikacji do zarządzania pieśniami zborowymi
          </Typography>
        </Box>

        <Stack spacing={4}>
          {/* Przeglądanie pieśni */}
          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, sm: 4 },
              bgcolor: 'background.paper',
              boxShadow: theme =>
                theme.palette.mode === 'dark'
                  ? '0 4px 16px rgba(0, 0, 0, 0.2)'
                  : '0 4px 16px rgba(0, 0, 0, 0.08)',
              border: theme =>
                theme.palette.mode === 'dark'
                  ? '1px solid rgba(255, 255, 255, 0.1)'
                  : '1px solid rgba(0, 0, 0, 0.05)',
              borderRadius: 2,
            }}
          >
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <SearchIcon
                sx={{
                  fontSize: { xs: 20, sm: 28, md: 32 },
                  color: theme =>
                    theme.palette.mode === 'dark' ? '#E8EAF6' : theme.palette.primary.main,
                }}
              />
              <Typography
                variant="h5"
                component="h2"
                sx={{ fontWeight: 500, fontSize: { xs: '1.1rem', sm: '1.25rem', md: '1.5rem' } }}
              >
                Przeglądanie i Wyszukiwanie Pieśni
              </Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="body1" color="text.secondary" paragraph>
              Wszyscy użytkownicy mogą przeglądać i wyszukiwać pieśni w bibliotece:
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon sx={{ minWidth: { xs: 36, sm: 40 } }}>
                  <LibraryMusicIcon
                    sx={{
                      fontSize: { xs: 18, sm: 24 },
                      color: theme =>
                        theme.palette.mode === 'dark' ? '#E8EAF6' : theme.palette.primary.main,
                    }}
                  />
                </ListItemIcon>
                <ListItemText
                  primary="Lista pieśni"
                  secondary="Na stronie głównej kliknij 'Przeglądaj Pieśni', aby zobaczyć wszystkie dostępne pieśni w bibliotece."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon sx={{ minWidth: { xs: 36, sm: 40 } }}>
                  <SearchIcon
                    sx={{
                      fontSize: { xs: 18, sm: 24 },
                      color: theme =>
                        theme.palette.mode === 'dark' ? '#E8EAF6' : theme.palette.primary.main,
                    }}
                  />
                </ListItemIcon>
                <ListItemText
                  primary="Wyszukiwanie"
                  secondary="Użyj pola wyszukiwania na górze strony, aby szybko znaleźć konkretną pieśń po tytule lub treści."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon sx={{ minWidth: { xs: 36, sm: 40 } }}>
                  <VisibilityIcon
                    sx={{
                      fontSize: { xs: 18, sm: 24 },
                      color: theme =>
                        theme.palette.mode === 'dark' ? '#E8EAF6' : theme.palette.primary.main,
                    }}
                  />
                </ListItemIcon>
                <ListItemText
                  primary="Szczegóły pieśni"
                  secondary="Kliknij na dowolną pieśń z listy, aby zobaczyć jej pełną treść, w tym wszystkie zwrotki i refreny."
                />
              </ListItem>
            </List>
          </Paper>

          {/* Edycja i zarządzanie */}
          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, sm: 4 },
              bgcolor: 'background.paper',
              boxShadow: theme =>
                theme.palette.mode === 'dark'
                  ? '0 4px 16px rgba(0, 0, 0, 0.2)'
                  : '0 4px 16px rgba(0, 0, 0, 0.08)',
              border: theme =>
                theme.palette.mode === 'dark'
                  ? '1px solid rgba(255, 255, 255, 0.1)'
                  : '1px solid rgba(0, 0, 0, 0.05)',
              borderRadius: 2,
            }}
          >
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <LockIcon
                sx={{
                  fontSize: { xs: 20, sm: 28, md: 32 },
                  color: theme =>
                    theme.palette.mode === 'dark' ? '#E8EAF6' : theme.palette.primary.main,
                }}
              />
              <Typography
                variant="h5"
                component="h2"
                sx={{ fontWeight: 500, fontSize: { xs: '1.1rem', sm: '1.25rem', md: '1.5rem' } }}
              >
                Edycja i Zarządzanie Pieśniami
              </Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="body1" color="text.secondary" paragraph>
              Aby edytować, dodawać lub usuwać pieśni, musisz być zalogowany przez Discord:
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon sx={{ minWidth: { xs: 36, sm: 40 } }}>
                  <LockIcon
                    sx={{
                      fontSize: { xs: 18, sm: 24 },
                      color: theme =>
                        theme.palette.mode === 'dark' ? '#E8EAF6' : theme.palette.primary.main,
                    }}
                  />
                </ListItemIcon>
                <ListItemText
                  primary="Logowanie"
                  secondary="Kliknij ikonę ustawień w prawym górnym rogu, a następnie 'Zaloguj', aby zalogować się przez Discord. Wymagana jest odpowiednia rola na serwerze Discord 'Uwielbienie'."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon sx={{ minWidth: { xs: 36, sm: 40 } }}>
                  <AddIcon
                    sx={{
                      fontSize: { xs: 18, sm: 24 },
                      color: theme =>
                        theme.palette.mode === 'dark' ? '#E8EAF6' : theme.palette.primary.main,
                    }}
                  />
                </ListItemIcon>
                <ListItemText
                  primary="Dodawanie nowych pieśni"
                  secondary="Po zalogowaniu, na stronie głównej pojawi się przycisk 'Dodaj Nową Pieśń'. Możesz również użyć przycisku 'Dodaj Pieśń' na liście pieśni."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <EditIcon
                    sx={{
                      color: theme =>
                        theme.palette.mode === 'dark' ? '#E8EAF6' : theme.palette.primary.main,
                    }}
                  />
                </ListItemIcon>
                <ListItemText
                  primary="Edycja pieśni"
                  secondary="Na stronie szczegółów pieśni, po zalogowaniu, zobaczysz przycisk 'Edytuj'. Możesz modyfikować tytuł, autora, kategorię, język oraz treść zwrotek i refrenów."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon sx={{ minWidth: { xs: 36, sm: 40 } }}>
                  <DeleteIcon
                    sx={{
                      fontSize: { xs: 18, sm: 24 },
                      color: theme =>
                        theme.palette.mode === 'dark' ? '#E8EAF6' : theme.palette.primary.main,
                    }}
                  />
                </ListItemIcon>
                <ListItemText
                  primary="Usuwanie pieśni"
                  secondary="Na stronie szczegółów pieśni, po zalogowaniu, zobaczysz przycisk 'Usuń'. Usunięcie pieśni jest trwałe i wymaga potwierdzenia."
                />
              </ListItem>
            </List>
          </Paper>

          {/* Funkcje zaawansowane */}
          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, sm: 4 },
              bgcolor: 'background.paper',
              boxShadow: theme =>
                theme.palette.mode === 'dark'
                  ? '0 4px 16px rgba(0, 0, 0, 0.2)'
                  : '0 4px 16px rgba(0, 0, 0, 0.08)',
              border: theme =>
                theme.palette.mode === 'dark'
                  ? '1px solid rgba(255, 255, 255, 0.1)'
                  : '1px solid rgba(0, 0, 0, 0.05)',
              borderRadius: 2,
            }}
          >
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <DownloadIcon
                sx={{
                  fontSize: { xs: 20, sm: 28, md: 32 },
                  color: theme =>
                    theme.palette.mode === 'dark' ? '#E8EAF6' : theme.palette.primary.main,
                }}
              />
              <Typography
                variant="h5"
                component="h2"
                sx={{ fontWeight: 500, fontSize: { xs: '1.1rem', sm: '1.25rem', md: '1.5rem' } }}
              >
                Funkcje Zaawansowane
              </Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <List>
              <ListItem>
                <ListItemIcon sx={{ minWidth: { xs: 36, sm: 40 } }}>
                  <DownloadIcon
                    sx={{
                      fontSize: { xs: 18, sm: 24 },
                      color: theme =>
                        theme.palette.mode === 'dark' ? '#E8EAF6' : theme.palette.primary.main,
                    }}
                  />
                </ListItemIcon>
                <ListItemText
                  primary="Eksport do ZIP"
                  secondary="Po zalogowaniu, na liście pieśni dostępny jest przycisk 'Eksportuj', który pozwala pobrać wszystkie pieśni w formacie XML, gotowe do importu do OpenLP. Każda pieśń jest zapisana jako osobny plik XML."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon sx={{ minWidth: { xs: 36, sm: 40 } }}>
                  <EditIcon
                    sx={{
                      fontSize: { xs: 18, sm: 24 },
                      color: theme =>
                        theme.palette.mode === 'dark' ? '#E8EAF6' : theme.palette.primary.main,
                    }}
                  />
                </ListItemIcon>
                <ListItemText
                  primary="Kolejność zwrotek"
                  secondary="Podczas edycji pieśni możesz określić kolejność odtwarzania zwrotek i refrenów. Na przykład: 'v1 v2 c1 c3 c1 v2 c1 v1' pozwala na powtarzanie konkretnych zwrotek w określonej kolejności."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon sx={{ minWidth: { xs: 36, sm: 40 } }}>
                  <HistoryIcon
                    sx={{
                      fontSize: { xs: 18, sm: 24 },
                      color: theme =>
                        theme.palette.mode === 'dark' ? '#E8EAF6' : theme.palette.primary.main,
                    }}
                  />
                </ListItemIcon>
                <ListItemText
                  primary="Historia zmian (tylko dla administratorów)"
                  secondary="Administratorzy mają dostęp do strony 'Historia zmian', która pokazuje wszystkie operacje wykonane w systemie: logowania, dodawanie, edycję i usuwanie pieśni, oraz eksporty ZIP."
                />
              </ListItem>
            </List>
          </Paper>

          {/* Wskazówki */}
          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, sm: 4 },
              bgcolor: 'background.paper',
              boxShadow: theme =>
                theme.palette.mode === 'dark'
                  ? '0 4px 16px rgba(0, 0, 0, 0.2)'
                  : '0 4px 16px rgba(0, 0, 0, 0.08)',
              border: theme =>
                theme.palette.mode === 'dark'
                  ? '1px solid rgba(255, 255, 255, 0.1)'
                  : '1px solid rgba(0, 0, 0, 0.05)',
              borderRadius: 2,
            }}
          >
            <Typography variant="h5" component="h2" sx={{ fontWeight: 500, mb: 2 }}>
              Wskazówki
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <List>
              <ListItem>
                <ListItemText
                  primary="Synchronizacja z OpenLP"
                  secondary="Aplikacja synchronizuje pieśni jednokierunkowo: z bazy danych do OpenLP. Eksportuj pieśni do formatu ZIP i zaimportuj je w OpenLP, aby zaktualizować bibliotekę."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Formatowanie tekstu"
                  secondary="Podczas edycji pieśni możesz formatować tekst zwrotek i refrenów. Każda zwrotka jest przechowywana osobno, co ułatwia zarządzanie treścią."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Wyszukiwanie"
                  secondary="Wyszukiwarka przeszukuje zarówno tytuły, jak i treść pieśni, co ułatwia szybkie znalezienie konkretnej pieśni."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Tryb ciemny"
                  secondary="Możesz przełączyć się między trybem jasnym a ciemnym w ustawieniach (ikona koła zębatego w prawym górnym rogu)."
                />
              </ListItem>
            </List>
          </Paper>

          {/* Pomoc techniczna */}
          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, sm: 4 },
              bgcolor: 'background.paper',
              boxShadow: theme =>
                theme.palette.mode === 'dark'
                  ? '0 4px 16px rgba(0, 0, 0, 0.2)'
                  : '0 4px 16px rgba(0, 0, 0, 0.08)',
              border: theme =>
                theme.palette.mode === 'dark'
                  ? '1px solid rgba(255, 255, 255, 0.1)'
                  : '1px solid rgba(0, 0, 0, 0.05)',
              borderRadius: 2,
            }}
          >
            <Typography variant="h5" component="h2" sx={{ fontWeight: 500, mb: 2 }}>
              Pomoc Techniczna
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="body1" color="text.secondary" paragraph>
              Jeśli masz problemy z logowaniem lub dostępem do funkcji edycji:
            </Typography>
            <List>
              <ListItem>
                <ListItemText
                  primary="Brak uprawnień do logowania"
                  secondary="Upewnij się, że masz odpowiednią rolę na serwerze Discord 'Uwielbienie'. Skontaktuj się z administratorem, aby uzyskać dostęp."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Problemy z synchronizacją"
                  secondary="Jeśli pieśni nie synchronizują się poprawnie, sprawdź format plików XML po eksporcie. Upewnij się, że OpenLP obsługuje import plików XML."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Błędy podczas edycji"
                  secondary="Jeśli napotkasz błędy podczas edycji pieśni, odśwież stronę i spróbuj ponownie. Wszystkie zmiany są automatycznie zapisywane po kliknięciu 'Zapisz'."
                />
              </ListItem>
            </List>
          </Paper>
        </Stack>
      </Box>
    </Box>
  );
}
