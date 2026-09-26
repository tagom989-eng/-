import React, { useState, useRef } from 'react';
import {
  X,
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle,
  AlertTriangle,
  Pill,
  AlertCircle,
} from 'lucide-react';
import { Medicine } from '../types/pharmacy';
import { excelService, ParsedMedicineResult } from '../services/excelService';

interface MedicineExcelImportModalProps {
  existingMedicines: Medicine[];
  onImportComplete: (importedMeds: Medicine[], updateExisting: boolean) => void;
  onClose: () => void;
}

export const MedicineExcelImportModal: React.FC<MedicineExcelImportModalProps> = ({
  existingMedicines,
  onImportComplete,
  onClose,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedResult, setParsedResult] = useState<ParsedMedicineResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [updateExisting, setUpdateExisting] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const duplicateCount = React.useMemo(() => {
    if (!parsedResult) return 0;
    const existingCodeSet = new Set(existingMedicines.map(m => m.code.toLowerCase()));
    return parsedResult.validMedicines.filter(m => existingCodeSet.has(m.code.toLowerCase())).length;
  }, [parsedResult, existingMedicines]);

  const handleFileChange = async (selectedFile: File) => {
    setErrorMessage('');
    setFile(selectedFile);
    setIsParsing(true);
    setParsedResult(null);

    try {
      const result = await excelService.parseMedicineFile(selectedFile, existingMedicines);
      setParsedResult(result);
      if (result.validMedicines.length === 0 && result.errors.length > 0) {
        setErrorMessage(result.errors[0]);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'ไม่สามารถอ่านไฟล์ Excel รายการยาได้');
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleFileChange(droppedFile);
    }
  };

  const handleConfirmImport = () => {
    if (!parsedResult || parsedResult.validMedicines.length === 0) return;
    onImportComplete(parsedResult.validMedicines, updateExisting);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                นำเข้าข้อมูลยาและสต๊อกเข้าคลังจาก Excel (.xlsx / .xls / .csv)
              </h3>
              <p className="text-xs text-slate-500">
                ดึงชื่อยา, ขนาดความแรง, จำนวนสต๊อก, Lot และวันหมดอายุ (<strong>ไม่ต้องระบุราคายา</strong>)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Info Banner */}
          <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="text-teal-950">
              <strong className="block font-bold mb-0.5 text-teal-900">
                ✨ สะดวก รวดเร็ว และไม่ต้องใส่ราคายา
              </strong>
              <span className="text-teal-800">
                ระบบรองรับคอลัมน์: รหัสยา, ชื่อยา (Generic), ชื่อการค้า, ขนาดความแรง, รูปแบบ, จำนวนสต๊อก, Lot, วันหมดอายุ
                <br />
                <span className="font-semibold text-emerald-700">* คอลัมน์ราคายาสามารถเว้นว่างไว้ได้ ไม่จำเป็นต้องกรอก</span>
              </span>
            </div>

            <button
              type="button"
              onClick={() => excelService.downloadMedicineTemplate()}
              className="px-3.5 py-2 text-xs font-semibold text-teal-800 bg-white hover:bg-teal-100 border border-teal-300 rounded-lg flex items-center gap-1.5 shrink-0 transition-colors shadow-xs"
            >
              <Download className="w-4 h-4 text-teal-700" />
              <span>ดาวน์โหลดไฟล์ตัวอย่าง Excel</span>
            </button>
          </div>

          {/* Upload Dropzone */}
          <div
            onDragOver={e => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-teal-500 bg-teal-50/60'
                : 'border-slate-300 hover:border-teal-400 bg-slate-50/40 hover:bg-slate-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) handleFileChange(f);
              }}
              className="hidden"
            />

            <Upload className="w-10 h-10 mx-auto text-slate-400 mb-2" />
            <div className="text-sm font-bold text-slate-800">
              {file ? file.name : 'คลิกเพื่อเลือกไฟล์ Excel คลังยา หรือลากไฟล์มาวางที่นี่'}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              รองรับไฟล์ .xlsx, .xls, .csv พร้อมระบบแปลงรหัสยาอัตโนมัติ
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs px-4 py-3 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">พบข้อผิดพลาด:</strong>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Parsing state */}
          {isParsing && (
            <div className="py-8 text-center text-xs text-slate-500 animate-pulse">
              กำลังอ่านและแปลงข้อมูลรายการยาจาก Excel...
            </div>
          )}

          {/* Parsed Result Preview */}
          {parsedResult && parsedResult.validMedicines.length > 0 && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-slate-500">พบรายการยาทั้งหมด: </span>
                    <strong className="font-mono text-slate-900 text-sm">
                      {parsedResult.validMedicines.length}
                    </strong> รายการ
                  </div>

                  {duplicateCount > 0 && (
                    <div className="text-amber-800 flex items-center gap-1 font-medium bg-amber-50 px-2 py-1 rounded border border-amber-200">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>พบรหัสยาซ้ำในระบบ {duplicateCount} รายการ</span>
                    </div>
                  )}
                </div>

                {duplicateCount > 0 && (
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={updateExisting}
                      onChange={e => setUpdateExisting(e.target.checked)}
                      className="rounded text-teal-600 focus:ring-teal-500"
                    />
                    <span>อัปเดตข้อมูลยาเดิมและทบสต๊อกเข้าของเดิม</span>
                  </label>
                )}
              </div>

              {/* Table Preview */}
              <div>
                <div className="text-xs font-semibold text-slate-700 mb-2 flex justify-between">
                  <span>ตัวอย่างรายการยาที่จะนำเข้า (แสดง {Math.min(10, parsedResult.validMedicines.length)} จาก {parsedResult.validMedicines.length} รายการ):</span>
                  <span className="text-emerald-700 font-medium">✓ ราคายา: ไม่จำเป็นต้องระบุ</span>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-64 divide-y divide-slate-100">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-100 text-slate-600 sticky top-0">
                      <tr>
                        <th className="py-2 px-3 font-mono">รหัสยา</th>
                        <th className="py-2 px-3">ชื่อสามัญ / การค้า</th>
                        <th className="py-2 px-3">ขนาดความแรง</th>
                        <th className="py-2 px-3">รูปแบบ</th>
                        <th className="py-2 px-3 text-right">จำนวนสต๊อก</th>
                        <th className="py-2 px-3">Lot No.</th>
                        <th className="py-2 px-3">วันหมดอายุ</th>
                        <th className="py-2 px-3">ตำแหน่งเก็บ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedResult.validMedicines.slice(0, 10).map((m, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono font-bold text-teal-800">
                            {m.code}
                          </td>
                          <td className="py-2 px-3">
                            <span className="font-semibold text-slate-900">{m.genericName}</span>
                            {m.tradeName && m.tradeName !== m.genericName && (
                              <span className="text-slate-500 text-[11px] block">{m.tradeName}</span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-700">
                            {m.strength}
                          </td>
                          <td className="py-2 px-3 text-slate-600">
                            {m.dosageForm} ({m.unit})
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-teal-800">
                            {m.currentStock.toLocaleString()} {m.unit}
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-600 text-[11px]">
                            {m.batchNumber}
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-600 text-[11px]">
                            {m.expiryDate}
                          </td>
                          <td className="py-2 px-3 text-slate-600">
                            {m.location}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            ยกเลิก
          </button>

          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={!parsedResult || parsedResult.validMedicines.length === 0}
            className="px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 rounded-lg flex items-center gap-2 shadow-xs transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            <CheckCircle className="w-4 h-4" />
            <span>
              ยืนยันนำเข้าคลังยา ({parsedResult?.validMedicines.length || 0} รายการ)
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
