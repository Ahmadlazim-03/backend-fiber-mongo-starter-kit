package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

// Fungsi untuk mengambil nilai dari file .env berdasarkan key
func Env(key string) string {
	// Muat file .env
	err := godotenv.Load(".env")
	if err != nil {
		log.Fatalf("Error loading .env file")
	}
	// Kembalikan nilai dari environment variable
	return os.Getenv(key)
}