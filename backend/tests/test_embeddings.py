from openai import OpenAI


client = OpenAI(
    base_url="http://localhost:11434/v1",
    api_key="ollama",
)



response=client.embeddings.create(
    model="nomic-embed-text:latest",
    input=[
        "Database connection timed out",
        "MySQL connection pool isd exhausted"
    ],
)


vectors=response.data


print(f"Embeddings created: {len(vectors)}")
print(f"Vector dimensions: {len(vectors[0].embedding)}")
print(f"First five values: {vectors[0].embedding[:5]}")