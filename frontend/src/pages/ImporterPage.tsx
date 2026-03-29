import { useRef, useState } from "react";
import "./ImporterPage.css";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ImportRowResult {
  row: number;
  success: boolean;
  error?: string;
  id?: string;
}

interface ImportResult {
  total: number;
  imported: number;
  failed: number;
  rows: ImportRowResult[];
}

interface ParsedRow {
  rowNumber: number;
  date: string;
  description: string;
  amount: string;
  type: string;
  category: string;
  account: string;
  from_account: string;
  to_account: string;
  notes: string;
  isValid: boolean;
  errors: string[];
}

type ImportPhase =
  | "idle"
  | "file-selected"
  | "parsing"
  | "previewing"
  | "importing"
  | "done"
  | "error";

// ── CSV Template ──────────────────────────────────────────────────────────────

function downloadTemplate(): void {
  const header =
    "date,description,amount,type,account,category,from_account,to_account,notes";
  const rows = [
    "2024-01-15,Grocery Shopping,85.50,purchase,Main Checking,Food & Dining,,,Weekly groceries",
    "2024-01-16,Monthly Salary,3500.00,earning,Main Checking,Salary,,,January salary",
    "2024-01-17,Savings Transfer,500.00,transfer,,,Main Checking,Savings,Monthly savings",
    "2024-01-18,Netflix Subscription,15.99,purchase,Main Checking,Entertainment,,,Monthly subscription",
    "2024-01-19,Freelance Payment,1200.00,earning,Main Checking,Freelance,,,Project X",
  ];
  const csvContent = [header, ...rows].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "geode-import-template.csv";
  link.click();
  URL.revokeObjectURL(url);
}

// ── CSV Parser ────────────────────────────────────────────────────────────────

