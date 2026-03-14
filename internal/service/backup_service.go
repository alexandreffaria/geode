package service

import (
	"fmt"
	"path/filepath"
	"time"

	"geode/internal/storage"
)

// BackupService handles backup and restore operations
type BackupService struct {
	repo       storage.Repository
	backupDir  string
}

// NewBackupService creates a new backup service
func NewBackupService(repo storage.Repository, backupDir string) *BackupService {
	return &BackupService{
		repo:      repo,
		backupDir: backupDir,
	}
}

// CreateBackup creates a timestamped backup of the data
func (s *BackupService) CreateBackup() (string, error) {
	// Generate backup filename with timestamp
	timestamp := time.Now().Format("20060102_150405")
	backupFilename := fmt.Sprintf("geode_backup_%s.csv", timestamp)
	backupPath := filepath.Join(s.backupDir, backupFilename)

	// Create the backup
	if err := s.repo.Backup(backupPath); err != nil {
		return "", err
	}

	return backupPath, nil
}

// CreateNamedBackup creates a backup with a custom name
func (s *BackupService) CreateNamedBackup(name string) (string, error) {
	backupPath := filepath.Join(s.backupDir, name)

	// Create the backup
	if err := s.repo.Backup(backupPath); err != nil {
		return "", err
	}

	return backupPath, nil
}

// RestoreBackup restores data from a backup file
func (s *BackupService) RestoreBackup(backupPath string) error {
	return s.repo.Restore(backupPath)
}

// RestoreFromBackupDir restores from a backup in the backup directory
func (s *BackupService) RestoreFromBackupDir(filename string) error {
	backupPath := filepath.Join(s.backupDir, filename)
	return s.repo.Restore(backupPath)
}
