import {
  Typography,
  Box,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import { History as HistoryIcon } from '@mui/icons-material';

interface ChangeItem {
  date: string;
  changes: string[];
}

const recentChanges: ChangeItem[] = [
  {
    date: '2025-01-24',
    changes: [
      'Poprawiono układ na stronie szczegółów pieśni w widoku 1024px (węższa kolumna nawigacyjna, ograniczona szerokość kontenera, dodatkowe odstępy)',
      'Przełącznik normalny/pełny widok jest teraz widoczny dopiero od szerokości lg, więc przyciski mieszczą się na mniejszych ekranach',
      'Sekcje „Instrukcja użytkownika” i „Ostatnie zmiany” na stronie głównej przywrócono do kompaktowego stylu z dopasowanym tłem i cieniami w obu trybach',
    ],
  },
  {
    date: '2025-01-23',
    changes: [
      'Dodano debounce (450ms) do filtrów w logach audytu',
      'Zmniejszono odstęp między przyciskami "Edytuj" i "Usuń" na stronie szczegółów pieśni',
      'Dodano link do zgłaszania błędów w stopce z możliwością kontaktu przez Discord',
      'Poprawiono wyświetlanie awatara użytkownika - teraz pokazuje pusty awatar dla użytkownika deweloperskiego',
      'Poprawiono wyświetlanie menu nawigacyjnego na urządzeniach mobilnych',
      'Przeniesiono przycisk "Dev Login" ze stopki na stronę główną jako osobna karta',
      'Dodano przełącznik między trybem administratora a zwykłym użytkownikiem dla logowania deweloperskiego',
      'Poprawiono czytelność przycisków i filtrów w trybie ciemnym',
      'Zoptymalizowano układ filtrów w logach audytu - kompaktowy w jednym rzędzie na desktopie, zawijanie na mobile',
      'Zmniejszono limit wyświetlanych wpisów w logach audytu z 50 do 25',
      'Poprawiono wysokość elementów menu nawigacyjnego dla lepszej spójności wizualnej',
      'Przeniesiono element "Logi Audytu" do sekcji z "Ustawienia" i "Wyloguj"',
      'Poprawiono problem z edycją pieśni przez użytkownika deweloperskiego z uprawnieniami administratora',
    ],
  },
  {
    date: '2025-01-22',
    changes: [
      'Ulepszono zarządzanie zwrotkami - dodano możliwość edycji poszczególnych zwrotek',
      'Dodano system powiadomień dla operacji sukcesu i błędów',
      'Zoptymalizowano responsywność interfejsu dla urządzeń mobilnych',
      'Dodano debounce do pól wyszukiwania (300ms)',
      'Poprawiono nawigację między pieśniami - usunięto migotanie strony',
      'Dodano możliwość przełączania między widokiem pełnoekranowym a normalnym',
      'Zaktualizowano system testów - migracja z Jest na Vitest',
      'Dodano konfigurację Docker dla środowiska deweloperskiego',
    ],
  },
  {
    date: '2025-01-22 (Wcześniej)',
    changes: [
      'Migracja z PostgreSQL/Prisma na MongoDB/Mongoose',
      'Implementacja pełnego systemu CRUD dla pieśni',
      'Dodano autentykację przez Discord OAuth',
      'Dodano system logów audytu',
      'Utworzono strukturę monorepo z pnpm workspaces',
      'Skonfigurowano Docker i Docker Compose',
      'Dodano Material UI z responsywnym designem',
    ],
  },
];

export default function RecentChangesPage() {
  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - 64px)',
        py: { xs: 3, sm: 4, md: 5 },
        px: { xs: 2, sm: 3, md: 4 },
      }}
    >
      <Box
        sx={{
          maxWidth: 900,
          mx: 'auto',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            mb: 4,
          }}
        >
          <HistoryIcon sx={{ fontSize: { xs: 32, sm: 40 }, color: (theme) => theme.palette.mode === 'dark' ? '#E8EAF6' : theme.palette.primary.main }} />
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 500,
              fontSize: { xs: '1.75rem', sm: '2rem', md: '2.5rem' },
              color: 'text.primary',
            }}
          >
            Ostatnie zmiany
          </Typography>
        </Box>

        {/* Changes List */}
        <Paper
          elevation={0}
          sx={{
            bgcolor: 'background.paper',
            boxShadow: (theme) =>
              theme.palette.mode === 'dark'
                ? '0 4px 16px rgba(0, 0, 0, 0.2)'
                : '0 4px 16px rgba(0, 0, 0, 0.08)',
            border: (theme) =>
              theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.05)',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <List disablePadding>
            {recentChanges.map((changeGroup, index) => (
              <Box key={changeGroup.date}>
                {index > 0 && <Divider />}
                <ListItem
                  sx={{
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    py: 3,
                    px: { xs: 2, sm: 3 },
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      mb: 2,
                      color: (theme) => theme.palette.mode === 'dark' ? '#E8EAF6' : theme.palette.primary.main,
                      fontSize: { xs: '1rem', sm: '1.125rem' },
                    }}
                  >
                    {changeGroup.date}
                  </Typography>
                  <List disablePadding sx={{ width: '100%' }}>
                    {changeGroup.changes.map((change, changeIndex) => (
                      <ListItem
                        key={changeIndex}
                        sx={{
                          py: 0.5,
                          px: 0,
                          alignItems: 'flex-start',
                        }}
                      >
                        <Box
                          component="span"
                          sx={{
                            display: 'inline-block',
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            bgcolor: (theme) => theme.palette.mode === 'dark' ? '#E8EAF6' : theme.palette.primary.main,
                            mt: 1.25,
                            mr: 1.5,
                            flexShrink: 0,
                          }}
                        />
                        <ListItemText
                          primary={change}
                          primaryTypographyProps={{
                            variant: 'body1',
                            sx: {
                              fontSize: { xs: '0.875rem', sm: '0.9375rem' },
                              lineHeight: 1.6,
                              color: 'text.primary',
                            },
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </ListItem>
              </Box>
            ))}
          </List>
        </Paper>

        {/* Footer note */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mt: 3,
            textAlign: 'center',
            fontSize: { xs: '0.75rem', sm: '0.875rem' },
          }}
        >
          Lista zmian jest aktualizowana na bieżąco wraz z rozwojem aplikacji.
        </Typography>
      </Box>
    </Box>
  );
}

