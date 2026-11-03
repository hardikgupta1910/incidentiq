# IncidentIQ

IncidentIQ is an incident-investigation workspace that combines
application logs, retrieved operational documentation, and
model-assisted analysis.

Engineers can upload logs, investigate possible causes, inspect
evidence, manage operational knowledge, review saved investigations, and
export reports.

Embeddings use local Ollama. Each investigation uses exactly one
selected analysis provider: local Ollama, Groq, or Mistral, subject to
workspace privacy policy.

> Hypotheses are not verified root causes. Validate evidence and
> suggested checks before changing production systems.

## Features

### Incident management

-   Upload UTF-8 `.log` and `.txt` files.
-   Parse severity, timestamps, service names, and original line
    numbers.
-   Search and inspect parsed events.
-   Store incidents and their latest successful investigation in MySQL.

### Investigation workflow

-   Generate query embeddings through Ollama.
-   Retrieve operational knowledge from Qdrant.
-   Run one selected analysis provider.
-   Validate output structure and evidence references.
-   Preserve original log text and line numbers.
-   Use clearly labeled rule-based fallback for local workflow failures.
-   Report cloud failures without automatically switching analysis
    providers.

### Investigation history and exports

-   Save investigation snapshots.
-   Browse and search saved runs.
-   Export the incident investigation as Markdown.
-   Export saved snapshots as Markdown or JSON.
-   Record requested provider and actual analysis source for new
    results.
-   Display source-aware confidence wording.
-   Label older results without provenance as unknown/legacy.

### Knowledge Base

-   Upload text-based PDF, Markdown, and UTF-8 text documents.
-   Extract text, split it into chunks, and embed it locally.
-   Store document metadata and extracted text in MySQL.
-   Store searchable vectors in Qdrant.
-   Search and filter uploaded documents.
-   Retry failed ingestion.
-   Delete uploaded documents and their document-scoped vectors.
-   Restrict mutations to administrators.

### Authentication and privacy

-   JWT authentication.
-   Engineer and administrator roles.
-   Engineer-only public registration.
-   Administrator-controlled workspace privacy.
-   Deployment-level privacy locking.
-   Backend enforcement of cloud-provider restrictions.
-   Explicit confirmation before each cloud investigation.

## Architecture

``` text
Browser
   |
React frontend / Nginx
   |
FastAPI
   |
   +-- MySQL
   |     Accounts, incidents, history, document metadata
   |
   +-- LangGraph investigation workflow
   |       |
   |       +-- Ollama embeddings
   |       +-- Qdrant retrieval
   |       +-- One selected analysis provider
   |       |     Local Ollama / Groq / Mistral
   |       +-- Evidence validation
   |       +-- Local rule-based fallback when applicable
   |
   +-- Separate model-comparison endpoint
```

LangGraph orchestrates backend execution. It is not a frontend graph
visualization.

## Technology stack

  Layer             Technology
  ----------------- ---------------------------------------
  Frontend          React, Vite, Tailwind CSS
  Backend           FastAPI, Pydantic, SQLAlchemy
  Workflow          LangGraph
  Database          MySQL
  Vector database   Qdrant
  Embeddings        Ollama with `nomic-embed-text:latest`
  Local analysis    Ollama
  Cloud analysis    Groq and direct Mistral adapters
  Authentication    JWT and password hashing
  Testing           pytest
  Containers        Docker, Docker Compose, Nginx

The supplied local model configuration uses `qwen2.5:7b`. Cloud model
names depend on adapter configuration and account access.

## Provider selection

### Privacy behavior

  -----------------------------------------------------------------------
  Workspace policy                    Available analysis providers
  ----------------------------------- -----------------------------------
  Privacy enabled                     Local Ollama

  Privacy disabled                    Ollama, Groq, Mistral, as allowed
                                      by backend policy

  Privacy deployment-locked           Local Ollama
  -----------------------------------------------------------------------

Disabling privacy makes cloud options available. It does not
automatically send data externally.

A cloud investigation requires an explicit provider choice and
confirmation that incident logs and retrieved guidance may leave the
local environment.

### Investigation request

``` http
POST /api/incidents/{incident_id}/investigate
Authorization: Bearer <token>
Content-Type: application/json
```

Local example:

``` json
{
  "provider": "ollama",
  "confirm_external_processing": false
}
```

Cloud example:

``` json
{
  "provider": "mistral",
  "confirm_external_processing": true
}
```

The backend independently enforces privacy. Frontend visibility is not
the security boundary.

### Embeddings remain local

Selecting Groq or Mistral changes the analysis provider, not the
embedding provider.

``` text
Incident logs
    -> Ollama query embedding
    -> Qdrant retrieval
    -> Selected analysis provider
    -> Evidence validation
    -> Persistence
```

