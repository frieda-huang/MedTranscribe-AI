# MedTranscribe AI

![UI](./chat-web-app/public/img2.png)
[Visit the demo site](https://med-transcribe-git-main-friedas-projects.vercel.app)

A chat interface that enables healthcare providers to interact with medical transcripts, extract patient information, and conduct intelligent follow-up conversations with context-aware responses.

## Features

-   **Patient Information Extraction**: Uses LLM to intelligently extract patient details from transcripts
-   **Context-Aware Responses**: Maintains conversation context for more relevant follow-ups
-   **Memory System**: Utilizes [mem0](https://github.com/mem0ai/mem0) to remember critical patient information across sessions
-   **File Upload**: Supports medical transcript file uploads and processing

## Tech Stack

-   **LLM**: [Ollama](https://ollama.com/) with Gemma3 and deepseek-r1:8b models if you want to run locally; otherwise, it's using Google's gemini-1.5-pro-latest by default
-   **Memory**: mem0 for persistent memory across conversations
-   **Frontend**: Next.js with TypeScript
-   **Backend**: Vercel AI SDK, Prisma ORM
-   **Database**: PostgreSQL ([Neon](https://neon.tech/))

## Context Management Approach

MedTranscribe AI employs five key techniques for clinical context management:

1. **Vector Memory**: Uses mem0 embeddings for semantic search of patient information
2. **Session Persistence**: Stores conversations in a `Session → Message → Content` schema
3. **Relational Model**: Implements User → Patient → Transcript → Session relationships
4. **Metadata Tagging**: Identifies critical clinical information for prioritized retrieval
5. **Optimized Prompts**: Structures LLM context to maximize relevance and recall

This enables semantic recall across interactions while maintaining clinical data relationships.

## Setup Instructions

### 1. Generate Synthetic Transcripts (Optional)

```bash
# Generate 5 transcripts
python backend/transcript-gen.py

# Generate 10 transcripts
python backend/transcript_gen.py --num-transcripts 10

# Specify output directory
python backend/transcript_gen.py --output-dir my_transcripts
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in:

```
DATABASE_URL=postgresql://username:password@hostname:port/database
MEM0_API_KEY=your_mem0_api_key
OLLAMA_API_URL=http://localhost:11434
GOOGLE_GENERATIVE_AI_API_KEY=
```

### 3. Install Dependencies & Start Server

```bash
pnpm install
npx prisma db push  # Sync database schema
npx prisma db seed  # Seed test user
pnpm run dev        # Start development server
```

## Usage

1. Upload a medical transcript
2. Ask questions about the transcript
3. Continue conversation with follow-up questions
4. Upload additional transcripts as needed
