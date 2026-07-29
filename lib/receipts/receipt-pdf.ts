import PDFDocument from "pdfkit";

const PAGE_MARGIN = 50;

export interface ReceiptPdfData {
  templeName: string;
  templeAddress: string | null;
  receiptNumber: string;
  transactionId: string;
  /** Razorpay's own payment id (e.g. "pay_..."), distinct from TempleOS's internal transactionId — shown separately so the temple/donor can reconcile against the Razorpay dashboard directly. */
  providerPaymentId: string | null;
  campaignTitle: string | null;
  amount: number;
  currency: string;
  date: string;
  paymentMethod: string;
  donorName: string;
  donorPhone: string | null;
  donorEmail: string | null;
  donorPan: string | null;
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
    row("Date & Time:", data.date);
    row("Transaction ID:", data.transactionId);
    if (data.providerPaymentId) row("Razorpay Payment ID:", data.providerPaymentId);
    row("Donor Name:", data.donorName);
    if (data.donorPhone) row("Donor Phone:", data.donorPhone);
    if (data.donorEmail) row("Donor Email:", data.donorEmail);
    if (data.donorPan) row("Donor PAN:", data.donorPan);
    if (data.campaignTitle) row("Campaign:", data.campaignTitle);
    row("Payment Method:", data.paymentMethod);
    row("Currency:", data.currency);

    doc.moveDown(1);
    doc
      .moveTo(PAGE_MARGIN, doc.y)
      .lineTo(doc.page.width - PAGE_MARGIN, doc.y)
      .stroke("#cccccc");
    doc.moveDown(1);

    doc.fontSize(16).font("Helvetica-Bold").text(`Amount: ${data.currency} ${data.amount.toFixed(2)}`);
    doc.moveDown(1.5);

    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .fillColor("#000000")
      .text(`Thank you for your generous contribution to ${data.templeName}.`, { align: "center" });
    doc.moveDown(1);

    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor("#666666")
      .text("This is a system-generated receipt and does not require a signature.", { align: "center" });

    doc.end();
  });
}