/**
 * Parse a single CSV line, handling quoted fields.
 * Handles: "field with, comma", "field with ""quotes""", plain field
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        // Check for escaped quote ("")
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        current += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ",") {
        fields.push(current.trim());
        current = "";
        i++;
      } else {
        current += ch;
        i++;
      }
    }
  }

  fields.push(current.trim());
  return fields;
}

function validateRow(
  row: Omit<ParsedRow, "isValid" | "errors" | "rowNumber">,
): string[] {
  const errors: string[] = [];

  // date: must match YYYY-MM-DD
  if (!row.date) {
    errors.push("date is required");
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date)) {
    errors.push(`date "${row.date}" must be in YYYY-MM-DD format`);
  } else {
    // Validate it's a real calendar date
    const d = new Date(row.date + "T00:00:00");
    if (isNaN(d.getTime())) {
      errors.push(`date "${row.date}" is not a valid calendar date`);
    }
  }

  // amount: must be a positive number
  if (!row.amount) {
    errors.push("amount is required");
  } else {
    const amt = parseFloat(row.amount);
    if (isNaN(amt) || amt <= 0) {
      errors.push(`amount "${row.amount}" must be a positive number`);
    }
  }

  // type: must be purchase, earning, or transfer
  const normalizedType = row.type.toLowerCase().trim();
  if (!row.type) {
    errors.push("type is required");
  } else if (!["purchase", "earning", "transfer"].includes(normalizedType)) {
    errors.push(
      `type "${row.type}" must be "purchase", "earning", or "transfer"`,
    );
  } else {
    // Type-specific validation
    if (normalizedType === "purchase" || normalizedType === "earning") {
      if (!row.account) {
        errors.push(`account is required for ${normalizedType} transactions`);
      }
      if (!row.category) {
        errors.push(`category is required for ${normalizedType} transactions`);
      }
    } else if (normalizedType === "transfer") {
      if (!row.from_account) {
        errors.push("from_account is required for transfer transactions");
      }
      if (!row.to_account) {
        errors.push("to_account is required for transfer transactions");
      }
      if (
        row.from_account &&
        row.to_account &&
        row.from_account.toLowerCase() === row.to_account.toLowerCase()
      ) {
        errors.push("from_account and to_account cannot be the same");
      }
    }
  }

  return errors;
}

function parseCsv(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length === 0) return [];

  // First line is the header
  const headerLine = lines[0];
  const headers = parseCsvLine(headerLine).map((h) => h.toLowerCase().trim());

  const getField = (fields: string[], name: string): string => {
    const idx = headers.indexOf(name);
    if (idx === -1 || idx >= fields.length) return "";
    return fields[idx].trim();
  };

  const rows: ParsedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const fields = parseCsvLine(line);

    // Skip entirely blank rows
    if (fields.every((f) => f === "")) continue;

    const rowData = {
      date: getField(fields, "date"),
      description: getField(fields, "description"),
      amount: getField(fields, "amount"),
      type: getField(fields, "type"),
      category: getField(fields, "category"),
      account: getField(fields, "account"),
      from_account: getField(fields, "from_account"),
      to_account: getField(fields, "to_account"),
      notes: getField(fields, "notes"),
    };

    const errors = validateRow(rowData);

    rows.push({
      rowNumber: i + 1, // 1-based, +1 for header row
      ...rowData,
      isValid: errors.length === 0,
      errors,
    });
  }

  return rows;
}

// ── API Base URL ──────────────────────────────────────────────────────────────

const API_BASE_URL = "/api";

// ── Component ─────────────────────────────────────────────────────────────────

export function ImporterPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<ImportPhase>("idle");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // ── Derived counts ──────────────────────────────────────────────────────────
  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.filter((r) => !r.isValid).length;

  // ── File handling ───────────────────────────────────────────────────────────

  function handleFileAccepted(file: File): void {
    setFileError(null);

    // Validate extension
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setFileError("Only .csv files are accepted. Please select a CSV file.");
      return;
    }

    setSelectedFile(file);
    setPhase("file-selected");
    setParsedRows([]);
    setImportResult(null);
    setImportError(null);
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (file) handleFileAccepted(file);
    // Reset input so the same file can be re-selected
    e.target.value = "";
  }

  function handleDropZoneClick(): void {
    fileInputRef.current?.click();
  }

  function handleDropZoneKeyDown(e: React.KeyboardEvent<HTMLDivElement>): void {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>): void {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>): void {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>): void {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (file) handleFileAccepted(file);
  }

  // ── Parse CSV ───────────────────────────────────────────────────────────────

  function handleParseCSV(): void {
    if (!selectedFile) return;

    setPhase("parsing");
    setFileError(null);

    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text !== "string") {
        setFileError("Failed to read file contents.");
        setPhase("file-selected");
        return;
      }

      try {
        const rows = parseCsv(text);
        if (rows.length === 0) {
          setFileError(
            "The CSV file contains no data rows (only a header or is empty).",
          );
          setPhase("file-selected");
          return;
        }
        setParsedRows(rows);
        setPhase("previewing");
      } catch {
        setFileError("Failed to parse CSV file. Please check the file format.");
        setPhase("file-selected");
      }
    };

    reader.onerror = () => {
      setFileError("Failed to read the file. Please try again.");
      setPhase("file-selected");
    };

    reader.readAsText(selectedFile, "utf-8");
  }

  // ── Import ──────────────────────────────────────────────────────────────────

  async function handleImport(): Promise<void> {
    if (!selectedFile || validCount === 0) return;

    setPhase("importing");
    setImportError(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch(`${API_BASE_URL}/transactions/import`, {
        method: "POST",
        body: formData,
        // Do NOT set Content-Type — browser sets it with boundary automatically
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({
          error: `HTTP ${response.status}`,
        }));
        throw new Error(
          (errBody as { error?: string }).error ?? `HTTP ${response.status}`,
        );
      }

      const result: ImportResult = await response.json();
      setImportResult(result);
      setPhase("done");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setImportError(message);
      setPhase("previewing");
    }
  }

  // ── Reset ───────────────────────────────────────────────────────────────────

  function handleReset(): void {
    setPhase("idle");
    setSelectedFile(null);
    setParsedRows([]);
    setImportResult(null);
    setImportError(null);
    setFileError(null);
    setIsDragOver(false);
  }

  // ── Drop zone class ─────────────────────────────────────────────────────────

  function dropZoneClass(): string {
    const classes = ["drop-zone"];
    if (isDragOver) classes.push("drag-over");
    if (selectedFile && phase !== "idle") classes.push("has-file");
    return classes.join(" ");
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="importer-page">
      {/* ── Header ── */}
      <div className="importer-header">
        <div className="importer-header-text">
          <h1 className="importer-title">📥 Import Transactions</h1>
          <p className="importer-subtitle">
            Import transactions from a CSV file. Download the template, fill it
            in, then upload and review before importing.
          </p>
        </div>
      </div>

      {/* ── Step 1: Download Template ── */}
      <div className="importer-card">
        <h2 className="importer-step-title">Step 1: Download Template</h2>
        <p className="importer-step-desc">
          Download the CSV template and fill it with your transactions. The
          template includes example rows showing the expected format.
        </p>
        <div className="importer-template-info">
          <div className="template-columns">
            <span className="template-col-label">Required columns:</span>
            <code className="template-col-list">
              date, amount, type, account/category (or from_account/to_account
              for transfers)
            </code>
          </div>
          <div className="template-columns">
            <span className="template-col-label">Optional columns:</span>
            <code className="template-col-list">description, notes</code>
          </div>
          <div className="template-columns">
            <span className="template-col-label">Transaction types:</span>
            <code className="template-col-list">
              purchase, earning, transfer
            </code>
          </div>
        </div>
        <button
          type="button"
          className="download-btn"
          onClick={downloadTemplate}
        >
          ⬇ Download Template
        </button>
      </div>

      {/* ── Step 2: Upload CSV ── */}
      <div className="importer-card">
        <h2 className="importer-step-title">Step 2: Upload Your CSV</h2>
        <p className="importer-step-desc">
          Drag and drop your CSV file below, or click to browse. Only{" "}
          <code>.csv</code> files are accepted.
        </p>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          style={{ display: "none" }}
          onChange={handleFileInputChange}
          aria-hidden="true"
          tabIndex={-1}
        />

        {/* Drop zone */}
        <div
          className={dropZoneClass()}
          onClick={handleDropZoneClick}
          onKeyDown={handleDropZoneKeyDown}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
          aria-label="Drop CSV file here or click to browse"
        >
          {selectedFile && phase !== "idle" ? (
            <div className="drop-zone-file-info">
              <span className="drop-zone-file-icon" aria-hidden="true">
                📄
              </span>
              <span className="drop-zone-file-name">{selectedFile.name}</span>
              <span className="drop-zone-file-size">
                ({(selectedFile.size / 1024).toFixed(1)} KB)
              </span>
              <span className="drop-zone-change-hint">
                Click or drop to replace
              </span>
            </div>
          ) : (
            <div className="drop-zone-empty">
              <span className="drop-zone-icon" aria-hidden="true">
                📂
              </span>
              <span className="drop-zone-primary-text">
                Drag &amp; drop your CSV file here, or click to browse
              </span>
              <span className="drop-zone-secondary-text">
                Supports .csv files up to 10 MB
              </span>
            </div>
          )}
        </div>

        {/* File error */}
        {fileError && (
          <div className="importer-error-banner" role="alert">
            ⚠ {fileError}
          </div>
        )}

        {/* Parse button */}
        <div className="importer-actions">
          <button
            type="button"
            className="parse-btn"
            onClick={handleParseCSV}
            disabled={
              !selectedFile ||
              phase === "parsing" ||
              phase === "importing" ||
              phase === "done"
            }
          >
            {phase === "parsing" ? "Parsing…" : "Parse CSV"}
          </button>
        </div>
      </div>

      {/* ── Step 3: Preview & Import ── */}
      {(phase === "previewing" ||
        phase === "importing" ||
        phase === "done") && (
        <div className="importer-card">
          <h2 className="importer-step-title">Step 3: Review &amp; Import</h2>

          {/* Summary bar */}
          <div className="import-summary">
            <span className="import-summary-total">
              {parsedRows.length} rows parsed
            </span>
            <span className="import-summary-valid">✅ {validCount} valid</span>
            {invalidCount > 0 && (
              <span className="import-summary-invalid">
                ❌ {invalidCount} with errors
              </span>
            )}
          </div>

          {/* Import error banner */}
          {importError && (
            <div className="importer-error-banner" role="alert">
              ⚠ Import failed: {importError}
            </div>
          )}

          {/* Preview table */}
          <div className="preview-table-wrapper">
            <table className="preview-table" aria-label="CSV preview">
              <caption className="sr-only">
                Parsed CSV rows — {validCount} valid, {invalidCount} with errors
              </caption>
              <thead>
                <tr>
                  <th scope="col" className="preview-th preview-th--row">
                    Row
                  </th>
                  <th scope="col" className="preview-th preview-th--status">
                    Status
                  </th>
                  <th scope="col" className="preview-th">
                    Date
                  </th>
                  <th scope="col" className="preview-th">
                    Description
                  </th>
                  <th scope="col" className="preview-th preview-th--amount">
                    Amount
                  </th>
                  <th scope="col" className="preview-th">
                    Type
                  </th>
                  <th scope="col" className="preview-th">
                    Category
                  </th>
                  <th scope="col" className="preview-th">
                    Account
                  </th>
                  <th scope="col" className="preview-th">
                    From Account
                  </th>
                  <th scope="col" className="preview-th">
                    To Account
                  </th>
                  <th scope="col" className="preview-th">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody>
                {parsedRows.map((row) => (
                  <tr
                    key={row.rowNumber}
                    className={
                      row.isValid ? "preview-row" : "preview-row row-invalid"
                    }
                  >
                    <td className="preview-td preview-td--row">
                      {row.rowNumber}
                    </td>
                    <td className="preview-td preview-td--status">
                      {row.isValid ? (
                        <span
                          className="status-valid"
                          title="Valid row"
                          aria-label="Valid"
                        >
                          ✅
                        </span>
                      ) : (
                        <span
                          className="status-invalid"
                          title={row.errors.join("; ")}
                          aria-label={`Invalid: ${row.errors.join("; ")}`}
                        >
                          ❌
                        </span>
                      )}
                    </td>
                    <td className="preview-td preview-td--date">{row.date}</td>
                    <td className="preview-td preview-td--desc">
                      {row.description || (
                        <span className="preview-empty">—</span>
                      )}
                    </td>
                    <td className="preview-td preview-td--amount">
                      {row.amount}
                    </td>
                    <td className="preview-td">
                      {row.type ? (
                        <span
                          className={`type-badge type-badge--${row.type.toLowerCase()}`}
                        >
                          {row.type}
                        </span>
                      ) : (
                        <span className="preview-empty">—</span>
                      )}
                    </td>
                    <td className="preview-td">
                      {row.category || <span className="preview-empty">—</span>}
                    </td>
                    <td className="preview-td">
                      {row.account || <span className="preview-empty">—</span>}
                    </td>
                    <td className="preview-td">
                      {row.from_account || (
                        <span className="preview-empty">—</span>
                      )}
                    </td>
                    <td className="preview-td">
                      {row.to_account || (
                        <span className="preview-empty">—</span>
                      )}
                    </td>
                    <td className="preview-td">
                      {row.notes || <span className="preview-empty">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Inline error messages for invalid rows */}
          {invalidCount > 0 && (
            <div className="preview-errors-list">
              <h3 className="preview-errors-title">Validation Errors</h3>
              {parsedRows
                .filter((r) => !r.isValid)
                .map((row) => (
                  <div key={row.rowNumber} className="preview-error-item">
                    <span className="preview-error-row">
                      Row {row.rowNumber}:
                    </span>
                    <ul className="preview-error-messages">
                      {row.errors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                ))}
            </div>
          )}

          {/* Import action */}
          {phase !== "done" && (
            <div className="importer-actions">
              <button
                type="button"
                className="import-btn"
                onClick={handleImport}
                disabled={validCount === 0 || phase === "importing"}
              >
                {phase === "importing"
                  ? "Importing…"
                  : `Import ${validCount} transaction${validCount !== 1 ? "s" : ""}`}
              </button>
              {validCount === 0 && (
                <p className="import-btn-hint">
                  Fix all validation errors before importing.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Step 4: Results ── */}
      {phase === "done" && importResult && (
        <div className="importer-card results-section">
          <h2 className="importer-step-title">Import Complete</h2>

          <div className="results-summary">
            <div className="results-summary-stat results-summary-stat--imported">
              <span className="results-stat-value">
                {importResult.imported}
              </span>
              <span className="results-stat-label">Imported</span>
            </div>
            <div className="results-summary-stat results-summary-stat--failed">
              <span className="results-stat-value">{importResult.failed}</span>
              <span className="results-stat-label">Failed</span>
            </div>
            <div className="results-summary-stat results-summary-stat--total">
              <span className="results-stat-value">{importResult.total}</span>
              <span className="results-stat-label">Total</span>
            </div>
          </div>

          <p className="results-headline">
            Successfully imported <strong>{importResult.imported}</strong> of{" "}
            <strong>{importResult.total}</strong> transactions.
            {importResult.failed > 0 && (
              <> {importResult.failed} row(s) failed — see details below.</>
            )}
          </p>

          {/* Per-row results table */}
          {importResult.rows.length > 0 && (
            <div className="results-table-wrapper">
              <table className="results-table" aria-label="Import results">
                <thead>
                  <tr>
                    <th scope="col" className="results-th">
                      Row
                    </th>
                    <th scope="col" className="results-th">
                      Status
                    </th>
                    <th scope="col" className="results-th">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {importResult.rows.map((r) => (
                    <tr
                      key={r.row}
                      className={
                        r.success
                          ? "results-row results-row--success"
                          : "results-row results-row--failed"
                      }
                    >
                      <td className="results-td">{r.row}</td>
                      <td className="results-td">
                        {r.success ? (
                          <span className="status-valid">✅ Imported</span>
                        ) : (
                          <span className="status-invalid">❌ Failed</span>
                        )}
                      </td>
                      <td className="results-td">
                        {r.success ? (
                          <span className="results-id">ID: {r.id}</span>
                        ) : (
                          <span className="results-error">{r.error}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="importer-actions">
            <button type="button" className="reset-btn" onClick={handleReset}>
              Import Another File
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
