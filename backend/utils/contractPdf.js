/**
 * ============================================================================
 * contractPdf.js
 * ============================================================================
 * Generates the lease agreement PDF for a contract.
 *
 * There is exactly ONE template below (buildContractPdfBuffer). Every
 * contract uses the same layout and the same boilerplate terms — only the
 * variables you pass in change: landlord name, tenant name, property
 * address, dates, rent, deposit, and the contract's own id/transaction
 * reference. That's what you asked for: "almost every pdf format will be
 * the same for every contract but just the name of the tenant and the
 * landlord and the date address like variable things will be changed."
 *
 * Requires the `pdfkit` package:
 *   npm install pdfkit
 *
 * Returns a Buffer — the caller uploads it to Supabase Storage (see
 * contractController.js) rather than this file touching storage directly,
 * so this module only ever has one job: lay out the PDF.
 * ============================================================================
 */

const PDFDocument = require("pdfkit");

function formatDate(input) {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return String(input);
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
}

/**
 * @param {Object} opts
 * @param {string} opts.landlordName
 * @param {string} opts.tenantName
 * @param {string} opts.propertyAddress
 * @param {number|string} opts.rate            monthly rent, BDT
 * @param {number|string} [opts.depositAmount]  security deposit, BDT
 * @param {string|Date} opts.startDate
 * @param {string|Date} opts.endDate
 * @param {number|string} opts.contractId
 * @param {string} [opts.termsAndConditions]    free text; falls back to default clauses below
 * @returns {Promise<Buffer>}
 */
function buildContractPdfBuffer(opts) {
  const {
    landlordName,
    tenantName,
    tenantEmail,
    propertyAddress,
    rate,
    depositAmount,
    startDate,
    endDate,
    contractId,
    termsAndConditions,
    durationLabel,
  } = opts;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 56 });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // ---------------------------- HEADER -----------------------------------
    doc.font("Helvetica-Bold").fontSize(20).text("RESIDENTIAL LEASE AGREEMENT", { align: "center" });
    doc.moveDown(0.3);
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#666666")
      .text(`APT RENT — Contract Reference #${contractId}`, { align: "center" });
    doc.moveDown(1.5);
    doc.fillColor("#000000");

    // ------------------------- INTRO PARAGRAPH ------------------------------
    doc
      .font("Helvetica")
      .fontSize(11)
      .text(
        `This Lease Agreement ("Agreement") is made and entered into on ${formatDate(new Date())}, by and between the Landlord and the Tenant named below, for the residential property described herein.`,
        { align: "left", lineGap: 3 }
      );
    doc.moveDown(1);

    // ----------------------------- PARTIES ----------------------------------
    const partyRow = (label, value) => {
      doc.font("Helvetica-Bold").fontSize(11).text(`${label}: `, { continued: true });
      doc.font("Helvetica").text(value);
    };

    partyRow("Landlord", landlordName || "—");
    partyRow("Tenant", tenantName || "—");
    if (tenantEmail) partyRow("Tenant Email", tenantEmail);
    partyRow("Property Address", propertyAddress || "—");
    doc.moveDown(1);

    // ------------------------------ TERMS ------------------------------------
    partyRow("Lease Term", `${formatDate(startDate)} to ${formatDate(endDate)}${durationLabel ? ` (${durationLabel})` : ""}`);
    partyRow("Monthly Rent", `BDT ${Number(rate || 0).toLocaleString("en-BD")}`);
    if (depositAmount != null) {
      partyRow("Security Deposit", `BDT ${Number(depositAmount).toLocaleString("en-BD")}`);
    }
    doc.moveDown(1.5);

    // ------------------------ TERMS & CONDITIONS -----------------------------
    doc.font("Helvetica-Bold").fontSize(12).text("Terms & Conditions");
    doc.moveDown(0.4);
    doc
      .font("Helvetica")
      .fontSize(10)
      .text(
        termsAndConditions && termsAndConditions.trim().length > 0
          ? termsAndConditions.replace(/৳\s?/g, "BDT ") // the built-in PDF font has no taka glyph
          : [
              "1. Rent is due on the 1st of each calendar month.",
              "2. The security deposit is refundable at the end of the tenancy, subject to the condition of the property.",
              "3. The Tenant shall not sublet the property without prior written consent of the Landlord.",
              "4. Either party may terminate this Agreement with 60 days' written notice.",
              "5. The Tenant is responsible for utility bills unless otherwise agreed in writing.",
              "6. The property shall be used strictly for residential purposes.",
            ].join("\n"),
        { align: "left", lineGap: 5 }
      );

    // --------------------------- SIGNATURE LINES ------------------------------
    doc.moveDown(4);
    const signatureY = doc.y;
    doc
      .font("Helvetica")
      .fontSize(11)
      .text("_____________________________", 56, signatureY)
      .text("_____________________________", 320, signatureY);
    doc
      .fontSize(9)
      .fillColor("#444444")
      .text("Landlord Signature", 56, signatureY + 16)
      .text("Tenant Signature", 320, signatureY + 16);

    // ---------------------------- FOOTER -------------------------------------
    doc
      .fontSize(8)
      .fillColor("#999999")
      .text(
        `Generated automatically by APT Rent on ${formatDate(new Date())}. This contract is legally binding once both parties sign.`,
        56,
        doc.page.height - 70,
        { align: "center", width: doc.page.width - 112 }
      );

    doc.end();
  });
}

module.exports = { buildContractPdfBuffer };