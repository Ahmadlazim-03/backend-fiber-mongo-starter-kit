// file: controllers/dynamic_api_controller.go
package controllers

import (
	"context"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/fiber-mongo/starter-kit/database" // Sesuaikan nama modul
	"github.com/fiber-mongo/starter-kit/models"   // Sesuaikan nama modul

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Fungsi helper untuk menghubungkan ke database user secara dinamis
func connectToUserDB(ctx context.Context, project models.Project) (*mongo.Client, error) {
	uri := fmt.Sprintf("mongodb://%s:%s@%s:%s/%s?authSource=%s",
		project.DBUser, url.QueryEscape(project.DBPassword), project.DBHost, project.DBPort, project.DBName, project.AuthSource)
	if project.DBUser == "" || project.DBPassword == "" {
		uri = fmt.Sprintf("mongodb://%s:%s/%s", project.DBHost, project.DBPort, project.DBName)
	}

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		return nil, err
	}
	err = client.Ping(ctx, nil)
	if err != nil {
		return nil, err
	}
	return client, nil
}

// Handler untuk GET /.../{collectionName} (Ambil semua dokumen)
func GetAllDocuments(c *fiber.Ctx) error {
	projectCollection := database.GetCollection("projects")
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	projectIdStr := c.Params("projectId")
	collectionName := c.Params("collectionName")
	objID, err := primitive.ObjectIDFromHex(projectIdStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid Project ID format"})
	}

	var project models.Project
	err = projectCollection.FindOne(ctx, bson.M{"_id": objID}).Decode(&project)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Project not found"})
	}

	userDBClient, err := connectToUserDB(ctx, project)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not connect to user database"})
	}
	defer userDBClient.Disconnect(ctx)

	userCollection := userDBClient.Database(project.DBName).Collection(collectionName)
	cursor, err := userCollection.Find(ctx, bson.M{})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch documents"})
	}

	var results []bson.M
	if err = cursor.All(ctx, &results); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to decode documents"})
	}

	if results == nil {
		results = []bson.M{}
	}

	return c.Status(fiber.StatusOK).JSON(results)
}

// Handler untuk GET /.../{collectionName}/{docId} (Ambil satu dokumen)
func GetOneDocument(c *fiber.Ctx) error {
	projectCollection := database.GetCollection("projects")
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	projectIdStr := c.Params("projectId")
	collectionName := c.Params("collectionName")
	docIdStr := c.Params("docId")

	projObjID, err := primitive.ObjectIDFromHex(projectIdStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid Project ID format"})
	}
	docObjID, err := primitive.ObjectIDFromHex(docIdStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid Document ID format"})
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

	userCollection := userDBClient.Database(project.DBName).Collection(collectionName)

	var result bson.M
	err = userCollection.FindOne(ctx, bson.M{"_id": docObjID}).Decode(&result)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Document not found"})
	}

	return c.Status(fiber.StatusOK).JSON(result)
}

// Handler untuk POST /.../{collectionName} (Buat dokumen baru dengan file)
func CreateDocument(c *fiber.Ctx) error {
	projectCollection := database.GetCollection("projects")
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	projectIdStr := c.Params("projectId")
	collectionName := c.Params("collectionName")
	projObjID, err := primitive.ObjectIDFromHex(projectIdStr)
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

	form, err := c.MultipartForm()
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid form data. Ensure you are sending multipart/form-data."})
	}

	newDoc := bson.M{}
	for key, values := range form.Value {
		if len(values) > 0 {
			if num, err := strconv.Atoi(values[0]); err == nil {
				newDoc[key] = num
			} else if flt, err := strconv.ParseFloat(values[0], 64); err == nil {
				newDoc[key] = flt
			} else if b, err := strconv.ParseBool(values[0]); err == nil {
				newDoc[key] = b
			} else {
				newDoc[key] = values[0]
			}
		}
	}

	for key, fileHeaders := range form.File {
		if len(fileHeaders) > 0 {
			file := fileHeaders[0]
			extension := filepath.Ext(file.Filename)
			uniqueFileName := uuid.New().String() + extension

			storagePath := fmt.Sprintf("./public/uploads/%s/%s", projectIdStr, collectionName)
			if err := os.MkdirAll(storagePath, os.ModePerm); err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create storage directory"})
			}

			filePath := filepath.Join(storagePath, uniqueFileName)
			if err := c.SaveFile(file, filePath); err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save file"})
			}
			newDoc[key] = uniqueFileName
		}
	}

	userCollection := userDBClient.Database(project.DBName).Collection(collectionName)
	result, err := userCollection.InsertOne(ctx, newDoc)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create document", "details": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(result)
}

