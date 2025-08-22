// file: main.go
package main

import (
	"log"

	"github.com/fiber-mongo/starter-kit/config"
	"github.com/fiber-mongo/starter-kit/database"
	"github.com/fiber-mongo/starter-kit/routes"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
)

func main() {
	app := fiber.New()
	app.Use(logger.New())
	// UBAH BAGIAN INI
	app.Use(cors.New(cors.Config{
		AllowOrigins: "http://localhost:3000", // Izinkan frontend development server
		AllowHeaders: "Origin, Content-Type, Accept, X-API-Key",
	}))

	// SAJIKAN FILE STATIS DARI FOLDER "public"
	app.Static("/", "./public")

	database.ConnectDB()
	routes.SetupRoutes(app)

	port := config.Env("PORT")
	log.Fatal(app.Listen(":" + port))
}
