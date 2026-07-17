# Testing Guide for AI & RAG Applications

Comprehensive guide to writing test cases for AI-powered systems, RAG pipelines, and LLM integrations.

---

## **1. TYPES OF TESTS FOR AI APPLICATIONS**

AI testing is **fundamentally different** from traditional software testing because outputs are **probabilistic**, not deterministic.

### **Traditional Software Testing**
```typescript
// ✅ Deterministic
function add(a: number, b: number): number {
  return a + b;  // Always 2 + 2 = 4
}

test('2 + 2 should equal 4', () => {
  expect(add(2, 2)).toBe(4);
});
```

### **AI Testing**
```typescript
// ❌ Non-deterministic
async function generateQuiz(chapter: string): Promise<Quiz> {
  return await claude.ask(`Create a quiz for: ${chapter}`);
}

test('generated quiz should be valid', async () => {
  const quiz = await generateQuiz('Photosynthesis');
  expect(quiz.questions.length).toBeGreaterThan(0);  // ← Might fail sometimes!
});
```

---

## **2. TESTING STRATEGY PYRAMID FOR AI**

```
                    ▲
                   /|\
                  / | \
                 /  |  \     Slow, expensive
                /   |   \    few tests
               /____|____\
              /     |     \
             /      |      \  Integration tests
            /       |       \ (with real LLM)
           /________|________\
          /         |         \  
         /          |          \ Unit tests
        /           |           \(pure functions)
       /____________|___________\
            Pyramid Base
        Fast, deterministic,
           many tests
```

### **Layer 1: Unit Tests (60%)**
✅ Test pure functions (no API calls)
- Cosine similarity calculation
- Input validation
- Error handling

### **Layer 2: Integration Tests (30%)**
✅ Test with mocked LLM responses
- Quiz generation logic
- RAG retrieval + formatting
- Database interactions

### **Layer 3: E2E Tests (10%)**
✅ Test with real LLM (expensive!)
- Full pipeline
- End-user scenarios
- Quality metrics

---

## **3. TESTING STRATEGIES BY COMPONENT**

### **A. PURE FUNCTIONS (Always Deterministic)**

**Example:** Cosine Similarity

```typescript
// src/lib/ai/similarity.ts
export function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, aVal, i) => sum + aVal * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return magnitudeA && magnitudeB ? dotProduct / (magnitudeA * magnitudeB) : 0;
}

// __tests__/unit/similarity.test.ts
describe('cosineSimilarity', () => {
  it('should return 1.0 for identical vectors', () => {
    const v = [1, 0, 0];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1.0, 5);
  });
  
  it('should return 0.0 for orthogonal vectors', () => {
    const v1 = [1, 0, 0];
    const v2 = [0, 1, 0];
    expect(cosineSimilarity(v1, v2)).toBeCloseTo(0.0, 5);
  });
  
  it('should handle zero vectors without crashing', () => {
    const zero = [0, 0, 0];
    const v = [1, 1, 1];
    expect(cosineSimilarity(zero, v)).toBe(0);
  });
  
  it('should return values in [-1, 1] range', () => {
    const a = Math.random();
    const b = Math.random();
    const v1 = [a, b];
    const v2 = [Math.random(), Math.random()];
    const result = cosineSimilarity(v1, v2);
    expect(result).toBeGreaterThanOrEqual(-1);
    expect(result).toBeLessThanOrEqual(1);
  });
  
  it('should be commutative (order independent)', () => {
    const v1 = [1, 2, 3];
    const v2 = [4, 5, 6];
    expect(cosineSimilarity(v1, v2))
      .toBeCloseTo(cosineSimilarity(v2, v1), 5);
  });
});
```

**Benefits:**
- ✅ Deterministic (same input = same output always)
- ✅ Fast (<1ms per test)
- ✅ No flakiness
- ✅ Good coverage of edge cases

---

### **B. DATA PROCESSING (Quality Gates)**

**Example:** Text Quality Assessment

