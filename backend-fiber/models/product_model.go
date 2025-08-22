package models

import "go.mongodb.org/mongo-driver/bson/primitive"

// Struct untuk merepresentasikan data produk
type Product struct {
	ID    primitive.ObjectID `json:"id,omitempty" bson:"_id,omitempty"`
	Nama  string             `json:"nama" bson:"nama,omitempty"`
	Harga int                `json:"harga" bson:"harga,omitempty"` // Diubah dari Name dan tag "name"
	Stok  int                `json:"stok" bson:"stok,omitempty"`   // Menambahkan Stok dengan tag "stok"
}
