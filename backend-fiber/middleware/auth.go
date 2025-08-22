// file: middleware/auth.go
package middleware

import (
	"context"
	"fmt"
	"time"

	"github.com/fiber-mongo/starter-kit/database" // Sesuaikan nama modul
	"github.com/fiber-mongo/starter-kit/models"   // Sesuaikan nama modul

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
)

func AuthMiddleware(c *fiber.Ctx) error {
	clientKey := c.Get("X-API-Key")

	if clientKey == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized: Missing API Key"})
	}

	projectCollection := database.GetCollection("projects")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var projectDoc models.Project
	err := projectCollection.FindOne(ctx, bson.M{"apiKey": clientKey}).Decode(&projectDoc)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized: Invalid API Key"})
	}

	// PENGECEKAN BARU: Pastikan collection yang diakses sudah diaktifkan
	collectionName := c.Params("collectionName")
	
    // Jika collectionName kosong (misal, request bukan ke endpoint data), lewati pengecekan
	if collectionName == "" {
		return c.Next()
	}

	isAllowed := false
	for _, activeCollection := range projectDoc.ActiveCollections {
		if activeCollection == collectionName {
			isAllowed = true
			break
		}
	}
	
	if !isAllowed {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": fmt.Sprintf("Access to collection '%s' is not enabled. Please enable it in your project settings.", collectionName),
		})
	}

	return c.Next()
}