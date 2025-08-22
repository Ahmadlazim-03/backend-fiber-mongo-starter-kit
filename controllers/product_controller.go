package controllers

import (
	"context"
	"net/http"
	"time"
	"github.com/fiber-mongo/starter-kit/database" // Sesuaikan dengan path modulmu
	"github.com/fiber-mongo/starter-kit/models"   // Sesuaikan dengan path modulmu

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
)

// Handler untuk mendapatkan semua produk
func GetAllProducts(c *fiber.Ctx) error {
	productCollection := database.GetCollection("produk")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var products []models.Product

	cursor, err := productCollection.Find(ctx, bson.M{})
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	defer cursor.Close(ctx)

	if err = cursor.All(ctx, &products); err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
    
    if products == nil {
        products = []models.Product{}
    }

	return c.Status(http.StatusOK).JSON(products)
}

// Handler untuk membuat produk baru
func CreateProduct(c *fiber.Ctx) error {
	productCollection := database.GetCollection("produk")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	product := new(models.Product)

	// Parse body request ke struct Product
	if err := c.BodyParser(product); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Masukkan ke database
	result, err := productCollection.InsertOne(ctx, product)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create product"})
	}

	return c.Status(http.StatusCreated).JSON(fiber.Map{"result": result})
}