import { useState, useEffect } from 'react';

export function useTextSelection() {
  const [selection, setSelection] = useState(null);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleMouseUp = () => {
      // Clear previous timer if user clicks again quickly
      clearTimeout(timeoutId);

      timeoutId = setTimeout(() => {
        const sel = window.getSelection();
        const selectedText = sel?.toString().trim();

        if (selectedText && selectedText.length > 5) {
          const range = sel?.getRangeAt(0);
          const rect = range?.getBoundingClientRect();
          
          if (rect) {
            setSelection({
              text: selectedText,
              x: rect.left + window.scrollX,
              y: rect.top + window.scrollY - 40
            });
          }
        } else {
          setSelection(null);
        }
      }, 500); // 500ms delay matches your error limit
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      clearTimeout(timeoutId);
    };
  }, []);

  return { selection, setSelection };
}