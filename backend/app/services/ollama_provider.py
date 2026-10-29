from openai import OpenAI
from app.schemas import InvestigationResult

MODEL_NAME="qwen2.5:7b"


client=OpenAI(
    base_url="http://localhost:11434/v1",
    api_key="ollama"
)


def investigate_with_local_ai(incident_id: str,log_text: str,) -> InvestigationResult:

    response=client.chat.completions.create(
        model=MODEL_NAME,
        temperature=0,
        response_format={
            "type":"json_schema",
            "json_schema":{
                "name":"incident_investigation",
                "strict":True,
                "schema":InvestigationResult.model_json_schema()
            }
        },
        messages=[
            {
                "role":"system",
                "content":( "You investigate software incidents. Return one or more "
                    "ranked hypotheses, never claim certainty, and use only "
                    "the supplied log lines as evidence. Each evidence item "
                    "must contain an actual line number and exact log message "
                    "from the supplied logs. Return valid JSON only.")
            },
            {
                "role":"user",
                "content":(
                    f"Incident ID: {incident_id}\n\n"
                    f"logs:\n{log_text}"
                )
            },
        ],
    )

    content= response.choices[0].message.content or ""

    if not content:
        raise ValueError("Local model resturned Empty Response")

    model_result= InvestigationResult.model_validate_json(content)

    return InvestigationResult(
        incident_id=incident_id,
        status="completed",
        hypotheses=model_result.hypotheses
    )