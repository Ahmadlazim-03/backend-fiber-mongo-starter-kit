package database

import (
	"context"
	"fmt"
	"log"
	"time"
	"github.com/fiber-mongo/starter-kit/config" // Sesuaikan dengan path modulmu
	
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var DB *mongo.Client // Variabel global untuk menyimpan instance koneksi

// Fungsi untuk menghubungkan aplikasi dengan MongoDB
func ConnectDB() {
	uri := config.Env("MONGO_URI")
	if uri == "" {
		log.Fatal("MONGO_URI environment variable not set.")
	}

	client, err := mongo.NewClient(options.Client().ApplyURI(uri))
	if err != nil {
		log.Fatal(err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	err = client.Connect(ctx)
	if err != nil {
		log.Fatal(err)
	}

	// Cek koneksi
	err = client.Ping(ctx, nil)
	if err != nil {
		log.Fatal("Failed to connect to MongoDB:", err)
	}
	
	fmt.Println("✅ Successfully connected to MongoDB!")
	DB = client
}

// Fungsi untuk mendapatkan koleksi tertentu dari database
func GetCollection(collectionName string) *mongo.Collection {
    dbName := config.Env("DB_NAME")
    if dbName == "" {
        log.Fatal("DB_NAME environment variable not set.")
    }
	collection := DB.Database(dbName).Collection(collectionName)
	return collection
}