```typescript
// src/lib/utils/text-quality.ts
export function assessTextQuality(text: string): TextQualityResult {
  const trimmed = text.trim();
  const words = trimmed.split(/\s+/).filter(w => w.length > 0);
  const readableChars = (trimmed.match(/[a-zA-Z0-9\s।.,:;?!'-]/g) ?? []).length;
  const readableCharRatio = readableChars / trimmed.length;
  
  if (trimmed.length < 1500) {
    return { isHighQuality: false, reason: 'Too short' };
  }
  if (readableCharRatio < 0.50) {
    return { isHighQuality: false, reason: 'Low readable ratio' };
  }
  return { isHighQuality: true };
}

// __tests__/unit/text-quality.test.ts
describe('assessTextQuality', () => {
  it('should mark high-quality text as high-quality', () => {
    const goodText = 'Lorem ipsum dolor sit amet. '.repeat(100);
    const result = assessTextQuality(goodText);
    expect(result.isHighQuality).toBe(true);
  });
  
  it('should reject text shorter than 1500 chars', () => {
    const shortText = 'Hello world';
    const result = assessTextQuality(shortText);
    expect(result.isHighQuality).toBe(false);
    expect(result.reason).toContain('short');
  });
  
  it('should reject text with low readable character ratio', () => {
    const garbledText = '!!!###$$$ %%%^^^&&& 🔥🔥🔥 '.repeat(100);
    const result = assessTextQuality(garbledText);
    expect(result.isHighQuality).toBe(false);
    expect(result.reason).toContain('readable');
  });
  
  it('should handle edge case of empty string', () => {
    const result = assessTextQuality('');
    expect(result.isHighQuality).toBe(false);
  });
  
  it('should handle Unicode text (Hindi)', () => {
    const hindiText = 'नमस्ते दुनिया। यह एक परीक्षा है। '.repeat(50);
    const result = assessTextQuality(hindiText);
    // Should be close to high quality (depends on readable char detection)
    expect(result).toHaveProperty('isHighQuality');
  });
});
```

---

### **C. API INTEGRATION (Mocked LLM)**

**Example:** Quiz Generation

```typescript
// src/lib/ai/quiz.ts
export async function generateQuiz(
  chapter: string,
  claude: Anthropic
): Promise<QuizQuestion[]> {
  const response = await claude.messages.create({
    model: 'claude-sonnet-4-6',
    messages: [{
      role: 'user',
      content: `Generate 5 quiz questions for: ${chapter}`
    }],
  });
  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  return parseQuizJson(text);
}

// __tests__/unit/quiz.test.ts
describe('generateQuiz', () => {
  it('should parse valid quiz JSON', async () => {
    // Mock Claude response
    const mockClaude = {
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{
            type: 'text',
            text: JSON.stringify([
              {
                type: 'mcq',
                question: 'What is photosynthesis?',
                options: ['A: ...', 'B: ...', 'C: ...', 'D: ...'],
                correct: 'A'
              }
            ])
          }],
        })
      }
    };
    
    const quiz = await generateQuiz('Photosynthesis', mockClaude as any);
    
    expect(quiz).toHaveLength(1);
    expect(quiz[0].type).toBe('mcq');
    expect(quiz[0].options).toHaveLength(4);
  });
  
  it('should handle malformed JSON with fallback', async () => {
    const mockClaude = {
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{
            type: 'text',
            text: 'Not valid JSON at all!'
          }],
        })
      }
    };
    
    // Should either throw or return empty
    expect(async () => {
      await generateQuiz('Chapter', mockClaude as any);
    }).rejects.toThrow();
  });
  
  it('should validate all required fields', async () => {
    const mockClaude = {
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{
            type: 'text',
            text: JSON.stringify([
              {
                type: 'mcq',
                question: 'Question?',
                // Missing options and correct answer
              }
            ])
          }],
        })
      }
    };
    
    expect(async () => {
      await generateQuiz('Chapter', mockClaude as any);
    }).rejects.toThrow('required fields');
  });
});
```

