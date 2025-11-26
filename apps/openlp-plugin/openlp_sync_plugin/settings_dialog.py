"""
Settings dialog for OpenLP Sync Plugin
"""

from PyQt5.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QLabel, QLineEdit,
    QPushButton, QFileDialog, QMessageBox, QFormLayout
)
from PyQt5.QtCore import Qt
from openlp.core.common import Settings


class SettingsDialog(QDialog):
    """Settings dialog for plugin configuration"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Ustawienia OpenLP Sync Plugin")
        self.setMinimumWidth(500)
        
        layout = QFormLayout()
        
        # API URL
        self.api_url_edit = QLineEdit()
        self.api_url_edit.setPlaceholderText("http://localhost:3000/api")
        layout.addRow("URL API:", self.api_url_edit)
        
        # API Key
        self.api_key_edit = QLineEdit()
        self.api_key_edit.setEchoMode(QLineEdit.Password)
        self.api_key_edit.setPlaceholderText("Opcjonalnie - klucz API")
        layout.addRow("Klucz API:", self.api_key_edit)
        
        # Database path
        db_layout = QHBoxLayout()
        self.db_path_edit = QLineEdit()
        self.db_path_edit.setPlaceholderText("Auto-wykrywane jeśli puste")
        db_browse_btn = QPushButton("Przeglądaj...")
        db_browse_btn.clicked.connect(self.browse_database)
        db_layout.addWidget(self.db_path_edit)
        db_layout.addWidget(db_browse_btn)
        layout.addRow("Ścieżka do bazy danych:", db_layout)
        
        # Buttons
        button_layout = QHBoxLayout()
        button_layout.addStretch()
        
        save_btn = QPushButton("Zapisz")
        save_btn.clicked.connect(self.save_settings)
        button_layout.addWidget(save_btn)
        
        cancel_btn = QPushButton("Anuluj")
        cancel_btn.clicked.connect(self.reject)
        button_layout.addWidget(cancel_btn)
        
        main_layout = QVBoxLayout()
        main_layout.addLayout(layout)
        main_layout.addLayout(button_layout)
        
        self.setLayout(main_layout)
        
        # Load existing settings
        self.load_settings()
    
    def load_settings(self):
        """Load settings from OpenLP settings"""
        settings = Settings()
        
        api_url = settings.value('openlp_sync_plugin/api_url')
        if api_url:
            self.api_url_edit.setText(api_url)
        else:
            self.api_url_edit.setText('http://localhost:3000/api')
        
        api_key = settings.value('openlp_sync_plugin/api_key')
        if api_key:
            self.api_key_edit.setText(api_key)
        
        db_path = settings.value('openlp_sync_plugin/db_path')
        if db_path:
            self.db_path_edit.setText(db_path)
    
    def save_settings(self):
        """Save settings to OpenLP settings"""
        api_url = self.api_url_edit.text().strip()
        
        if not api_url:
            QMessageBox.warning(self, "Błąd", "URL API nie może być pusty")
            return
        
        # Validate URL format
        if not (api_url.startswith('http://') or api_url.startswith('https://')):
            QMessageBox.warning(self, "Błąd", "URL API musi zaczynać się od http:// lub https://")
            return
        
        settings = Settings()
        settings.setValue('openlp_sync_plugin/api_url', api_url)
        
        api_key = self.api_key_edit.text().strip()
        if api_key:
            settings.setValue('openlp_sync_plugin/api_key', api_key)
        else:
            settings.remove('openlp_sync_plugin/api_key')
        
        db_path = self.db_path_edit.text().strip()
        if db_path:
            settings.setValue('openlp_sync_plugin/db_path', db_path)
        else:
            settings.remove('openlp_sync_plugin/db_path')
        
        QMessageBox.information(self, "Sukces", "Ustawienia zostały zapisane")
        self.accept()
    
    def browse_database(self):
        """Browse for database file"""
        file_path, _ = QFileDialog.getOpenFileName(
            self,
            "Wybierz plik bazy danych OpenLP",
            "",
            "SQLite Database (*.sqlite *.db);;All Files (*)"
        )
        
        if file_path:
            self.db_path_edit.setText(file_path)


