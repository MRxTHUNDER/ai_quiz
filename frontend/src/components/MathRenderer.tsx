import { BlockMath, InlineMath } from "react-katex";
import "katex/dist/katex.min.css";

interface MathRendererProps {
  text: string;
  className?: string;
}

/**
 * Renders text with LaTeX math expressions properly formatted
 * Supports both inline math \( ... \) and display math \[ ... \]
 */
export default function MathRenderer({ text, className = "" }: MathRendererProps) {
  // Split text by LaTeX delimiters
  const parts: (string | { type: "inline" | "display"; content: string })[] = [];
  let currentIndex = 0;
  let buffer = "";

  while (currentIndex < text.length) {
    // Check for inline math \( ... \)
    if (
      text[currentIndex] === "\\" &&
      currentIndex + 1 < text.length &&
      text[currentIndex + 1] === "("
    ) {
      // Save any text before the math
      if (buffer.trim()) {
        parts.push(buffer);
        buffer = "";
      }

      // Find the closing \)
      let mathEnd = currentIndex + 2;
      while (mathEnd < text.length) {
        if (
          text[mathEnd] === "\\" &&
          mathEnd + 1 < text.length &&
          text[mathEnd + 1] === ")"
        ) {
          const mathContent = text.substring(currentIndex + 2, mathEnd);
          parts.push({ type: "inline", content: mathContent });
          currentIndex = mathEnd + 2;
          break;
        }
        mathEnd++;
      }

      if (mathEnd >= text.length) {
        // No closing found, treat as regular text
        buffer += text[currentIndex];
        currentIndex++;
      }
    }
    // Check for display math \[ ... \]
    else if (
      text[currentIndex] === "\\" &&
      currentIndex + 1 < text.length &&
      text[currentIndex + 1] === "["
    ) {
      // Save any text before the math
      if (buffer.trim()) {
        parts.push(buffer);
        buffer = "";
      }

      // Find the closing \]
      let mathEnd = currentIndex + 2;
      while (mathEnd < text.length) {
        if (
          text[mathEnd] === "\\" &&
          mathEnd + 1 < text.length &&
          text[mathEnd + 1] === "]"
        ) {
          const mathContent = text.substring(currentIndex + 2, mathEnd);
          parts.push({ type: "display", content: mathContent });
          currentIndex = mathEnd + 2;
          break;
        }
        mathEnd++;
      }

      if (mathEnd >= text.length) {
        // No closing found, treat as regular text
        buffer += text[currentIndex];
        currentIndex++;
      }
    } else {
      buffer += text[currentIndex];
      currentIndex++;
    }
  }

  // Add any remaining buffer
  if (buffer.trim()) {
    parts.push(buffer);
  }

  // If no math found, return plain text
  if (parts.length === 0 || (parts.length === 1 && typeof parts[0] === "string")) {
    return <span className={className}>{text}</span>;
  }

  // Render mixed content
  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (typeof part === "string") {
          return <span key={index}>{part}</span>;
        } else if (part.type === "inline") {
          try {
            return <InlineMath key={index} math={part.content} />;
          } catch (error) {
            // If KaTeX fails to parse, show the raw LaTeX
            console.warn("KaTeX parse error:", error);
            return <span key={index}>{`\\(${part.content}\\)`}</span>;
          }
        } else {
          try {
            return <BlockMath key={index} math={part.content} />;
          } catch (error) {
            // If KaTeX fails to parse, show the raw LaTeX
            console.warn("KaTeX parse error:", error);
            return <span key={index}>{`\\[${part.content}\\]`}</span>;
          }
        }
      })}
    </span>
  );
}