---

## **4. TESTING RAG SYSTEMS**

### **Unit Tests: Retrieval Logic**

```typescript
// __tests__/unit/rag-retrieval.test.ts
describe('RAG Retrieval', () => {
  describe('cosineSimilarity', () => {
    it('should correctly rank chunk relevance', () => {
      const questionVector = [0.1, 0.9, 0.2, 0.3];
      
      const chunks = [
        {
          text: 'Photosynthesis is...',
          vector: [0.15, 0.88, 0.25, 0.28]  // Similar to question
        },
        {
          text: 'The mitochondria...',
          vector: [0.8, 0.1, 0.7, 0.2]      // Not similar
        }
      ];
      
      const scores = chunks.map(c => ({
        text: c.text,
        score: cosineSimilarity(questionVector, c.vector)
      }));
      
      const sorted = scores.sort((a, b) => b.score - a.score);
      expect(sorted[0].text).toContain('Photosynthesis');
      expect(sorted[1].text).toContain('mitochondria');
    });
  });
  
  describe('topK selection', () => {
    it('should return exactly K chunks', () => {
      const chunks = Array.from({ length: 50 }, (_, i) => ({
        text: `Chunk ${i}`,
        similarity: Math.random()
      }));
      
      const top5 = chunks
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 5);
      
      expect(top5).toHaveLength(5);
    });
    
    it('should handle fewer than K chunks gracefully', () => {
      const chunks = Array.from({ length: 3 }, (_, i) => ({
        text: `Chunk ${i}`,
        similarity: Math.random()
      }));
      
      const topK = chunks
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 5);
      
      expect(topK).toHaveLength(3);  // Not 5
    });
  });
});
```

### **Integration Tests: Retrieval + Augmentation**

```typescript
// __tests__/integration/rag-pipeline.test.ts
describe('RAG Pipeline', () => {
  it('should augment prompt with relevant chunks', async () => {
    const question = 'What is photosynthesis?';
    const chunks = [
      'Photosynthesis is the process where plants convert light energy...',
      'The main products of photosynthesis are glucose and oxygen...',
      'Photosynthesis occurs in the chloroplasts of plant cells...'
    ];
    
    const augmentedPrompt = buildPrompt(question, chunks);
    
    // Should include both question and chunks
    expect(augmentedPrompt).toContain(question);
    expect(augmentedPrompt).toContain('Photosynthesis');
    expect(augmentedPrompt).toContain('glucose');
    expect(augmentedPrompt).toContain('chloroplasts');
    
    // Should have reasonable length
    expect(augmentedPrompt.length).toBeGreaterThan(100);
    expect(augmentedPrompt.length).toBeLessThan(10000);
  });
  
  it('should handle graceful degradation when no chunks found', async () => {
    const question = 'What is photosynthesis?';
    const chunks: string[] = [];  // No chunks
    
    const augmentedPrompt = buildPrompt(question, chunks);
    
    // Should still include question (just no context chunks)
    expect(augmentedPrompt).toContain(question);
  });
});
```

---

## **5. TESTING WITH REAL LLMs (E2E)**

**⚠️ Warning:** Real LLM tests are:
- ❌ Slow (1-10 seconds per test)
- ❌ Expensive ($0.01-0.10 per test)
- ❌ Flaky (might fail randomly)
- ✅ Essential for quality assurance

### **Strategy: Use Test-Specific Model & Budget**

