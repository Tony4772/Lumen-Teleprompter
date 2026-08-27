import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker for browser environments
if (typeof window !== 'undefined' && 'Worker' in window) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
  } catch (e) {
    console.warn('PDF.js worker initialization fallback:', e);
  }
}

export interface ParsedDocument {
  title: string;
  content: string;
  fileType: 'txt' | 'md' | 'pdf' | 'docx' | 'other';
  wordCount: number;
}

/**
 * Extracts raw textual script content from TXT, MD, PDF, or DOCX files.
 */
export async function parseDocumentFile(file: File): Promise<ParsedDocument> {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const cleanTitle = file.name.replace(/\.[^/.]+$/, '');

  let extractedText = '';
  let fileType: ParsedDocument['fileType'] = 'other';

  try {
    if (extension === 'txt' || extension === 'text') {
      fileType = 'txt';
      extractedText = await file.text();
    } else if (extension === 'md' || extension === 'markdown') {
      fileType = 'md';
      extractedText = await file.text();
    } else if (extension === 'docx') {
      fileType = 'docx';
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      extractedText = result.value || '';
    } else if (extension === 'pdf') {
      fileType = 'pdf';
      const arrayBuffer = await file.arrayBuffer();
      
      // Load PDF document
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;
      const pagesText: string[] = [];

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Group items and join lines
        const pageText = textContent.items
          .map((item) => ('str' in item ? item.str : ''))
          .join(' ');
        
        if (pageText.trim()) {
          pagesText.push(pageText.trim());
        }
      }

      extractedText = pagesText.join('\n\n');
    } else {
      // Fallback to text reading
      extractedText = await file.text();
    }
  } catch (error) {
    console.error('Error parsing document file:', error);
    throw new Error(
      `No se pudo leer el archivo ${file.name}. Asegúrate de que no esté protegido por contraseña o dañado.`
    );
  }

  // Clean and normalize linebreaks & white-space for speech reading
  const cleanContent = extractedText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const words = cleanContent ? cleanContent.split(/\s+/).filter(Boolean).length : 0;

  return {
    title: cleanTitle,
    content: cleanContent,
    fileType,
    wordCount: words,
  };
}
