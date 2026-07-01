# Voyage AI Integration in EduCompanion

Complete details on where and how Voyage AI is used for embeddings.

---

## **What is Voyage AI?**

**Voyage AI** = Multilingual embedding service (1024-dimensional vectors)

- **Model:** `voyage-multilingual-2`
- **Handles:** English + Hindi (Devanagari)
- **Vector dimension:** 1024
- **Cost:** $0.06 per 1M input tokens (~$0.03 per chapter)
- **Purpose:** Enable semantic search (RAG) for Q&A

---

## **Where Voyage AI is Used**

### **1. Chapter Embedding Pipeline** (Line 145-158 in `lib/chapters/process.ts`)

When a chapter is uploaded:

```
PDF Upload
    ↓
Extract text
    ↓
Chunk text (semantic splits)
    ↓
Call Voyage AI embedBatch()  ← HERE
    ↓
Store vectors in chapter_embeddings table
    ↓
Students can ask questions (RAG)
```

**Code flow:**
```typescript
// 1. Split chapter into chunks
const chunks = chunkText(contentText);

// 2. Batch embed chunks (20 at a time)
for (let i = 0; i < chunks.length; i += batchSize) {
  const batch = chunks.slice(i, i + batchSize);
  const vectors = await embedBatch(batch);  // ← Voyage AI call
  
  // 3. Store vectors in database
  const rows = batch.map((chunk, j) => ({
    chapter_id: chapterId,
    chunk_text: chunk,
    embedding_vector: vectors[j],  // 1024-dim vector
    chunk_index: i + j,
  }));
  await admin.from('chapter_embeddings').insert(rows);
}
```

**Batch size:** 20 chunks per API call (efficiency)

---

### **2. Embedding API** (`lib/ai/embeddings.ts`)

**Core functions:**

```typescript
// Raw Voyage API call
async function voyageEmbed(inputs: string[]): Promise<number[][]> {
  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({ 
      input: inputs, 
      model: 'voyage-multilingual-2' 
    }),
  });
  return json.data.map(d => d.embedding);
}

// Public API
export async function embedBatch(texts: string[]): Promise<number[][]> {
  return voyageEmbed(texts.map(t => t.slice(0, 32000)));
}

export async function embedText(text: string): Promise<number[]> {
  const results = await voyageEmbed([text.slice(0, 32000)]);
  return results[0];
}
```

**Limits:**
- Max input per text: 32,000 characters (enforced)
- Timeout: 30 seconds per request
- Batch up to N texts per API call

---

### **3. Cost Tracking** (Line 160-164 in `lib/chapters/process.ts`)

Each embedding request is logged for cost analysis:

```typescript
if (userId) {
  const totalChars = chunks.reduce((sum, c) => sum + c.length, 0);
  const estTokens = Math.round(totalChars / 4);
  const costUsd = (estTokens / 1_000_000) * VOYAGE_COST_PER_M;  // $0.06/M
  logCostDirect(userId, 'embeddings', 'voyage-multilingual-2', estTokens, costUsd);
}
```

**Logged in:** `ai_usage_logs` table for user billing/analytics

---

### **4. Database Storage** (`chapter_embeddings` table)

```sql
CREATE TABLE chapter_embeddings (
  id UUID PRIMARY KEY,
  chapter_id UUID REFERENCES chapters(id),
  chunk_text TEXT,                           -- Original text chunk
  embedding_vector VECTOR(1024),             -- pgvector type (Voyage AI output)
  chunk_index INT,                           -- Position in chapter
  created_at TIMESTAMP
);

-- Index for fast similarity search
CREATE INDEX ON chapter_embeddings 
USING ivfflat (embedding_vector vector_cosine_ops);
```

**Why pgvector?**
- PostgreSQL extension for vector operations
- Supports cosine similarity search
- Enables `embedding_vector <-> query_vector` operations

---

## **How RAG Works (Planned for Q&A)**

When a student asks a question:

