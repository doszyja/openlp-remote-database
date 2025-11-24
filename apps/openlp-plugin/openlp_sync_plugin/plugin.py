"""
Main plugin class for OpenLP Sync Plugin
"""

import logging
from typing import Optional

from openlp.core.common import Settings
from openlp.core.common.registry import Registry
from openlp.core.plugins import Plugin, StringContent
from openlp.core.ui import MainWindow
from PyQt5.QtCore import QObject, pyqtSignal, QThread
from PyQt5.QtWidgets import QMessageBox, QPushButton, QDialog, QVBoxLayout, QLabel, QProgressBar

from .api_client import ApiClient
from .sync_service import SyncService
from .settings_dialog import SettingsDialog

log = logging.getLogger(__name__)


class SyncWorker(QThread):
    """Worker thread for sync operation"""
    
    progress = pyqtSignal(str)  # Progress message
    finished = pyqtSignal(bool, str)  # success, message
    
    def __init__(self, api_url: str, api_key: Optional[str], db_path: str):
        super().__init__()
        self.api_url = api_url
        self.api_key = api_key
        self.db_path = db_path
        self.cancelled = False
    
    def run(self):
        """Run the sync operation"""
        try:
            self.progress.emit("Łączenie z API...")
            api_client = ApiClient(self.api_url, self.api_key)
            
            self.progress.emit("Pobieranie pieśni z API...")
            songs = api_client.fetch_all_songs()
            
            if self.cancelled:
                self.finished.emit(False, "Synchronizacja anulowana")
                return
            
            self.progress.emit(f"Znaleziono {len(songs)} pieśni. Aktualizowanie bazy danych...")
            sync_service = SyncService(self.db_path)
            
            result = sync_service.sync_songs(songs, progress_callback=self.progress.emit)
            
            if self.cancelled:
                self.finished.emit(False, "Synchronizacja anulowana")
                return
            
            message = f"Synchronizacja zakończona!\n\nUtworzono: {result['created']}\nZaktualizowano: {result['updated']}\nBłędy: {result['errors']}"
            self.finished.emit(True, message)
            
        except Exception as e:
            log.exception("Error during sync")
            self.finished.emit(False, f"Błąd podczas synchronizacji: {str(e)}")
    
    def cancel(self):
        """Cancel the sync operation"""
        self.cancelled = True


class SyncDialog(QDialog):
    """Dialog for sync progress"""
    
    def __init__(self, parent, api_url: str, api_key: Optional[str], db_path: str):
        super().__init__(parent)
        self.setWindowTitle("Synchronizacja pieśni")
        self.setMinimumWidth(400)
        
        layout = QVBoxLayout()
        
        self.status_label = QLabel("Przygotowywanie synchronizacji...")
        layout.addWidget(self.status_label)
        
        self.progress_bar = QProgressBar()
        self.progress_bar.setRange(0, 0)  # Indeterminate progress
        layout.addWidget(self.progress_bar)
        
        self.cancel_button = QPushButton("Anuluj")
        self.cancel_button.clicked.connect(self.cancel_sync)
        layout.addWidget(self.cancel_button)
        
        self.setLayout(layout)
        
        # Start sync worker
        self.worker = SyncWorker(api_url, api_key, db_path)
        self.worker.progress.connect(self.update_progress)
        self.worker.finished.connect(self.sync_finished)
        self.worker.start()
    
    def update_progress(self, message: str):
        """Update progress message"""
        self.status_label.setText(message)
    
    def cancel_sync(self):
        """Cancel the sync operation"""
        self.worker.cancel()
        self.cancel_button.setEnabled(False)
        self.status_label.setText("Anulowanie...")
    
    def sync_finished(self, success: bool, message: str):
        """Handle sync completion"""
        self.progress_bar.setRange(0, 100)
        self.progress_bar.setValue(100)
        self.cancel_button.setText("Zamknij")
        self.cancel_button.clicked.disconnect()
        self.cancel_button.clicked.connect(self.accept)
        self.cancel_button.setEnabled(True)
        
        if success:
            QMessageBox.information(self, "Synchronizacja zakończona", message)
        else:
            QMessageBox.critical(self, "Błąd synchronizacji", message)
        
        self.status_label.setText(message)


