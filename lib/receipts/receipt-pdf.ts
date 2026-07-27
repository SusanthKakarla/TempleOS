import PDFDocument from "pdfkit";

const PAGE_MARGIN = 50;

export interface ReceiptPdfData {
  templeName: string;
  templeAddress: string | null;
  receiptNumber: string;
  transactionId: string;
  campaignTitle: string | null;
  amount: number;
  currency: string;
  date: string;
  paymentMethod: string;
  donorName: string;
  donorPhone: string | null;
  donorEmail: string | null;
}

/**
 * A single-page portrait donation receipt. Separate layout from
 * lib/export/pdf.ts's landscape tabular exports (different document shape
 * entirely) but the same library and buffering approach (collect chunks,
 * resolve on 'end').
 */
export function buildReceiptPdfBuffer(data: ReceiptPdfData): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: PAGE_MARGIN, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(18).font("Helvetica-Bold").text(data.templeName, { align: "center" });
    if (data.templeAddress) {
      doc.fontSize(10).font("Helvetica").fillColor("#666666").text(data.templeAddress, { align: "center" });
    }
    doc.moveDown(1.5);

    doc.fillColor("#000000").fontSize(14).font("Helvetica-Bold").text("Donation Receipt", { align: "center" });
    doc.moveDown(1.5);

    doc
      .moveTo(PAGE_MARGIN, doc.y)
      .lineTo(doc.page.width - PAGE_MARGIN, doc.y)
      .stroke("#cccccc");
    doc.moveDown(1);

    const row = (label: string, value: string) => {
      doc.fontSize(10).font("Helvetica-Bold").text(label, { continued: true, width: 180 });
      doc.font("Helvetica").text(value);
      doc.moveDown(0.5);
    };

    row("Receipt Number:", data.receiptNumber);
    row("Transaction ID:", data.transactionId);
    row("Date:", data.date);
    row("Donor Name:", data.donorName);
    if (data.donorPhone) row("Donor Phone:", data.donorPhone);
    if (data.donorEmail) row("Donor Email:", data.donorEmail);
    if (data.campaignTitle) row("Campaign:", data.campaignTitle);
    row("Payment Method:", data.paymentMethod);

    doc.moveDown(1);
    doc
      .moveTo(PAGE_MARGIN, doc.y)
      .lineTo(doc.page.width - PAGE_MARGIN, doc.y)
      .stroke("#cccccc");
    doc.moveDown(1);

    doc.fontSize(16).font("Helvetica-Bold").text(`Amount: ${data.currency} ${data.amount.toFixed(2)}`);
    doc.moveDown(2);

    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor("#666666")
      .text("This is a system-generated receipt and does not require a signature.", { align: "center" });

    doc.end();
  });
}