Ollama must remain available for embedding-based retrieval during cloud
investigations. The local chat model does not need to perform inference
for a cloud run.

### Failure behavior

  -----------------------------------------------------------------------
  Situation                           Behavior
  ----------------------------------- -----------------------------------
  Local retrieval, inference, or      Labeled rule-based fallback
  validation failure                  

  Cloud retrieval failure             Error before cloud analysis

  Selected cloud provider fails       Error; no automatic provider
                                      switching

  Cloud evidence validation fails     Error; invalid result is not saved

  Failed cloud run with a previous    Previous saved result remains
  successful result                   
  -----------------------------------------------------------------------

No random model selection or automatic Groq-to-Mistral switching occurs.

## Project structure

``` text
incidentiq/
├── backend/
│   ├── app/
│   │   ├── ai/
│   │   ├── auth/
│   │   ├── graph/
│   │   ├── routers/
│   │   ├── services/
│   │   ├── database.py
│   │   ├── main.py
│   │   ├── models.py
│   │   ├── models_knowledge.py
│   │   ├── schemas.py
│   │   └── storage.py
│   ├── tests/
│   ├── requirements.txt
│   └── index_runbooks.py
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   └── services/
│   └── package.json
└── Docker and Compose configuration
```

Use the actual Docker and environment filenames present in your
checkout.

## Prerequisites

### Docker execution

-   Docker Desktop with Linux containers.
-   Docker Compose.
-   Adequate memory and disk space for models and data.
-   Configured service addresses and persistent storage.

### Native development

-   A compatible Python interpreter.
-   Node.js and npm.
-   MySQL, Qdrant, and Ollama.
-   A project-specific Python virtual environment.

The supplied Docker backend uses Python 3.12. Validate dependencies and
tests when changing runtime versions.

## Environment configuration

Never commit real environment files, credentials, API keys, incident
logs, or generated investigation reports.

A native backend configuration can include:

``` dotenv
DATABASE_URL=mysql+pymysql://incidentiq:REPLACE_PASSWORD@127.0.0.1:3307/incidentiq

JWT_SECRET_KEY=REPLACE_WITH_A_LONG_RANDOM_SECRET
JWT_EXPIRE_MINUTES=60

OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:7b
QDRANT_URL=http://127.0.0.1:6333

LOCAL_PRIVACY_MODE=true
PRIVACY_MODE=true
PRIVACY_MODE_LOCKED=true

GROQ_API_KEY=
GROQ_MODEL=

MISTRAL_API_KEY=
MISTRAL_MODEL=mistral-small-latest
```

If using an adapter default model, omit its optional model variable
rather than setting an empty value unless the adapter handles empty
strings.

Some original modules use local URL defaults or hardcoded URLs. Verify
that the running clients use the intended addresses, particularly inside
Docker.

### Docker service addresses

For services on the same Docker network:

``` text
MySQL:  mysql:3306
Qdrant: qdrant:6333
Ollama: ollama:11434
```

Use the actual service names in your Compose configuration.

For tools running on Windows with the supplied published ports:

``` text
MySQL:  127.0.0.1:3307
Qdrant: 127.0.0.1:6333
```

`localhost` inside a container refers to that container.

If Ollama runs on the Windows host rather than in Docker, configure the
backend to reach the host service through the appropriate Docker Desktop
host address.

### Cloud keys in Docker

A host `.env` file is not automatically injected into a container.

Pass cloud variables through your actual Compose backend configuration,
for example:

``` yaml
environment:
  GROQ_API_KEY: ${GROQ_API_KEY:-}
  MISTRAL_API_KEY: ${MISTRAL_API_KEY:-}
  MISTRAL_MODEL: ${MISTRAL_MODEL:-mistral-small-latest}
```

Keep their values in an ignored environment file.

Changing a Compose environment value requires recreating the affected
container. Restarting alone does not apply a changed container
environment.

### Privacy configuration

Keep privacy enabled by default.

``` dotenv
LOCAL_PRIVACY_MODE=true
PRIVACY_MODE=true
PRIVACY_MODE_LOCKED=true
```

To allow an administrator to permit cloud investigations, set the
deployment lock to false:

``` dotenv
PRIVACY_MODE_LOCKED=false
```

Then recreate the backend and use the application's administrator
privacy control to explicitly permit cloud processing.

A saved workspace policy can take precedence over initial default
settings. Review the effective policy in the application rather than
assuming an environment default describes the current workspace.

## Run with Docker

### Review before startup

-   Confirm the correct Compose file and environment file.
-   Verify database and vector-store volume mappings.
-   Back up existing storage before migration.
-   Do not run multiple MySQL or Qdrant instances against the same data
    volume.
