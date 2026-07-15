# Summary Generation Error: Diagnostic Guide

## **What We've Done**

We improved the error handling and logging to help diagnose why summary generation is failing.

### **Improvements Made**

**1. Better Error Logging (claude.ts)**
```typescript
// OLD: Silent failure with generic warning
console.warn('[generateChapterSummary] JSON parse failed...');

// NEW: Detailed diagnostic logging
console.error('[generateChapterSummary] JSON parse failed:', {
  error: errorMsg,
  textLength: text.length,
  textPreview: text.substring(0, 200),  // First 200 chars
  chapterName
});
```

**2. Better Error Messages (API route)**
```typescript
// OLD: Generic error
return NextResponse.json({ error: 'AI error' }, { status: 500 });

// NEW: Meaningful message + dev details
return NextResponse.json({
  error: 'Failed to generate summary. Please try again.',
  details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
}, { status: 500 });
```

**3. Improved Fallback Summary**
- Extracts meaningful content from raw text
- Finds proper sentences for quick_recap
- Filters for term:explanation pairs in key_concepts
- Always returns a valid summary structure

---

## **How to Diagnose the Issue**

### **Step 1: Check Server Logs**

When summary generation fails, look for logs like:

```
[generateChapterSummary] JSON parse failed: {
  error: "Unexpected token..." | "Invalid JSON" | etc,
  textLength: 1234,
  textPreview: "{ \"quick_recap\": \"...",
  chapterName: "Chapter Name"
}
```

**What this tells you:**
- `error` = What specifically failed
- `textLength` = How much Claude returned
- `textPreview` = Is it actually JSON or something else?

### **Step 2: Common Failure Patterns**

**Pattern 1: Claude returns markdown-wrapped JSON**
```
❌ Claude returns:
```json
{ "quick_recap": "..." }
```

✅ Our parser now strips this automatically
```

**Pattern 2: Claude returns partial/incomplete JSON**
```
❌ Claude returns:
{ "quick_recap": "Summary...", "key_points": [
  // incomplete, missing closing brackets
```

→ Logs will show `error: "Unexpected end of JSON input"`

**Pattern 3: Claude returns non-JSON text**
```
❌ Claude returns:
"Here's a summary: The chapter covers photosynthesis..."
(No JSON at all)
```

→ Logs will show `error: "Unexpected token 'H' in JSON at position 0"`
→ Our fallback will extract this and create a summary

**Pattern 4: Prompt not being understood**
```
❌ Claude returns something completely off-topic
```

→ This would show in `textPreview` in logs

---

## **Current Status**

✅ **Error visibility improved** — Now shows meaningful messages  
✅ **Diagnostic logging added** — Check server logs for details  
✅ **Fallback enhanced** — Graceful degradation even if Claude fails  

❓ **Root cause unclear** — Need to see actual error logs

---

## **How to Check the Error**

### **Option 1: Check Browser Console**
1. Open DevTools (F12)
2. Go to Network tab
3. Find the POST to `/api/chapters/[id]/summary`
4. Look at Response tab for the error message

### **Option 2: Check Application Logs**

If deployed to Vercel:
1. Go to Vercel dashboard
2. Click on "Functions" → "Logs"
3. Filter for "summary" errors

If running locally:
1. Open terminal where Next.js is running
2. Look for `[generateChapterSummary]` or `[generateChapterSummaryFromImages]` messages

---

## **Expected Error Messages**

### **If JSON Parsing Fails**
```
Failed to generate summary. Please try again.
(details shown only in development mode)
```

With logs showing:
```
[generateChapterSummary] JSON parse failed: {
  error: "SyntaxError: Unexpected token '}' in JSON at position 123",
  textLength: 2156,
  textPreview: "{ \"quick_recap\": \"...",
  chapterName: "Introduction to Trigonometry"
}
```

### **If Database Insert Fails**
```
Failed to generate summary. Please try again.
```

With logs showing:
```
[summary] Error generating summary: {
  error: "duplicate key value violates unique constraint...",
  chapterId: "...",
  isScreenshots: false
}
```

### **If Fallback Works**
```
Success! Summary generated and displayed.
```

With logs showing:
```
[generateChapterSummary] JSON parse failed: ...
[generateChapterSummary] Using fallback summary from raw text
```

---

## **What to Do Next**

### **1. Attempt summary generation again**
The improved error handling will now:
- Show what went wrong
- Log diagnostic details
- Use a fallback if needed

### **2. Check the error message**
- Look at the browser error message
- Check server logs for details
- Share both with the team

### **3. Possible Root Causes**

Based on the logs, the issue could be:

| Log Message | Likely Cause | Solution |
|---|---|---|
| `Unexpected token` | Malformed JSON from Claude | Re-run; Claude may retry correctly |
| `End of JSON input` | Incomplete response | Increase max_tokens (currently 2048) |
| `Duplicate key` | Chapter already has summary | Try "regenerate" instead of "generate" |
| Network timeout | API timeout or slow network | Check connectivity, increase timeout |
| `403 Unauthorized` | API key issue | Check ANTHROPIC_API_KEY is set |

---

## **Files Changed**

**1. `/app/api/chapters/[id]/summary/route.ts`**
- Added detailed error logging with context
- Shows meaningful error message to user
- Includes diagnostic info for debugging

**2. `/lib/ai/claude.ts`**
- Enhanced error logging in `generateChapterSummary()`
- Enhanced error logging in `generateChapterSummaryFromImages()`
- Improved fallback summary generation
- Logs text preview for debugging

---

## **Testing the Fix**

### **Local Testing**

1. Start Next.js dev server: `npm run dev`
2. Generate a summary for any chapter
3. If it fails, check terminal logs for the detailed error
4. Share the error details with the team

### **Production Testing**

1. Check Vercel logs after summary generation attempt
2. Verify the error message is clear
3. Confirm fallback works if needed

---

## **Next Steps**

Once you see the actual error message, we can:
1. Identify the root cause
2. Implement a targeted fix
3. Verify all tests pass
4. Deploy with confidence

**The improved logging will help us diagnose the exact issue!** 🔍
