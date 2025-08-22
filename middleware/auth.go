// file: middleware/auth.go
package middleware

import (
	"context"
	"time"
	"github.com/fiber-mongo/starter-kit/database" // Sesuaikan path modulmu
	"github.com/fiber-mongo/starter-kit/models"   // Sesuaikan path modulmu

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
)

func AuthMiddleware(c *fiber.Ctx) error {
	clientKey := c.Get("X-API-Key")

	if clientKey == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized: Missing API Key"})
	}

	keyCollection := database.GetCollection("keys")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var apiKeyDoc models.ApiKey
	
	// Cari apakah API Key dari client ada di database
	err := keyCollection.FindOne(ctx, bson.M{"apiKey": clientKey}).Decode(&apiKeyDoc)
	if err != nil {
		// Jika tidak ditemukan, akses ditolak
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized: Invalid API Key"})
	}
	
	// Jika key valid, lanjutkan
	return c.Next()
}