from pathlib import Path
from uuid import uuid5, NAMESPACE_URL

from openai import OpenAI
from qdrant_client import QdrantClient,models



COLLECTION_NAME="runbooks"
EMBEDDING_MODEL = "nomic-embed-text:latest"
RUNBOOK_DIRECTORY = Path(__file__).parent / "knowledge" / "runbooks"


ollama_client = OpenAI(
    base_url="http://localhost:11434/v1",
    api_key="ollama",
)


qdrant_client = QdrantClient(url="http://localhost:6333")

def split_markdown(text: str)->list[str]:
    return[
        chunk.strip()
        for chunk in text.split("\n\n")
        if chunk.strip()
    ]

def create_embedding(text:str)-> list[float]:
    response=ollama_client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=text,
    )
    return response.data[0].embedding


def index_runbook(runbook_path:Path)->int:

    text=runbook_path.read_text(encoding="utf-8")
    chunks=split_markdown(text)


    points=[]

    for chunk_index, chunk in enumerate(chunks):
        point_id=str(
            uuid5(
                NAMESPACE_URL,
               f"{runbook_path.name}:{chunk_index}:{chunk}"
            )
        )

        points.append(
            models.PointStruct(
                id=point_id,
                vector=create_embedding(chunk),
                payload={
                    "source_type":"runbook",
                    "source_file": runbook_path.name,
                    "chunk_index":chunk_index,
                    "text": chunk,
                },
            )
        )

    qdrant_client.upsert(
        collection_name=COLLECTION_NAME,
        points=points,
        wait=True
    )

    return len(points)


def main()->None:
    runbook_files= list(RUNBOOK_DIRECTORY.glob("**.md"))

    if not runbook_files:
        raise FileNotFoundError(
            f"No Markdown runbooks found in {RUNBOOK_DIRECTORY}"
        )

    total_chunks=0

    for runbook_path in runbook_files:
        chunks_indexed= index_runbook(runbook_path)
        total_chunks+=chunks_indexed
        print(f"Indexed {chunks_indexed} chunks from {runbook_path.name}")

    print(f"Total chunks indexed: {total_chunks}")

if __name__ == "__main__":
    main()