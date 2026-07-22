"use client";

import { amountInWords } from "@/lib/receipt";

interface Receipt {
  receiptNo: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  vehicleLabel: string;
  vehicleDetails: string | null;
  vin: string | null;
  priceGhs: number;
  amountPaidGhs: number;
  balanceGhs: number;
  paymentMethod: string | null;
  paymentRef: string | null;
  notes: string | null;
  status: "issued" | "void";
  issuedBy: string | null;
  issuedAt: string;
}

const cedis = (n: number) => `GHS ${n.toLocaleString("en-GH")}`;

/**
 * The printed receipt. Deliberately plain black-on-white with its own type
 * scale — the dashboard's dark theme and brand colours do not survive a
 * printer, and this is a document a customer keeps.
 */
export function ReceiptDocument({
  receipt,
  dealerName,
  dealerPhone,
  dealerPhoneAlt,
}: {
  receipt: Receipt;
  dealerName: string;
  dealerPhone: string;
  dealerPhoneAlt?: string;
}) {
  const issued = new Date(receipt.issuedAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div
      id="receipt-print"
      className="hidden bg-white p-10 font-sans text-[13px] leading-relaxed text-black print:block"
    >
      <div className="flex items-start justify-between border-b-2 border-black pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{dealerName}</h1>
          <p className="mt-1 text-[12px]">
            {dealerPhone}
            {dealerPhoneAlt ? ` · ${dealerPhoneAlt}` : ""}
          </p>
          <p className="text-[12px]">eclipsemotors.org</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold uppercase tracking-[0.15em]">
            Receipt
          </p>
          <p className="mt-1 font-mono text-[13px]">{receipt.receiptNo}</p>
          <p className="text-[12px]">{issued}</p>
          {receipt.status === "void" && (
            <p className="mt-1 text-[13px] font-bold uppercase">** Void **</p>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-8">
        <section>
          <h2 className="text-[11px] font-bold uppercase tracking-[0.12em]">
            Received from
          </h2>
          <p className="mt-1.5 font-semibold">{receipt.customerName}</p>
          {receipt.customerPhone && <p>{receipt.customerPhone}</p>}
          {receipt.customerEmail && <p>{receipt.customerEmail}</p>}
        </section>
        <section>
          <h2 className="text-[11px] font-bold uppercase tracking-[0.12em]">
            Vehicle
          </h2>
          <p className="mt-1.5 font-semibold">{receipt.vehicleLabel}</p>
          {receipt.vehicleDetails && <p>{receipt.vehicleDetails}</p>}
          {receipt.vin && <p>VIN: {receipt.vin}</p>}
        </section>
      </div>

      <table className="mt-7 w-full border-collapse text-[13px]">
        <tbody>
          <Row label="Agreed vehicle price" value={cedis(receipt.priceGhs)} />
          <Row
            label="Amount received"
            value={cedis(receipt.amountPaidGhs)}
            bold
          />
          <Row
            label="Balance outstanding"
            value={cedis(receipt.balanceGhs)}
            bold={receipt.balanceGhs > 0}
          />
        </tbody>
      </table>

      <p className="mt-4 border-y border-black py-2.5">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em]">
          Amount in words:{" "}
        </span>
        {amountInWords(receipt.amountPaidGhs)}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-8">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-[0.12em]">
            Payment method
          </span>
          <p>{receipt.paymentMethod || "—"}</p>
        </div>
        <div>
          <span className="text-[11px] font-bold uppercase tracking-[0.12em]">
            Payment reference
          </span>
          <p>{receipt.paymentRef || "—"}</p>
        </div>
      </div>

      {receipt.notes && (
        <div className="mt-5">
          <span className="text-[11px] font-bold uppercase tracking-[0.12em]">
            Notes
          </span>
          <p className="whitespace-pre-line">{receipt.notes}</p>
        </div>
      )}

      <div className="mt-14 grid grid-cols-2 gap-12">
        <div>
          <div className="border-t border-black pt-1.5 text-[12px]">
            For and on behalf of {dealerName}
            {receipt.issuedBy && (
              <span className="block">Issued by {receipt.issuedBy}</span>
            )}
          </div>
        </div>
        <div>
          <div className="border-t border-black pt-1.5 text-[12px]">
            Customer signature
          </div>
        </div>
      </div>

      <p className="mt-8 text-center text-[11px]">
        {receipt.balanceGhs > 0
          ? "This receipt acknowledges a part payment. The balance above remains outstanding."
          : "This receipt acknowledges payment in full for the vehicle described above."}{" "}
        Quoted prices are landed in Ghana and exclude import duty unless stated.
      </p>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <tr className="border-b border-black/25">
      <td className="py-2">{label}</td>
      <td className={`py-2 text-right ${bold ? "font-bold" : ""}`}>{value}</td>
    </tr>
  );
}