```typescript
// __tests__/e2e/quiz-generation.test.ts
describe('Quiz Generation E2E (expensive, slow)', () => {
  // Skip in CI if budget limited
  const shouldRun = process.env.ENABLE_LLM_TESTS === 'true';
  const test_fn = shouldRun ? test : test.skip;
  
  test_fn('should generate valid quiz from chapter', async () => {
    const chapter = `
      Photosynthesis is the process by which plants convert light energy 
      into chemical energy. It occurs in two main stages: light-dependent 
      reactions and the Calvin cycle.
    `;
    
    const quiz = await generateQuiz(chapter);
    
    // Assertions:
    // 1. Structure is valid
    expect(quiz).toHaveProperty('questions');
    expect(Array.isArray(quiz.questions)).toBe(true);
    
    // 2. Has reasonable number of questions
    expect(quiz.questions.length).toBeGreaterThanOrEqual(3);
    expect(quiz.questions.length).toBeLessThanOrEqual(10);
    
    // 3. Each question is well-formed
    quiz.questions.forEach(q => {
      expect(q).toHaveProperty('question');
      expect(q.question.length).toBeGreaterThan(10);
      expect(q).toHaveProperty('type');
      expect(['mcq', 'true_false', 'fill_blank']).toContain(q.type);
    });
    
    // 4. Questions are relevant to chapter
    const quizText = JSON.stringify(quiz).toLowerCase();
    expect(quizText).toMatch(/photosynthesis|plant|light|energy/i);
  }, { timeout: 30000 });  // 30 second timeout for LLM
  
  test_fn('should handle Hindi content', async () => {
    const chapter = `
      प्रकाश संश्लेषण वह प्रक्रिया है जिसमें पौधे प्रकाश को 
      रासायनिक ऊर्जा में परिवर्तित करते हैं।
    `;
    
    const quiz = await generateQuiz(chapter);
    expect(quiz.questions.length).toBeGreaterThan(0);
  }, { timeout: 30000 });
});
```

---

## **6. QUALITY METRICS FOR AI OUTPUTS**

### **A. Deterministic Checks (Always)**

```typescript
function validateQuizQuality(quiz: Quiz): ValidationResult {
  const issues: string[] = [];
  
  // Check structure
  if (!quiz.questions || !Array.isArray(quiz.questions)) {
    issues.push('Missing questions array');
  }
  
  if (quiz.questions.length < 3) {
    issues.push('Too few questions (need at least 3)');
  }
  
  if (quiz.questions.length > 20) {
    issues.push('Too many questions (max 20)');
  }
  
  // Check each question
  quiz.questions.forEach((q, i) => {
    if (!q.question || q.question.length < 10) {
      issues.push(`Question ${i}: too short`);
    }
    
    if (!q.type || !['mcq', 'true_false'].includes(q.type)) {
      issues.push(`Question ${i}: invalid type`);
    }
    
    if (q.type === 'mcq' && (!q.options || q.options.length !== 4)) {
      issues.push(`Question ${i}: need exactly 4 options`);
    }
  });
  
  return {
    isValid: issues.length === 0,
    issues
  };
}

// Test it
test('should validate quiz structure', async () => {
  const quiz = await generateQuiz(chapter);
  const result = validateQuizQuality(quiz);
  
  expect(result.isValid).toBe(true);
  expect(result.issues).toEqual([]);
});
```

### **B. Semantic Checks (Heuristic)**

```typescript
function validateQuizContent(quiz: Quiz, chapter: string): ContentValidation {
  const chapterWords = new Set(
    chapter.toLowerCase().split(/\s+/)
  );
  
  const keywordMatches = quiz.questions.filter(q => {
    const questionWords = q.question.toLowerCase().split(/\s+/);
    const overlap = questionWords.filter(w => chapterWords.has(w)).length;
    return overlap > 0;  // At least one word from chapter
  });
  
  return {
    relevanceScore: keywordMatches.length / quiz.questions.length,
    isRelevant: keywordMatches.length / quiz.questions.length > 0.7
  };
}

// Test it
test('should ask questions relevant to chapter', async () => {
  const quiz = await generateQuiz(chapter);
  const validation = validateQuizContent(quiz, chapter);
  
  expect(validation.isRelevant).toBe(true);
  expect(validation.relevanceScore).toBeGreaterThan(0.7);
});
```

---

## **7. TESTING STRATEGY: HYBRID APPROACH**

