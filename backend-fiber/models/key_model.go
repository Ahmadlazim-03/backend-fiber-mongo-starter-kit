// file: models/key_model.go
package models

import (
	"go.mongodb.org/mongo-driver/bson/primitive"
	"time"
)

type ApiKey struct {
	ID            primitive.ObjectID `json:"-" bson:"_id,omitempty"`
	ApiKey        string             `json:"apiKey" bson:"apiKey"`
	ApiSecretHash string             `json:"-" bson:"apiSecretHash"` // Kita tidak pernah mengirim hash ke client
	CreatedAt     time.Time          `json:"createdAt" bson:"createdAt"`
}