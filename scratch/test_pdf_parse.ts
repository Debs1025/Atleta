import PDFDocument from 'pdfkit';

async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  try {
    const pdfPkg = require('pdf-parse');
    if (pdfPkg.PDFParse) {
      const parser = new pdfPkg.PDFParse({ data: buffer });
      const res = await parser.getText();
      return res?.text || '';
    } else if (typeof pdfPkg === 'function') {
      const res = await pdfPkg(buffer);
      return res?.text || '';
    }
  } catch (err: any) {
    console.warn('⚠️ [PDF EXTRACTION] Direct text extraction skipped:', err.message);
  }
  return '';
}

async function testPdfOcr() {
  console.log('Testing PDF generation & pdf-parse extraction...');

  // 1. Create a dummy scoresheet PDF buffer with PDFKit
  const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(16).text('OFFICIAL SCORESHEET - BASKETBALL', 50, 50);
    doc.fontSize(12).text('Home: Celtics (105) vs Away: Hawks (98)', 50, 80);
    doc.text('Harold Green #7 - 28 pts, 10 ast, 5 reb', 50, 110);
    doc.text('Kobe Alvarez #24 - 30 pts, 4 ast, 7 reb', 50, 130);
    doc.end();
  });

  // 2. Parse with extractTextFromPdfBuffer
  const extractedText = await extractTextFromPdfBuffer(pdfBuffer);
  console.log('Extracted PDF Text:', extractedText.trim());

  if (!extractedText.includes('OFFICIAL SCORESHEET') || !extractedText.includes('Harold Green')) {
    throw new Error('PDF parsing failed to extract expected text!');
  }

  console.log('✅ PDF Parsing test passed successfully!\n');
}

testPdfOcr().catch(err => {
  console.error('❌ PDF Test error:', err);
  process.exit(1);
});