-   Ensure the backend listens on `0.0.0.0:8000`.
-   Configure Nginx to proxy API requests to the backend service.
-   Ensure an Ollama service is reachable for embeddings.

For a standard automatically discovered Compose file:

``` powershell
docker compose up -d --build
```

For a custom configuration:

``` powershell
docker compose --env-file YOUR_ENV_FILE -f YOUR_COMPOSE_FILE up -d --build
```

Replace the placeholders with files that actually exist. Do not assume
`.env.docker` exists.

### Check containers

``` powershell
docker ps -a
```

With the development container names:

``` powershell
docker logs --tail 100 incidentiq-backend
docker logs --tail 100 incidentiq-frontend
```

Expected backend startup:

``` text
Application startup complete.
Uvicorn running on http://0.0.0.0:8000
```

### Open the application

For the Nginx deployment on port `8080`:

``` text
Application:     http://localhost:8080
Swagger:         http://localhost:8080/docs
API health:      http://localhost:8080/api/health
Provider health: http://localhost:8080/api/health/providers
```

The basic health endpoint confirms an API response. It does not prove
successful model inference or complete dependency readiness.

### Rebuild after changes

``` powershell
docker compose up -d --build
```

Use the same custom file/environment options as startup if applicable.

### Stop

``` powershell
docker compose down
```

Do not add `-v` unless you intentionally want to delete the affected
Compose-managed volumes.

Persistent volumes are not backups.

## Run natively

### Backend

From the project root:

``` powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1

python -m pip install --upgrade pip
python -m pip install -r .\backend\requirements.txt

Set-Location .\backend
python -m uvicorn app.main:app --reload
```

Reuse an existing configured environment instead of creating another one
if appropriate.

Check the active interpreter:

``` powershell
python -c "import sys; print(sys.executable)"
```

It should point to the project virtual environment.

### Frontend

Configure `frontend/.env`:

``` dotenv
VITE_API_BASE_URL=http://localhost:8000
```

In a separate terminal:

``` powershell
Set-Location frontend
npm install
npm run dev
```

Open the address printed by Vite.

For the supplied Nginx production build, the frontend API base can be
`/`, with `/api` proxied to FastAPI.

### Ollama models

``` powershell
ollama pull nomic-embed-text:latest
ollama pull qwen2.5:7b
```

The embedding model is required for retrieval. The chat model is
required for local Ollama analysis.

Host and container Ollama installations do not automatically share
models.

### Initial runbooks

The retrieval pipeline uses the Qdrant `runbooks` collection.

Create or validate the collection using the repository's initialization
procedure, then run:

``` powershell
Set-Location backend
python index_runbooks.py
```

Review the script's source directory and client addresses before
execution.

Vector dimensions must match the configured embedding model. Changing
embedding models may require a new collection or controlled reindexing.
Do not delete existing vectors as a routine troubleshooting step.

## Accounts and administration

Public registration creates engineers. Supplying `"role": "admin"` must
not grant administrator access.

Use a trusted bootstrap procedure or a deliberate database-administrator
operation to create administrators.

To promote an existing account:

``` sql
SELECT id, username, role
FROM incidentiq.users
WHERE username = 'REPLACE_USERNAME';

UPDATE incidentiq.users
SET role = 'admin'
WHERE username = 'REPLACE_USERNAME'
LIMIT 1;

COMMIT;
```

Verify the account, then sign out and sign in again.

Never omit the `WHERE` clause.

### DBeaver connection

For the supplied local port mapping:

``` text
Driver:   MySQL
Host:     127.0.0.1
Port:     3307
Database: incidentiq
Username: incidentiq
Password: configured database password
```

Existing MySQL volumes retain their stored credentials. Changing
initialization environment variables does not rotate an existing
database password.

## Typical investigation

1.  Sign in.
2.  Upload a log file.
3.  Inspect parsed events and original line numbers.
4.  Load the workspace privacy policy.
5.  Select one allowed analysis provider.
6.  Confirm external processing if selecting a cloud provider.
7.  Run the investigation.
8.  Review the requested provider, actual source, evidence, and
    suggested checks.
9.  Reopen the saved snapshot in Investigation History.
10. Export the report if needed.

Model Comparison is a separate workflow. A normal investigation does not
require selecting multiple providers.

## Knowledge Base

Supported uploads:

  Limit                    Value
  ------------------------ -------------------------------------
  File types               Text-based PDF, `.md`, UTF-8 `.txt`
  Maximum file size        5,000,000 bytes
  Maximum PDF pages        100
  Maximum extracted text   200,000 characters
  Maximum chunks           256

Ingestion is synchronous. No background progress stream or OCR is
implemented.

Standalone-indexed runbooks remain searchable but are not automatically
tracked as uploaded documents.

Deleting a document does not erase passages already stored in past
investigation snapshots.

