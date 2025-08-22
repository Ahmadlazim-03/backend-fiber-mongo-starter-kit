// file: controllers/key_controller.go
package controllers

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"time"

	"github.com/fiber-mongo/starter-kit/database" // Sesuaikan dengan nama modul Anda
	"github.com/fiber-mongo/starter-kit/models"   // Sesuaikan dengan nama modul Anda

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
)

// generateSecureKey dipindahkan ke sini atau ke file helper umum
func generateSecureKey(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// GenerateApiKey sekarang bisa digunakan sebagai endpoint terpisah jika dibutuhkan.
// Namun, dalam alur utama, logika ini sudah ada di CreateProject.
func GenerateApiKey(c *fiber.Ctx) error {
	keyCollection := database.GetCollection("keys") 
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	apiKey, err := generateSecureKey(16)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate API Key"})
	}
	apiSecret, err := generateSecureKey(32)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate API Secret"})
	}

	hashedSecret, err := bcrypt.GenerateFromPassword([]byte(apiSecret), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to process secret"})
	}

	newKey := models.ApiKey{
		ApiKey:        apiKey,
		ApiSecretHash: string(hashedSecret),
		CreatedAt:     time.Now(),
	}
	_, err = keyCollection.InsertOne(ctx, newKey)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save key"})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message":    "API Key generated successfully. Please save your API Secret, it will not be shown again.",
		"apiKey":     apiKey,
		"apiSecret":  apiSecret,
	})
}