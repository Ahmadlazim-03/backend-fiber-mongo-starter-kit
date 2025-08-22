// file: routes/setup_routes.go
package routes

import (
	"github.com/fiber-mongo/starter-kit/controllers"
	"github.com/fiber-mongo/starter-kit/middleware"
	"github.com/gofiber/fiber/v2"
)

func SetupRoutes(app *fiber.App) {
	api := app.Group("/api/v1")

	// Endpoint ini PUBLIK, untuk membuat key baru
	api.Post("/generate-key", controllers.GenerateApiKey)

	// Grup baru untuk rute-rute yang DIPROTEKSI
	protected := api.Group("/products")
	protected.Use(middleware.AuthMiddleware) // Satpam hanya menjaga grup ini

	// Rute produk sekarang di dalam grup 'protected'
	protected.Get("/", controllers.GetAllProducts)
	// protected.Post("/", controllers.CreateProduct) // contoh jika ada POST
}