MySQL and Qdrant do not share an atomic transaction. Inspect logs if
ingestion cleanup or deletion fails.

## Reports and provenance

New successful investigations record:

-   Requested analysis provider.
-   Actual analysis source.
-   Hypotheses and heuristic scores.
-   Evidence references.
-   Suggested checks.
-   Retrieved knowledge passages.

Labels distinguish:

``` text
Local AI analysis
Groq cloud analysis
Mistral cloud analysis
Rule-based fallback
Unknown / legacy result
```

History exports use the selected saved snapshot. They do not rerun
analysis or substitute the latest incident result.

Scores are model-reported or rule-based heuristics, not measured
probabilities.

## Tests and builds

Run backend tests:

``` powershell
Set-Location backend
python -m pytest -q
```

Or inside the development container:

``` powershell
docker exec incidentiq-backend python -m pytest -q
```

The backend suite reached `18 passed` before the latest single-provider
cloud-investigation changes. Rerun it after these changes; that earlier
count does not establish coverage of the new paths.

Existing tests cover areas including:

-   Upload validation.
-   Authentication requirements.
-   Log parsing.
-   Incident lookup and seeded scenarios.
-   Local workflow execution.
-   Retrieval and inference fallback.
-   Invalid evidence rejection.
-   Service-level privacy restrictions.

Tests can create development records. Never run them against production
storage.

Build the frontend:

``` powershell
Set-Location frontend
npm run build
```

### Provider-selection verification

Verify these cases using synthetic logs and mocked providers where
possible:

-   Privacy on permits only local analysis.
-   A direct cloud request is blocked when privacy is enabled.
-   Missing cloud confirmation is rejected.
-   Selecting Groq does not invoke Mistral or local chat inference.
-   Selecting Mistral does not invoke Groq or local chat inference.
-   Embeddings continue to use Ollama.
-   Cloud failure does not switch providers or overwrite a successful
    saved result.
-   Saved snapshots and exports identify the actual source.
-   Changing privacy after the page loads is still enforced by the
    backend.

## Troubleshooting

### Missing Python package

Verify the active interpreter and install dependencies with the same
Python used to start Uvicorn.

### Nginx 502

Inspect logs:

``` powershell
docker logs --tail 100 incidentiq-backend
docker logs --tail 100 incidentiq-frontend
```

Test FastAPI internally:

``` powershell
docker exec incidentiq-backend python -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=5).read().decode())"
```

Check that Uvicorn binds to `0.0.0.0:8000`.

If FastAPI is healthy but Nginx retained an old upstream address:

``` powershell
docker exec incidentiq-frontend nginx -t
docker exec incidentiq-frontend nginx -s reload
```

Configure service-name-based routing and appropriate DNS handling rather
than hardcoded container IPs.

### MySQL unavailable

Check database readiness, credentials, network membership, and
connection address.

Use the internal service name/port for containers sharing a network, and
the published host port for Windows tools.

### Only Ollama appears

Check:

-   Effective workspace privacy.
-   Deployment privacy lock.
-   Backend allowed-provider list.
-   Whether the running image includes the latest changes.

### Cloud provider fails

Check:

-   Key availability inside the backend container.
-   Configured model name and account access.
-   Effective privacy policy and confirmation.
-   Backend logs.
-   Ollama embedding and Qdrant retrieval availability.

Never paste API keys or complete credential-bearing database URLs into
issue reports.

### Local rule fallback appears

Logs distinguish retrieval, inference, and output-validation failures.

Do not weaken evidence checks simply to display an AI label.

## Limitations

-   Hypotheses are not verified diagnoses.
-   Matching evidence text does not establish causation.
-   Confidence values are not calibrated probabilities.
-   Cloud analysis still depends on local embedding-based retrieval.
-   Knowledge Base ingestion is synchronous.
-   Scanned PDFs require OCR outside this application.
-   MySQL and Qdrant operations are not transactionally atomic together.
-   Older snapshots may lack provider/model/timing metadata.
-   Model identity and execution timing are not comprehensively
    recorded.
-   Frontend analytics charts are not implemented.
-   The existing table-creation startup logic is not a substitute for
    controlled schema migrations.
-   Automated tests do not cover every UI, authorization, or
    external-provider path.

## Security and deployment

This configuration is intended for local development and demonstration.

Before public deployment, review:

-   TLS and reverse-proxy configuration.
-   Registration and privilege assignment.
-   Authentication and authorization coverage.
-   Secret storage and rotation.
-   Cloud data-handling approval.
-   File-processing limits.
-   Rate limiting and resource limits.
-   Image and dependency version locking.
-   Database migrations.
-   Backup and restore procedures.
-   Logs and sensitive-data exposure.
-   Published Docker ports.

IncidentIQ assists human investigation. It does not autonomously execute
remediation.
