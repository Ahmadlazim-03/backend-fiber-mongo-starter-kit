// file: models/project_model.go
package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/bson"
)

// Struct diubah untuk menerima input terpisah
type Project struct {
	ID                primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Name              string             `json:"name" bson:"name"`
	OwnerID           string             `json:"ownerId" bson:"ownerId"`
	CreatedAt         time.Time          `json:"createdAt" bson:"createdAt"`
	ApiKey            string             `json:"apiKey" bson:"apiKey"`                       // DITAMBAHKAN
	ActiveCollections []string           `json:"activeCollections" bson:"activeCollections"` // <-- TAMBAHKAN INI

	// Field-field koneksi
	DBHost     string `json:"dbHost" bson:"dbHost"`
	DBPort     string `json:"dbPort" bson:"dbPort"`
	DBUser     string `json:"dbUser" bson:"dbUser"`
	DBPassword string `json:"-" bson:"dbPassword"` // Jangan pernah kirim password kembali ke client
	DBName     string `json:"dbName" bson:"dbName"`
	AuthSource string `json:"authSource" bson:"authSource"`
}

// Struct baru untuk menerima password dari request body
type ProjectInput struct {
	Name       string `json:"name"`
	DBHost     string `json:"dbHost"`
	DBPort     string `json:"dbPort"`
	DBUser     string `json:"dbUser"`
	DBPassword string `json:"dbPassword"`
	DBName     string `json:"dbName"`
	AuthSource string `json:"authSource"`
}

type CreateCollectionInput struct {
	CollectionName string `json:"collectionName"`
	Schema         bson.M `json:"schema"`
}
