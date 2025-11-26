#!/bin/bash
# Bash script to install OpenLP Sync Plugin on Linux/macOS

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_SOURCE="$SCRIPT_DIR/openlp_sync_plugin"

# Determine plugins directory based on OS
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    PLUGIN_DEST="$HOME/.openlp/plugins/openlp_sync_plugin"
    PLUGINS_DIR="$HOME/.openlp/plugins"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    PLUGIN_DEST="$HOME/Library/Application Support/OpenLP/plugins/openlp_sync_plugin"
    PLUGINS_DIR="$HOME/Library/Application Support/OpenLP/plugins"
else
    echo "Nieobsługiwany system operacyjny: $OSTYPE"
    exit 1
fi

echo "Instalowanie OpenLP Sync Plugin..."
echo ""

# Check if source exists
if [ ! -d "$PLUGIN_SOURCE" ]; then
    echo "Błąd: Nie znaleziono folderu wtyczki: $PLUGIN_SOURCE"
    echo "Upewnij się, że uruchamiasz skrypt z folderu apps/openlp-plugin"
    exit 1
fi

# Create plugins directory if it doesn't exist
if [ ! -d "$PLUGINS_DIR" ]; then
    echo "Tworzenie folderu wtyczek: $PLUGINS_DIR"
    mkdir -p "$PLUGINS_DIR"
fi

# Remove existing plugin if present
if [ -d "$PLUGIN_DEST" ]; then
    echo "Usuwanie istniejącej wersji wtyczki..."
    rm -rf "$PLUGIN_DEST"
fi

# Copy plugin
echo "Kopiowanie wtyczki..."
echo "  Z: $PLUGIN_SOURCE"
echo "  Do: $PLUGIN_DEST"

cp -r "$PLUGIN_SOURCE" "$PLUGIN_DEST"

if [ -d "$PLUGIN_DEST" ]; then
    echo ""
    echo "✓ Wtyczka została zainstalowana pomyślnie!"
    echo ""
    echo "Następne kroki:"
    echo "1. Uruchom OpenLP"
    echo "2. Przejdź do: Ustawienia → Zarządzaj wtyczkami"
    echo "3. Znajdź 'OpenLP Sync Plugin' i włącz go"
    echo "4. Skonfiguruj wtyczkę: Narzędzia → Ustawienia synchronizacji..."
else
    echo ""
    echo "✗ Błąd podczas instalacji wtyczki"
    exit 1
fi