// Handler untuk PUT /.../{collectionName}/{docId} (Update dokumen dengan file)
func UpdateDocument(c *fiber.Ctx) error {
	projectCollection := database.GetCollection("projects")
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	projectIdStr := c.Params("projectId")
	collectionName := c.Params("collectionName")
	docIdStr := c.Params("docId")

	projObjID, err := primitive.ObjectIDFromHex(projectIdStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid Project ID format"})
	}
	docObjID, err := primitive.ObjectIDFromHex(docIdStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid Document ID format"})
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

	// Coba parse sebagai multipart form terlebih dahulu
	form, err := c.MultipartForm()
	
	updateData := bson.M{}

	// Jika request BUKAN multipart/form-data (kemungkinan JSON biasa)
	if err != nil {
		if err := c.BodyParser(&updateData); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body. Must be multipart/form-data or application/json."})
		}
	} else {
		// --- BAGIAN YANG DITAMBAHKAN UNTUK MENGGUNAKAN 'form' ---
		// Jika request ADALAH multipart/form-data, proses field dan filenya
		for key, values := range form.Value {
			if len(values) > 0 {
				if num, err := strconv.Atoi(values[0]); err == nil {
					updateData[key] = num
				} else if flt, err := strconv.ParseFloat(values[0], 64); err == nil {
					updateData[key] = flt
				} else if b, err := strconv.ParseBool(values[0]); err == nil {
					updateData[key] = b
				} else {
					updateData[key] = values[0]
				}
			}
		}

		for key, fileHeaders := range form.File {
			if len(fileHeaders) > 0 {
				file := fileHeaders[0]
				extension := filepath.Ext(file.Filename)
				uniqueFileName := uuid.New().String() + extension
				storagePath := fmt.Sprintf("./public/uploads/%s/%s", projectIdStr, collectionName)
				if err := os.MkdirAll(storagePath, os.ModePerm); err != nil {
					return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create storage directory"})
				}
				filePath := filepath.Join(storagePath, uniqueFileName)
				if err := c.SaveFile(file, filePath); err != nil {
					return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save file"})
				}
				updateData[key] = uniqueFileName
			}
		}
		// --- AKHIR BAGIAN YANG DITAMBAHKAN ---
	}

	userCollection := userDBClient.Database(project.DBName).Collection(collectionName)
	update := bson.M{"$set": updateData}
	result, err := userCollection.UpdateOne(ctx, bson.M{"_id": docObjID}, update)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update document"})
	}
	if result.MatchedCount == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Document not found to update"})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{"message": "Document updated successfully"})
}
// Handler untuk DELETE /.../{collectionName}/{docId} (Hapus dokumen)
func DeleteDocument(c *fiber.Ctx) error {
	projectCollection := database.GetCollection("projects")
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	projectIdStr := c.Params("projectId")
	collectionName := c.Params("collectionName")
	docIdStr := c.Params("docId")

	projObjID, err := primitive.ObjectIDFromHex(projectIdStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid Project ID format"})
	}
	docObjID, err := primitive.ObjectIDFromHex(docIdStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid Document ID format"})
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
	
	// TODO: Hapus juga file terkait dari storage jika ada

	userCollection := userDBClient.Database(project.DBName).Collection(collectionName)
	result, err := userCollection.DeleteOne(ctx, bson.M{"_id": docObjID})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete document"})
	}

	if result.DeletedCount == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Document not found to delete"})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{"message": "Document deleted successfully"})
}

// FUNGSI BARU untuk menyajikan file
func GetFile(c *fiber.Ctx) error {
	projectCollection := database.GetCollection("projects")
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	projectIdStr := c.Params("projectId")
	collectionName := c.Params("collectionName")
	docIdStr := c.Params("docId")
	fieldName := c.Params("fieldName")

	projObjID, err := primitive.ObjectIDFromHex(projectIdStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid Project ID"})
	}
	docObjID, err := primitive.ObjectIDFromHex(docIdStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid Document ID"})
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

	userCollection := userDBClient.Database(project.DBName).Collection(collectionName)

	var result bson.M
	err = userCollection.FindOne(ctx, bson.M{"_id": docObjID}).Decode(&result)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Document not found"})
	}

	fileName, ok := result[fieldName].(string)
	if !ok || fileName == "" {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "File field not found in document"})
	}

	filePath := fmt.Sprintf("./public/uploads/%s/%s/%s", projectIdStr, collectionName, fileName)

	return c.SendFile(filePath)
}