class OpenLPSyncPlugin(Plugin):
    """
    OpenLP Sync Plugin
    
    Adds a "Synchronizuj" button to sync songs from the backend API
    """
    
    def __init__(self):
        """Initialize the plugin"""
        super().__init__()
        self.logo = None
        self.weight = 0
        self.icon_path = ':/plugins/openlp_sync_plugin/icon.png'
        self.settings_tab = None
    
    def initialise(self):
        """Initialize the plugin"""
        log.info("Initializing OpenLP Sync Plugin")
        
        # Get main window
        main_window = Registry().get('main_window')
        if not main_window:
            log.error("Main window not found")
            return False
        
        # Add sync button to toolbar
        self.add_sync_button(main_window)
        
        # Load settings
        self.load_settings()
        
        return True
    
    def add_sync_button(self, main_window: MainWindow):
        """Add sync button to the main window"""
        # Get the toolbar or create a new action
        # OpenLP uses actions for menu items
        from PyQt5.QtWidgets import QAction
        from PyQt5.QtGui import QIcon
        
        # Add sync action
        sync_action = QAction("Synchronizuj", main_window)
        sync_action.setToolTip("Synchronizuj pieśni z API")
        sync_action.triggered.connect(self.on_sync_clicked)
        
        # Add settings action
        settings_action = QAction("Ustawienia synchronizacji...", main_window)
        settings_action.setToolTip("Konfiguruj ustawienia synchronizacji")
        settings_action.triggered.connect(self.on_settings_clicked)
        
        # Add to Tools menu if available
        menu_bar = main_window.menuBar()
        tools_menu = None
        
        # Try to find existing Tools menu
        for action in menu_bar.actions():
            if action.text() == "&Tools" or action.text() == "Narzędzia":
                tools_menu = action.menu()
                break
        
        if not tools_menu:
            # Create new Tools menu
            tools_menu = menu_bar.addMenu("Narzędzia")
        
        tools_menu.addAction(sync_action)
        tools_menu.addSeparator()
        tools_menu.addAction(settings_action)
    
    def on_sync_clicked(self):
        """Handle sync button click"""
        # Get settings
        api_url = Settings().value('openlp_sync_plugin/api_url')
        api_key = Settings().value('openlp_sync_plugin/api_key')
        db_path = Settings().value('openlp_sync_plugin/db_path')
        
        if not api_url:
            QMessageBox.warning(
                None,
                "Brak konfiguracji",
                "Proszę skonfigurować URL API w ustawieniach wtyczki."
            )
            return
        
        if not db_path:
            # Try to get default OpenLP database path
            import os
            from pathlib import Path
            home = Path.home()
            # Common OpenLP database locations
            possible_paths = [
                home / '.openlp' / 'songs.sqlite',
                home / 'AppData' / 'Local' / 'OpenLP' / 'songs.sqlite',
                os.path.expanduser('~/.openlp/songs.sqlite'),
            ]
            
            for path in possible_paths:
                if os.path.exists(path):
                    db_path = str(path)
                    break
            
            if not db_path:
                QMessageBox.warning(
                    None,
                    "Nie znaleziono bazy danych",
                    "Proszę skonfigurować ścieżkę do bazy danych OpenLP w ustawieniach wtyczki."
                )
                return
        
        # Show sync dialog
        dialog = SyncDialog(None, api_url, api_key, db_path)
        dialog.exec_()
    
    def on_settings_clicked(self):
        """Handle settings button click"""
        dialog = SettingsDialog()
        dialog.exec_()
    
    def load_settings(self):
        """Load plugin settings"""
        settings = Settings()
        
        # Set defaults if not exists
        if not settings.value('openlp_sync_plugin/api_url'):
            settings.setValue('openlp_sync_plugin/api_url', 'http://localhost:3000/api')
        
        if not settings.value('openlp_sync_plugin/db_path'):
            # Will be auto-detected if not set
            pass
    
    def finalise(self):
        """Finalize the plugin"""
        log.info("Finalizing OpenLP Sync Plugin")
        return True

