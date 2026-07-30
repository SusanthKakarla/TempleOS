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

/** Every piece of static wrapper text on the receipt — kept separate from ReceiptPdfData so the caller decides which language to render in, without this module needing to know about next-intl/locales itself. */
export interface ReceiptPdfLabels {
  documentTitle: string;
  receiptNumber: string;
  dateTime: string;
  transactionId: string;
  razorpayPaymentId: string;
  donorName: string;
  donorPhone: string;
  donorEmail: string;
  donorPan: string;
  campaign: string;
  paymentMethod: string;
  currency: string;
  amountLabel: string;
  /** `{templeName}` is replaced with the actual temple name. */
  thankYou: string;
  footer: string;
}

/** The behavior this module has always had — used verbatim by the existing donor-facing pipeline (lib/receipts/receipt-service.ts), which doesn't yet vary receipt language by donor. */
export const ENGLISH_RECEIPT_LABELS: ReceiptPdfLabels = {
  documentTitle: "Donation Receipt",
  receiptNumber: "Receipt Number:",
  dateTime: "Date & Time:",
  transactionId: "Transaction ID:",
  razorpayPaymentId: "Razorpay Payment ID:",
  donorName: "Donor Name:",
  donorPhone: "Donor Phone:",
  donorEmail: "Donor Email:",
  donorPan: "Donor PAN:",
  campaign: "Campaign:",
  paymentMethod: "Payment Method:",
  currency: "Currency:",
  amountLabel: "Amount",
  thankYou: "Thank you for your generous contribution to {templeName}.",
  footer: "This is a system-generated receipt and does not require a signature.",
};

/**
 * A single-page portrait donation receipt. Separate layout from
 * lib/export/pdf.ts's landscape tabular exports (different document shape
 * entirely) but the same library and buffering approach (collect chunks,
 * resolve on 'end').
 */
export function buildReceiptPdfBuffer(data: ReceiptPdfData, labels: ReceiptPdfLabels): Promise<Uint8Array> {
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

    doc.fillColor("#000000").fontSize(14).font("Helvetica-Bold").text(labels.documentTitle, { align: "center" });
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

    row(labels.receiptNumber, data.receiptNumber);
    row(labels.dateTime, data.date);
    row(labels.transactionId, data.transactionId);
    if (data.providerPaymentId) row(labels.razorpayPaymentId, data.providerPaymentId);
    row(labels.donorName, data.donorName);
    if (data.donorPhone) row(labels.donorPhone, data.donorPhone);
    if (data.donorEmail) row(labels.donorEmail, data.donorEmail);
    if (data.donorPan) row(labels.donorPan, data.donorPan);
    if (data.campaignTitle) row(labels.campaign, data.campaignTitle);
    row(labels.paymentMethod, data.paymentMethod);
    row(labels.currency, data.currency);

    doc.moveDown(1);
    doc
      .moveTo(PAGE_MARGIN, doc.y)
      .lineTo(doc.page.width - PAGE_MARGIN, doc.y)
      .stroke("#cccccc");
    doc.moveDown(1);

    doc.fontSize(16).font("Helvetica-Bold").text(`${labels.amountLabel}: ${data.currency} ${data.amount.toFixed(2)}`);
    doc.moveDown(1.5);

    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .fillColor("#000000")
      .text(labels.thankYou.replace("{templeName}", data.templeName), { align: "center" });
    doc.moveDown(1);

    doc.fontSize(9).font("Helvetica").fillColor("#666666").text(labels.footer, { align: "center" });

    doc.end();
  });
}