```
1. Convert question to embedding
   Question: "What is photosynthesis?"
       ↓
   embedText(question) ← Voyage AI
       ↓
   Query vector: [0.234, -0.891, 0.123, ..., 0.456]

2. Search database for similar chunks
   SELECT chunk_text 
   FROM chapter_embeddings
   WHERE chapter_id = ?
   ORDER BY embedding_vector <-> query_vector
   LIMIT 5;  ← Top 5 most relevant chunks

3. Augment prompt with chunks
   "Context from chapter: [chunk1] ... [chunk5]
    Question: What is photosynthesis?"
       ↓
   Claude Sonnet generates answer

4. Return to student
   "Photosynthesis is the process where..."
```

**Current state:** Embeddings are stored but NOT actively used for retrieval yet
- Infrastructure is in place
- Awaiting Q&A retrieval implementation

---

## **Files Using Voyage AI**

| File | Function | Line |
|---|---|---|
| `lib/ai/embeddings.ts` | `voyageEmbed()`, `embedBatch()`, `embedText()` | 6-54 |
| `lib/chapters/process.ts` | Call `embedBatch()` + cost logging | 145-164 |
| `lib/ai/usage.ts` | Log embedding costs | 23, 42 |
| `__tests__/unit/text-extraction.test.ts` | Test embedding pipeline | - |

---

## **Cost Analysis**

### **Per Chapter**

| Component | Chars | Tokens | Cost @ $0.06/M |
|---|---|---|---|
| Typical chapter | 10,000 | 2,500 | $0.00015 |
| Large chapter | 50,000 | 12,500 | $0.00075 |
| Dense chapter | 100,000 | 25,000 | $0.0015 |
| **Average** | **20,000** | **5,000** | **$0.0003** |

### **Per 100 Uploaded Chapters**
- Embedding cost: 100 × $0.0003 = **$0.03/month** (negligible)
- Storage cost: ~50 MB in Supabase (free tier)
- Query cost: Handled by pgvector (no Voyage API calls)

---

## **Multilingual Support**

`voyage-multilingual-2` handles:
- **English** ✓
- **Hindi (Devanagari)** ✓
- 150+ other languages
- No language detection needed — same model for all

**Example vectors:**
```
"Photosynthesis" (English)
  ↓
[0.234, -0.891, 0.123, ..., 0.456]

"प्रकाश संश्लेषण" (Hindi)
  ↓
[0.245, -0.885, 0.118, ..., 0.459]  ← Similar vector!

cosine_similarity = 0.98 (high relevance)
```

---

## **Benefits of Voyage AI**

✅ **Semantic search** — Find relevant chunks even with different wording
✅ **Multilingual** — Same model for English + Hindi
✅ **Fast** — ~1-2ms per query vector
✅ **Cheap** — $0.06/1M tokens (cheaper than OpenAI's embeddings)
✅ **Dimension efficiency** — 1024-dim is good tradeoff (quality vs storage)

---

## **Next Steps for Full RAG**

To enable live Q&A retrieval:

1. **Implement retrieval endpoint:**
   ```typescript
   POST /api/chapters/[id]/search
   { question: "What is photosynthesis?" }
   
   // Query embeddings
   const { data: chunks } = await supabase
     .from('chapter_embeddings')
     .select('chunk_text')
     .eq('chapter_id', chapterId)
     .order('embedding_vector <-> query_vector')  // pgvector similarity
     .limit(5);
   ```

2. **Augment Claude prompt with retrieved chunks** (already done in `chatWithChapter()`)

3. **Log retrieval success metrics** for quality monitoring

**Current implementation:** Uses raw chapter content (works, but less precise than RAG)

---

## **Configuration**

**Environment variable:**
```
VOYAGE_API_KEY=pa-5SbMJp26-7JVvdjXMjzacqC4LGIBPR0juXDBQ_QwEhQ
```

**Cost tracking:**
- Operation: `'embeddings'`
- Model: `'voyage-multilingual-2'`
- Logged to: `ai_usage_logs` table
- Cost: `(tokens / 1_000_000) * $0.06`

---

## **Summary**

| Aspect | Details |
|---|---|
| **Service** | Voyage AI (voyage-multilingual-2) |
| **Use** | Generate 1024-dim embeddings for chapters |
| **Data** | Stored in `chapter_embeddings` PostgreSQL table with pgvector |
| **When** | At chapter upload time (one-time cost) |
| **Cost** | ~$0.0003 per chapter, negligible at scale |
| **Status** | Infrastructure ready; Q&A retrieval not yet implemented |
| **Next** | Hook up retrieval for live RAG Q&A |
