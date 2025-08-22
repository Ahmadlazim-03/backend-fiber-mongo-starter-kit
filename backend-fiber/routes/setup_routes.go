// file: routes/setup_routes.go
package routes

import (
	"github.com/fiber-mongo/starter-kit/controllers" // Sesuaikan nama modul
	"github.com/fiber-mongo/starter-kit/middleware"  // Sesuaikan nama modul
	"github.com/gofiber/fiber/v2"
)

func SetupRoutes(app *fiber.App) {
	api := app.Group("/api/v1")

	// --- Rute Manajemen Platform ---
	api.Post("/projects", controllers.CreateProject)
	api.Get("/projects", controllers.GetAllProjects)
	api.Delete("/projects/:id", controllers.DeleteProject)
	api.Put("/projects/:id", controllers.UpdateProject)
	api.Get("/projects/:id/collections", controllers.ListCollections)
	api.Post("/projects/:id/collections", controllers.CreateUserCollection)

	// Rute BARU untuk menyajikan file (tidak perlu otentikasi)
	api.Get("/files/:projectId/:collectionName/:docId/:fieldName", controllers.GetFile)

	// --- Rute API Dinamis untuk Data User (Perlu Otentikasi) ---
	dataRoutes := api.Group("/data")
	dataRoutes.Use(middleware.AuthMiddleware)

	dataRoutes.Get("/:projectId/:collectionName", controllers.GetAllDocuments)
	dataRoutes.Get("/:projectId/:collectionName/:docId", controllers.GetOneDocument)
	dataRoutes.Post("/:projectId/:collectionName", controllers.CreateDocument)
	dataRoutes.Put("/:projectId/:collectionName/:docId", controllers.UpdateDocument)
	dataRoutes.Delete("/:projectId/:collectionName/:docId", controllers.DeleteDocument)
}