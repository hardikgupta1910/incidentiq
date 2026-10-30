from openai import OpenAI
from qdrant_client import QdrantClient
from app.schemas import RetrievedSource

COLLECTION_NAME = "runbooks"
EMBEDDING_MODEL = "nomic-embed-text:latest"

ollama_client = OpenAI(
    base_url="http://localhost:11434/v1",
    api_key="ollama",
)

qdrant_client = QdrantClient(url="http://localhost:6333")



def retrieve_runbook_context(query:str, limit:int=3)->tuple[str,list[RetrievedSource]]:
    embedding_response=ollama_client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=query
    )


    query_vector=embedding_response.data[0].embedding

    results=qdrant_client.query_points(
        collection_name=COLLECTION_NAME,
        query=query_vector, 
        limit=limit,
        with_payload=True,
    )


    context_chunks: list[str]=[]
    retrieved_sources: list[RetrievedSource]=[]

    for point in results.points:
        payload=point.payload or {}
        text=payload.get("text")

        if not text:
            continue

        source_file = payload.get("source_file", "unknown")
        chunk_index = payload.get("chunk_index", "unknown")

        context_chunks.append(
            f"[Source: {source_file}, chunk: {chunk_index}]\n{text}"
        )

        retrieved_sources.append(
            RetrievedSource(
                source_file=source_file,
                chunk_index=chunk_index,
                score=point.score,
                text=text,
            )
        )

    return "\n\n---\n\n".join(context_chunks), retrieved_sources