```
Test Suite Structure:

__tests__/
├── unit/
│  ├── cosine-similarity.test.ts      (✅ Deterministic, 5ms)
│  ├── text-quality.test.ts           (✅ Deterministic, 10ms)
│  ├── quiz-validation.test.ts        (✅ Deterministic, 5ms)
│  └── rag-ranking.test.ts            (✅ Deterministic, 10ms)
│
├── integration/
│  ├── rag-pipeline.test.ts           (✅ Mocked LLM, 100ms)
│  ├── quiz-generation.test.ts        (✅ Mocked LLM, 100ms)
│  └── pdf-extraction.test.ts         (✅ Mocked Vision, 50ms)
│
└── e2e/
   ├── full-rag-flow.test.ts          (⚠️ Real LLM, 5s, $0.05)
   ├── question-answering.test.ts     (⚠️ Real LLM, 3s, $0.02)
   └── quiz-generation-real.test.ts   (⚠️ Real LLM, 10s, $0.10)

Run with: npm run test                   (unit + integration)
Run with: ENABLE_LLM_TESTS=true npm test (includes e2e)
```

---

## **8. HANDLING FLAKINESS IN AI TESTS**

### **Problem: Non-deterministic outputs**

```typescript
// ❌ This fails randomly!
test('quiz should mention photosynthesis', async () => {
  const quiz = await generateQuiz('Photosynthesis');
  expect(JSON.stringify(quiz)).toMatch(/photosynthesis/i);
  // 90% of the time passes, 10% fails (non-deterministic)
});
```

### **Solution 1: Test Structure, Not Content**

```typescript
// ✅ This always passes
test('quiz should have valid structure', async () => {
  const quiz = await generateQuiz('Photosynthesis');
  
  // Test structure, not content
  expect(quiz.questions).toBeDefined();
  expect(quiz.questions.length).toBeGreaterThan(0);
  
  quiz.questions.forEach(q => {
    expect(q.question).toBeDefined();
    expect(q.question.length).toBeGreaterThan(0);
    expect(['mcq', 'true_false']).toContain(q.type);
  });
});
```

### **Solution 2: Probabilistic Assertions**

```typescript
// ✅ Probabilistic assertion
test('quiz should usually mention key topics', async () => {
  const results = [];
  
  // Run 5 times
  for (let i = 0; i < 5; i++) {
    const quiz = await generateQuiz('Photosynthesis');
    const mentioned = JSON.stringify(quiz).toLowerCase()
      .includes('photosynthesis');
    results.push(mentioned);
  }
  
  // Expect at least 4 out of 5
  const successes = results.filter(r => r).length;
  expect(successes).toBeGreaterThanOrEqual(4);
});
```

### **Solution 3: Use Snapshots Carefully**

```typescript
// ⚠️ Use snapshot testing only for high-variance content
test('quiz output snapshot', async () => {
  const quiz = await generateQuiz('Chapter');
  
  // Snapshot the structure, not exact content
  expect({
    questionCount: quiz.questions.length,
    types: quiz.questions.map(q => q.type),
    hasAllFields: quiz.questions.every(q => 
      q.question && q.type && q.options
    )
  }).toMatchSnapshot();
});
```

---

## **9. TESTING CHECKLIST FOR AI APPS**

```
Unit Tests (60%):
- [ ] Pure functions (math, parsing, validation)
- [ ] Error handling
- [ ] Edge cases (null, empty, huge inputs)
- [ ] Type safety

Integration Tests (30%):
- [ ] API calls with mocks
- [ ] Database operations
- [ ] Pipeline orchestration
- [ ] Error propagation

E2E Tests (10%):
- [ ] Real LLM calls
- [ ] Full user flows
- [ ] Quality metrics
- [ ] Performance under load

Quality Assurance:
- [ ] Deterministic structure checks
- [ ] Semantic relevance checks
- [ ] Token count validation
- [ ] Cost tracking
- [ ] Error rate monitoring

Documentation:
- [ ] Test purpose comments
- [ ] Known flakiness documented
- [ ] Cost of E2E tests noted
- [ ] Timeout values justified
```

---

