// file: controllers/project_controller.go
package controllers

import (
	"context"
	"fmt"
	"net/url"
	"time"
	"errors" 

	"github.com/fiber-mongo/starter-kit/database" // Sesuaikan dengan nama modul Anda
	"github.com/fiber-mongo/starter-kit/models"   // Sesuaikan dengan nama modul Anda

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func CreateProject(c *fiber.Ctx) error {
	projectCollection := database.GetCollection("projects")
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	var input models.ProjectInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if input.DBPort == "" {
		input.DBPort = "27017"
	}
	if input.AuthSource == "" {
		input.AuthSource = "admin"
	}

	encodedPassword := url.QueryEscape(input.DBPassword)
	uri := fmt.Sprintf("mongodb://%s:%s@%s:%s/%s?authSource=%s",
		input.DBUser, encodedPassword, input.DBHost, input.DBPort, input.DBName, input.AuthSource)
	if input.DBUser == "" || input.DBPassword == "" {
		uri = fmt.Sprintf("mongodb://%s:%s/%s", input.DBHost, input.DBPort, input.DBName)
	}

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Failed to build valid MongoDB URI from provided details."})
	}
	err = client.Ping(ctx, nil)
	if err != nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "Failed to connect. Check your connection details and firewall."})
	}
	defer client.Disconnect(ctx)

	// Generate API Key unik untuk proyek ini
	apiKey, err := generateSecureKey(16) // Memanggil helper dari key_controller.go
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate API Key"})
	}

	newProject := models.Project{
		Name:       input.Name,
		DBHost:     input.DBHost,
		DBPort:     input.DBPort,
		DBUser:     input.DBUser,
		DBPassword: input.DBPassword,
		DBName:     input.DBName,
		AuthSource: input.AuthSource,
		CreatedAt:  time.Now(),
		ApiKey:     apiKey, // Simpan API Key yang baru dibuat
	}

	result, err := projectCollection.InsertOne(ctx, newProject)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save the project"})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "Project connected and saved successfully!",
		"result":  result,
		"apiKey":  apiKey, // Kirimkan API Key ke frontend
	})
}

func GetAllProjects(c *fiber.Ctx) error {
	projectCollection := database.GetCollection("projects")
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	var projects []models.Project

	cursor, err := projectCollection.Find(ctx, bson.M{})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch projects"})
	}
	defer cursor.Close(ctx)

	if err = cursor.All(ctx, &projects); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to decode projects"})
	}

	if projects == nil {
		projects = []models.Project{}
	}

	return c.Status(fiber.StatusOK).JSON(projects)
}

func DeleteProject(c *fiber.Ctx) error {
	projectCollection := database.GetCollection("projects")
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	projectIdStr := c.Params("id")
	objID, err := primitive.ObjectIDFromHex(projectIdStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid Project ID format"})
	}

	result, err := projectCollection.DeleteOne(ctx, bson.M{"_id": objID})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete project"})
	}

	if result.DeletedCount == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Project not found to delete"})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{"message": "Project deleted successfully"})
}

func ListCollections(c *fiber.Ctx) error {
	projectCollection := database.GetCollection("projects")
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	projObjID, err := primitive.ObjectIDFromHex(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid Project ID format"})
	}

	var project models.Project
	err = projectCollection.FindOne(ctx, bson.M{"_id": projObjID}).Decode(&project)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Project not found"})
	}

	userDBClient, err := connectToUserDB(ctx, project)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not connect to user database"})
	}
	defer userDBClient.Disconnect(ctx)

	collectionNames, err := userDBClient.Database(project.DBName).ListCollectionNames(ctx, bson.M{})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to list collections"})
	}

	if collectionNames == nil {
		collectionNames = []string{}
	}

	return c.Status(fiber.StatusOK).JSON(collectionNames)
}

// Handler untuk PUT /projects/{id} (Update detail proyek, termasuk ActiveCollections)
func UpdateProject(c *fiber.Ctx) error {
	projectCollection := database.GetCollection("projects")
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	projObjID, err := primitive.ObjectIDFromHex(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid Project ID format"})
	}

	var payload struct {
		ActiveCollections []string `json:"activeCollections"`
	}

	if err := c.BodyParser(&payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	update := bson.M{"$set": bson.M{"activeCollections": payload.ActiveCollections}}
	_, err = projectCollection.UpdateOne(ctx, bson.M{"_id": projObjID}, update)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update project settings"})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{"message": "Project settings updated successfully"})
}

func CreateUserCollection(c *fiber.Ctx) error {
	projectCollection := database.GetCollection("projects")
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	// 1. Ambil projectId dan validasi
	projObjID, err := primitive.ObjectIDFromHex(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid Project ID format"})
	}

	// 2. Parse payload dari frontend
	var input models.CreateCollectionInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if input.CollectionName == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Collection name cannot be empty"})
	}

	// 3. Ambil detail proyek dan konek ke DB user
	var project models.Project
	err = projectCollection.FindOne(ctx, bson.M{"_id": projObjID}).Decode(&project)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Project not found"})
	}
	userDBClient, err := connectToUserDB(ctx, project)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not connect to user database"})
	}
	defer userDBClient.Disconnect(ctx)

	// 4. Siapkan opsi untuk membuat koleksi dengan schema validator
	collectionOptions := options.CreateCollection()
	if input.Schema != nil && len(input.Schema) > 0 {
		validator := bson.M{"$jsonSchema": input.Schema}
		collectionOptions.SetValidator(validator)
	}

	// 5. Jalankan perintah CreateCollection
	err = userDBClient.Database(project.DBName).CreateCollection(ctx, input.CollectionName, collectionOptions)
	if err != nil {
		// --- BLOK ERROR HANDLING YANG DIPERBAIKI ---
		var cmdErr mongo.CommandError
		// Cek apakah error ini adalah CommandError
		if errors.As(err, &cmdErr) {
			// Kode 48 adalah "NamespaceExists", artinya collection sudah ada
			if cmdErr.Code == 48 {
				return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": fmt.Sprintf("Collection '%s' already exists.", input.CollectionName)})
			}
		}
		// Jika error lain, kembalikan sebagai server error
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create collection"})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": fmt.Sprintf("Collection '%s' created successfully.", input.CollectionName),
	})
}