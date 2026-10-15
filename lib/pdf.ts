/**
 * Extracts plain text from a PDF file using pdfjs-dist entirely in the client browser.
 */
export async function extractPdfText(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfjs = await import('pdfjs-dist');

    // Configure the worker source from standard CDN matching pdfjs version
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version || '4.10.38'}/build/pdf.worker.min.mjs`;
    }

    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(arrayBuffer),
      useSystemFonts: true,
    });

    const pdf = await loadingTask.promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageTokens: string[] = [];

      for (const item of textContent.items) {
        if ('str' in item && typeof item.str === 'string') {
          pageTokens.push(item.str);
        }
      }

      const pageText = pageTokens.join(' ').replace(/\s+/g, ' ').trim();
      fullText += `--- Page ${i} of ${pdf.numPages} ---\n${pageText}\n\n`;
    }

    if (!fullText.trim()) {
      return `[PDF file "${file.name}" contained no extractable text or is a scanned image.]`;
    }

    return fullText.trim();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn('PDF text extraction error:', message);
    throw new Error(`Failed to extract text from "${file.name}": ${message}`);
  }
}
