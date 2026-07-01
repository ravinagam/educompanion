/**
 * Detect if extracted text is high quality enough to skip Vision API.
 * Returns true if text passes quality thresholds (no need for Vision).
 */
export interface TextQualityResult {
  isHighQuality: boolean;
  reason?: string;
  metrics: {
    length: number;
    readableCharRatio: number;
    hasMathSymbols: boolean;
    avgWordLength: number;
  };
}

export function assessTextQuality(text: string): TextQualityResult {
  const trimmed = text.trim();

  // Minimum length check
  if (trimmed.length < 1500) {
    return {
      isHighQuality: false,
      reason: 'Text too short (< 1500 chars)',
      metrics: { length: trimmed.length, readableCharRatio: 0, hasMathSymbols: false, avgWordLength: 0 }
    };
  }

  // Word count check
  const words = trimmed.split(/\s+/).filter(w => w.length > 0);
  if (words.length < 200) {
    return {
      isHighQuality: false,
      reason: 'Too few words (< 200)',
      metrics: { length: trimmed.length, readableCharRatio: 0, hasMathSymbols: false, avgWordLength: 0 }
    };
  }

  // Readable character ratio (Unicode-aware)
  const readableChars = (trimmed.match(/[\p{L}\p{N} \n]/gu) ?? []).length;
  const readableCharRatio = readableChars / trimmed.length;
  if (readableCharRatio < 0.50) {
    return {
      isHighQuality: false,
      reason: `Low readable char ratio (${(readableCharRatio * 100).toFixed(0)}% < 50%)`,
      metrics: { length: trimmed.length, readableCharRatio, hasMathSymbols: false, avgWordLength: 0 }
    };
  }

  // Average word length check (catches OCR jams)
  const avgWordLen = trimmed.length / words.length;
  if (avgWordLen > 25) {
    return {
      isHighQuality: false,
      reason: `Words jammed together (avg ${avgWordLen.toFixed(1)} chars > 25)`,
      metrics: { length: trimmed.length, readableCharRatio, hasMathSymbols: false, avgWordLength: avgWordLen }
    };
  }

  // Check for math symbols (if lots of math, Vision might be better for LaTeX)
  const mathSymbols = (trimmed.match(/[∑∫±√≤≥∞]/g) ?? []).length;
  const hasMathSymbols = mathSymbols > 10; // More than 10 rare math symbols = likely heavy math content

  if (hasMathSymbols) {
    return {
      isHighQuality: false,
      reason: 'Heavy math content detected — using Vision for LaTeX preservation',
      metrics: { length: trimmed.length, readableCharRatio, hasMathSymbols, avgWordLength }
    };
  }

  // All checks passed
  return {
    isHighQuality: true,
    metrics: { length: trimmed.length, readableCharRatio, hasMathSymbols, avgWordLength }
  };
}
