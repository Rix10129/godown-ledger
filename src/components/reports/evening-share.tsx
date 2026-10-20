"use client";
import { useState } from "react";
import { Download, FileSpreadsheet, MessageCircle, Share2 } from "lucide-react";
const MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
export function EveningShare({
  text,
  date,
  companyName,
}: {
  text: string;
  date: string;
  companyName: string;
}) {
  const [file, setFile] = useState<File>(),
    [preparing, setPreparing] = useState(false),
    [error, setError] = useState(""),
    [native, setNative] = useState(false),
    [shared, setShared] = useState(false);
  const url = `/api/reports/evening/export?date=${encodeURIComponent(date)}`;
  async function prepare() {
    setPreparing(true);
    setError("");
    setShared(false);
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok)
        throw new Error(
          response.status === 409
            ? "The business date changed. Refresh this page and try again."
            : "Could not prepare the Excel file. Check your connection and try again.",
        );
      const name =
        response.headers
          .get("content-disposition")
          ?.match(/filename="([^"]+)"/)?.[1] ?? `evening-${date}.xlsx`;
      const value = new File([await response.blob()], name, { type: MIME });
      setFile(value);
      setNative(
        typeof navigator.share === "function" &&
          typeof navigator.canShare === "function" &&
          navigator.canShare({ files: [value] }),
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not prepare the Excel file.",
      );
    } finally {
      setPreparing(false);
    }
  }
  function download() {
    if (!file) return;
    const objectUrl = URL.createObjectURL(file),
      link = document.createElement("a");
    link.href = objectUrl;
    link.download = file.name;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
  }
  async function share() {
    if (!file) return;
    try {
      await navigator.share({
        files: [file],
        title: `${companyName} · ${date}`,
        text: `${companyName} — evening report ${date}. Excel workbook attached.`,
      });
      setShared(true);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setNative(false);
      setError(
        "File sharing is unavailable here. Download the Excel file and attach it in WhatsApp as a document.",
      );
    }
  }
  return (
    <section className="office-panel">
      <div className="office-panel-head">
        <h2>Share the evening report</h2>
        <FileSpreadsheet className="h-5 w-5 text-blue-600" aria-hidden="true" />
      </div>
      <div className="office-panel-body space-y-4">
        <p className="office-note">
          The Excel workbook includes purchases, sales, recovery, mill payments,
          stock, returns and accounts. Figures come from the shared office book.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            className="office-button"
            onClick={prepare}
            disabled={preparing}
          >
            <FileSpreadsheet className="h-4 w-4" />
            {preparing
              ? "Preparing Excel…"
              : file
                ? "Prepare a fresh Excel copy"
                : "Prepare Excel for WhatsApp"}
          </button>
          <a className="office-button-quiet" href={url} download>
            <Download className="h-4 w-4" />
            Download Excel
          </a>
          <a
            className="office-button-quiet"
            href={`https://wa.me/?text=${encodeURIComponent(text)}`}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle className="h-4 w-4" />
            Share text on WhatsApp
          </a>
        </div>
        {file && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="break-words text-sm font-medium">{file.name}</p>
            <p className="office-note mt-1">
              {native
                ? "The file is ready. Open the share menu, choose WhatsApp, then choose the recipient."
                : "Download this file, open WhatsApp, choose the recipient, then use Attach → Document to select the downloaded Excel file."}
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              {native && (
                <button className="office-button" onClick={share}>
                  <Share2 className="h-4 w-4" />
                  Share Excel file
                </button>
              )}
              <button className="office-button-quiet" onClick={download}>
                <Download className="h-4 w-4" />
                Download prepared Excel
              </button>
              {!native && (
                <a
                  className="office-button-quiet"
                  href={`https://wa.me/?text=${encodeURIComponent(`${companyName} — evening report ${date}. I am attaching the Excel workbook.`)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open WhatsApp
                </a>
              )}
            </div>
            {shared && (
              <p role="status" className="office-note mt-3">
                Returned from the share menu. Confirm the file and press Send in
                WhatsApp.
              </p>
            )}
          </div>
        )}
        {error && (
          <p className="office-alert" role="alert">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
