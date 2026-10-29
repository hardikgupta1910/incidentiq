from qdrant_client import QdrantClient, models


COLLECTION_NAME = "runbooks"
VECTOR_SIZE = 768

client = QdrantClient(url="http://localhost:6333")

if not client.collection_exists(COLLECTION_NAME):
    client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=models.VectorParams(
            size=VECTOR_SIZE,
            distance=models.Distance.COSINE,
        ),
    )
    print(f"Created collection: {COLLECTION_NAME}")
else:
    print(f"Collection already exists: {COLLECTION_NAME}")

collection = client.get_collection(COLLECTION_NAME)

print(f"Status: {collection.status}")
print(f"Points stored: {collection.points_count}")