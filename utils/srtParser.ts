import { SRTSegment } from "../types";

// Helper to convert timestamp (00:00:01,000 or 00:00:01.000) to seconds
const timeToSeconds = (timeString: string): number => {
  if (!timeString) return 0;
  // Standardize separator to dot
  const standardized = timeString.replace(',', '.').trim();
  const parts = standardized.split(':');
  
  if (parts.length < 3) return 0;

  const hours = parseFloat(parts[0]);
  const minutes = parseFloat(parts[1]);
  const seconds = parseFloat(parts[2]);
  
  return (hours * 3600) + (minutes * 60) + seconds;
};

export const isSRTFormat = (text: string): boolean => {
  // Check for the characteristic timestamp pattern (00:00:00,000 --> 00:00:00,000)
  // Allow for both comma and dot separators
  return /\d{2}:\d{2}:\d{2}[,.]\d{3}\s-->\s\d{2}:\d{2}:\d{2}[,.]\d{3}/.test(text);
};

export const parseSRTSegments = (srtContent: string): SRTSegment[] => {
  const segments: SRTSegment[] = [];
  // Normalize line endings
  const normalizedContent = srtContent.replace(/\r\n/g, '\n');
  // Split by double newlines to get blocks
  const blocks = normalizedContent.split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 2) continue; // Need at least timestamp and text

    let id = '';
    let timeLineIndex = 0;

    // Try to find the timestamp line
    // It's usually the second line, but sometimes index is missing
    if (lines[0].match(/\d{2}:\d{2}:\d{2}/)) {
        timeLineIndex = 0;
        id = `segment-${segments.length + 1}`;
    } else if (lines[1] && lines[1].match(/\d{2}:\d{2}:\d{2}/)) {
        timeLineIndex = 1;
        id = lines[0].trim();
    } else {
        continue; // invalid block
    }
    
    // Parse Timestamp
    const timeLine = lines[timeLineIndex];
    const timeMatch = timeLine.match(/(\d{2}:\d{2}:\d{2}[,.]\d{3})\s-->\s(\d{2}:\d{2}:\d{2}[,.]\d{3})/);
    
    if (!timeMatch) continue;

    const startTime = timeToSeconds(timeMatch[1]);
    const endTime = timeToSeconds(timeMatch[2]);

    // Extract Text (everything after timestamp line)
    const textLines = lines.slice(timeLineIndex + 1);
    const text = textLines
      .join(' ')
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\{[^}]*\}/g, '') // Remove ASS/SSA style tags
      .trim();

    if (text) {
      segments.push({ id, startTime, endTime, text });
    }
  }

  return segments;
};

/**
 * Parses SRT subtitle content and extracts only the text (Legacy mode).
 */
export const parseSRT = (srtContent: string): string => {
  const segments = parseSRTSegments(srtContent);
  return segments.map(s => s.text).join(' ');
};