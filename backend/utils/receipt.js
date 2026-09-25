const PDFDocument = require("pdfkit");
const { uploadToBucket } = require("./storage.js");

// Builds the receipt PDF fully in memory (no local file write), then uploads
// it to the private `receipts` bucket. Returns the storage PATH — sign it
// with getSignedUrl() when returning it to the payer/owner.
const generateReceipt = ({ title, lines }) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A5", margin: 40 });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", async () => {
      try {
        const buffer = Buffer.concat(chunks);
        const path = `receipt-${Date.now()}.pdf`;
        const { path: storedPath } = await uploadToBucket("receipts", path, buffer, "application/pdf");
        resolve(storedPath);
      } catch (err) {
        reject(err);
      }
    });
    doc.on("error", reject);

    doc.fontSize(16).text(title, { underline: true });
    doc.moveDown();
    doc.fontSize(11);
    for (const line of lines) {
      doc.text(line);
    }
    doc.end();
  });

module.exports = { generateReceipt };