## **10. EXAMPLE: COMPLETE TEST SUITE**

```typescript
// __tests__/unit/rag.test.ts
import { describe, it, expect } from 'vitest';
import { cosineSimilarity, assessTextQuality } from '@/lib/ai';

describe('RAG System - Unit Tests', () => {
  describe('Cosine Similarity', () => {
    it('should compute correct similarity for known vectors', () => {
      const v1 = [1, 0, 0];
      const v2 = [1, 0, 0];
      expect(cosineSimilarity(v1, v2)).toBeCloseTo(1.0);
    });
    
    it('should return 0 for orthogonal vectors', () => {
      const v1 = [1, 0, 0];
      const v2 = [0, 1, 0];
      expect(cosineSimilarity(v1, v2)).toBeCloseTo(0.0);
    });
    
    it('should handle zero vector without division by zero', () => {
      const zero = [0, 0, 0];
      const v = [1, 1, 1];
      expect(cosineSimilarity(zero, v)).toBe(0);
    });
  });
  
  describe('Text Quality', () => {
    it('should accept high-quality text', () => {
      const goodText = 'Lorem ipsum dolor sit amet. '.repeat(100);
      const result = assessTextQuality(goodText);
      expect(result.isHighQuality).toBe(true);
    });
    
    it('should reject low-quality text', () => {
      const poorText = '!!!###$$$';
      const result = assessTextQuality(poorText);
      expect(result.isHighQuality).toBe(false);
    });
  });
});

// __tests__/integration/rag.test.ts
import { describe, it, expect, vi } from 'vitest';
import { generateQuiz } from '@/lib/ai';

describe('RAG Pipeline - Integration Tests', () => {
  it('should build valid prompt from chunks', () => {
    const question = 'What is X?';
    const chunks = ['First chunk', 'Second chunk'];
    
    const prompt = buildPrompt(question, chunks);
    
    expect(prompt).toContain(question);
    expect(prompt).toContain('First chunk');
    expect(prompt).toContain('Second chunk');
  });
});

// __tests__/e2e/rag.test.ts
describe('RAG - E2E Tests', () => {
  const RUN_EXPENSIVE = process.env.ENABLE_LLM_TESTS === 'true';
  const test_fn = RUN_EXPENSIVE ? test : test.skip;
  
  test_fn('should generate quality quiz with real LLM', async () => {
    const chapter = 'Content about Photosynthesis...';
    const quiz = await generateQuiz(chapter);
    
    expect(quiz.questions.length).toBeGreaterThan(0);
    expect(quiz.questions[0]).toHaveProperty('question');
    expect(quiz.questions[0]).toHaveProperty('type');
  }, { timeout: 30000 });
});
```

---

## **SUMMARY: AI Testing Best Practices**

| Aspect | Best Practice |
|---|---|
| **Test Structure** | 60% unit, 30% integration, 10% E2E |
| **Mock Strategy** | Always mock external LLM calls except E2E |
| **Assertions** | Test structure/format, not exact content |
| **Flakiness** | Document expected flakiness, use retries for E2E |
| **Cost** | Track cost of E2E tests, run only when necessary |
| **Timeout** | LLM tests need 30s+ timeout |
| **Environment** | Use ENABLE_LLM_TESTS flag to control expensive tests |
| **Determinism** | Maximize deterministic tests, minimize probabilistic |
| **Quality Metrics** | Combine structural + semantic checks |
| **Documentation** | Comment why assertions exist, especially for AI |

---

## **Tools & Frameworks**

**Testing Framework:**
- Vitest (fast, ESM-native)
- Jest (mature, slower)

**Mocking:**
- `vi.fn().mockResolvedValue()` for LLM responses
- `vi.mock()` for module mocking

**Quality Validation:**
- Zod/TypeScript for structure
- Regex/string matching for content
- Heuristics for semantic checks

**Cost Management:**
- Track token counts
- Use cheaper models in tests (Haiku)
- Batch test runs (run expensive tests nightly)

🚀 Ready to test your AI system!
