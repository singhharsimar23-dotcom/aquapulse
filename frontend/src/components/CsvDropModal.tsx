import React, { useState, useRef } from 'react';
import { useStore } from '../store/useStore';
import { parseAndValidateCsv, CsvFarmerRow } from '@aquapulse/core';
import { Exempt } from './Exempt';

export const CsvDropModal: React.FC = () => {
  const { isCsvModalOpen, setCsvModalOpen, setUploadedCsv, uploadedCsvHash } = useStore();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<CsvFarmerRow[] | null>(null);
  const [fileHash, setFileHash] = useState<string | null>(uploadedCsvHash);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isCsvModalOpen) return null;

  const processCsvText = (text: string) => {
    try {
      setErrorMsg(null);
      setWarnings([]);
      const result = parseAndValidateCsv(text);
      setPreviewRows(result.rows);
      setWarnings(result.warnings);
      setFileHash(result.sha256);
      setUploadedCsv(result.rows, result.sha256);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      setPreviewRows(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) processCsvText(text);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) processCsvText(text);
    };
    reader.readAsText(file);
  };

  const handleLoadSample = async () => {
    try {
      const res = await fetch('/samples/zone_a_week10.csv');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      processCsvText(text);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(`Failed to load sample CSV: ${msg}`);
    }
  };

  const handleResetToSnapshot = () => {
    setUploadedCsv(null, null);
    setPreviewRows(null);
    setFileHash(null);
    setErrorMsg(null);
    setWarnings([]);
  };

  return (
    <div
      className="command-bar-backdrop"
      onClick={() => setCsvModalOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Bring Your Own CSV"
    >
      <div
        className="csv-modal"
        onClick={(e) => e.stopPropagation()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <div className="modal-header">
          <div className="modal-title-row">
            <span className="modal-icon">📁</span>
            <div>
              <h2 className="modal-title">Bring-Your-Own CSV (<Exempt reason="id">§8.11</Exempt>)</h2>
              <span className="text-2">
                Browser-parsed in pure TypeScript core. Nothing uploaded to any server.
              </span>
            </div>
          </div>
          <button
            className="modal-close-btn"
            onClick={() => setCsvModalOpen(false)}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        <div className="csv-modal-body">
          {/* Dropzone */}
          <div
            className="csv-dropzone"
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv"
              style={{ display: 'none' }}
            />
            <span className="dropzone-icon">📥</span>
            <div className="dropzone-text">
              <strong>Drag & drop your CSV file here</strong>, or{' '}
              <span className="text-brand">browse files</span>
            </div>
            <span className="dropzone-hint text-2">
              Required: farmer_id, week (ISO 2026-W10), land_acres, well_discharge_m3h, reported_hours, meter_hours
            </span>
          </div>

          {/* Quick Sample Button */}
          <div className="sample-csv-actions">
            <button className="sample-btn" onClick={handleLoadSample}>
              📋 Load §6.11 Golden Sample (zone_a_week10.csv)
            </button>
            {fileHash && (
              <button className="reset-snapshot-btn" onClick={handleResetToSnapshot}>
                ↺ Revert to Default Snapshot
              </button>
            )}
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="csv-error-box" role="alert">
              <span className="error-icon">❌</span>
              <div>
                <strong>Validation Rejected:</strong>
                <p className="error-text">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="csv-warning-box">
              <span className="warning-icon">⚠️</span>
              <div>
                <strong>Warnings:</strong>
                <ul className="warning-list">
                  {warnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Success Summary & Hash */}
          {fileHash && previewRows && (
            <div className="csv-success-box">
              <div className="success-header">
                <span className="text-ok">✓ Successfully Parsed & Loaded via TS Core</span>
                <span className="badge-user font-mono">PROV: USER</span>
              </div>
              <div className="hash-row font-mono text-2">
                <span>File SHA-256: </span>
                <span className="hash-val" title={fileHash}>
                  <Exempt reason="id">{fileHash}</Exempt>
                </span>
              </div>
              <div className="summary-count text-2">
                Loaded {previewRows.length} farmer records across week {previewRows[0]?.week}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="done-btn" onClick={() => setCsvModalOpen(false)}>
            Done & View Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
