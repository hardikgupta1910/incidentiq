from openai import OpenAI
from qdrant_client import QdrantClient


ollama_client = OpenAI(
    base_url="http://localhost:11434/v1",
    api_key="ollama",
)

qdrant_client = QdrantClient(url="http://localhost:6333")


def main() -> None:
    query = (
        "The payment service reports database connection timeouts "
        "and high connection pool usage. What should we check?"
    )

    embedding_response = ollama_client.embeddings.create(
        model="nomic-embed-text:latest",
        input=query,
    )

    query_vector = embedding_response.data[0].embedding

    results = qdrant_client.query_points(
        collection_name="runbooks",
        query=query_vector,
        limit=3,
        with_payload=True,
    )

    print(f"Query: {query}")
    print(f"Matches returned: {len(results.points)}")

    for rank, point in enumerate(results.points, start=1):
        payload = point.payload or {}

        print(f"\n--- Match {rank} ---")
        print(f"Score: {point.score:.4f}")
        print(f"Source: {payload.get('source_file')}")
        print(f"Chunk index: {payload.get('chunk_index')}")
        print(f"Text:\n{payload.get('text')}")


if __name__ == "__main__":
    main()