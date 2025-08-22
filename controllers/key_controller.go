// file: controllers/key_controller.go
package controllers

import (
	"context" //
	"crypto/rand"
	"encoding/hex"
	"time"
	"github.com/fiber-mongo/starter-kit/database" // Sesuaikan path modulmu
	"github.com/fiber-mongo/starter-kit/models"   // Sesuaikan path modulmu

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
)

// Fungsi untuk generate string acak yang aman
func generateSecureKey(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

func GenerateApiKey(c *fiber.Ctx) error {
	keyCollection := database.GetCollection("keys") // Koleksi baru
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// 1. Generate API Key dan API Secret
	apiKey, err := generateSecureKey(16) // 32 karakter
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate API Key"})
	}
	apiSecret, err := generateSecureKey(32) // 64 karakter
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate API Secret"})
	}

	// 2. Hash API Secret menggunakan bcrypt
	hashedSecret, err := bcrypt.GenerateFromPassword([]byte(apiSecret), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to process secret"})
	}

	// 3. Simpan ke database
	newKey := models.ApiKey{
		ApiKey:        apiKey,
		ApiSecretHash: string(hashedSecret),
		CreatedAt:     time.Now(),
	}
	_, err = keyCollection.InsertOne(ctx, newKey)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save key"})
	}

	// 4. Kirim key asli ke user (HANYA SEKALI INI SAJA)
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message":    "API Key generated successfully. Please save your API Secret, it will not be shown again.",
		"apiKey":     apiKey,
		"apiSecret":  apiSecret, // Tampilkan secret hanya saat pembuatan
	})
}