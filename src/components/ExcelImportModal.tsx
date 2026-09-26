import React, { useState, useRef } from 'react';
import {
  X,
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle,
  AlertTriangle,
  Users,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { Patient } from '../types/pharmacy';
import { excelService, ParsedPatientResult } from '../services/excelService';

interface ExcelImportModalProps {
  existingPatients: Patient[];
  onImportComplete: (importedPatients: Patient[], overwrite: boolean) => void;
  onClose: () => void;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  existingPatients,
  onImportComplete,
  onClose,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedResult, setParsedResult] = useState<ParsedPatientResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [overwriteDuplicates, setOverwriteDuplicates] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check how many parsed patients conflict with existing HN
  const duplicateCount = React.useMemo(() => {
    if (!parsedResult) return 0;
    const existingHnSet = new Set(existingPatients.map(p => p.hn.toLowerCase()));
    return parsedResult.validPatients.filter(p => existingHnSet.has(p.hn.toLowerCase())).length;
  }, [parsedResult, existingPatients]);

  const handleFileChange = async (selectedFile: File) => {
    setErrorMessage('');
    setFile(selectedFile);
    setIsParsing(true);
    setParsedResult(null);

    try {
      const result = await excelService.parsePatientFile(selectedFile);
      setParsedResult(result);
      if (result.validPatients.length === 0 && result.errors.length > 0) {
        setErrorMessage(result.errors[0]);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'ไม่สามารถอ่านไฟล์ Excel ได้');
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
    if (!parsedResult || parsedResult.validPatients.length === 0) return;
    onImportComplete(parsedResult.validPatients, overwriteDuplicates);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                นำเข้าข้อมูลผู้ป่วยจาก Excel (.xlsx / .xls / .csv)
              </h3>
              <p className="text-xs text-slate-500">
                ดึงรายชื่อผู้ป่วย, รหัส HN, ประวัติการแพ้ยา, และข้อมูลสิทธิการรักษาเข้าสู่ระบบ
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Top Info & Download Template Banner */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="text-emerald-950">
              <strong className="block font-bold mb-0.5">
                ต้องการแบบฟอร์มคอลัมน์มาตรฐานหรือไม่?
              </strong>
              <span>
                ไฟล์ Excel ควรรองรับคอลัมน์: HN, คำนำหน้า, ชื่อ, นามสกุล, อายุ, เพศ, กรุ๊ปเลือด, ประวัติแพ้ยา, โรคประจำตัว, เบอร์โทร, สิทธิ
              </span>
            </div>
            <button
              type="button"
              onClick={() => excelService.downloadTemplate()}
              className="px-3 py-2 text-xs font-semibold text-emerald-800 bg-white hover:bg-emerald-100 border border-emerald-300 rounded-lg flex items-center gap-1.5 shrink-0 transition-colors shadow-xs"
            >
              <Download className="w-4 h-4 text-emerald-700" />
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
                ? 'border-emerald-500 bg-emerald-50/60'
                : 'border-slate-300 hover:border-emerald-400 bg-slate-50/40 hover:bg-slate-50'
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
              {file ? file.name : 'คลิกเพื่อเลือกไฟล์ Excel หรือลากไฟล์มาวางที่นี่'}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              รองรับไฟล์ .xlsx, .xls, .csv (ไม่จำกัดจำนวนแถว)
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

          {/* Parsing State */}
          {isParsing && (
            <div className="py-8 text-center text-xs text-slate-500 animate-pulse">
              กำลังวิเคราะห์และแปลงข้อมูลผู้ป่วยจาก Excel...
            </div>
          )}

          {/* Parsed Result Preview */}
          {parsedResult && parsedResult.validPatients.length > 0 && (
            <div className="space-y-4">
              {/* Summary Stats & Options */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-slate-500">พบข้อมูลทั้งหมด: </span>
                    <strong className="font-mono text-slate-900 text-sm">
                      {parsedResult.validPatients.length}
                    </strong> ราย
                  </div>

                  {duplicateCount > 0 && (
                    <div className="text-amber-800 flex items-center gap-1 font-medium bg-amber-50 px-2 py-1 rounded border border-amber-200">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>พบ HN ซ้ำกับในระบบ {duplicateCount} ราย</span>
                    </div>
                  )}
                </div>

                {/* Overwrite Toggle */}
                {duplicateCount > 0 && (
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={overwriteDuplicates}
                      onChange={e => setOverwriteDuplicates(e.target.checked)}
                      className="rounded text-teal-600 focus:ring-teal-500"
                    />
                    <span>อัปเดตข้อมูลผู้ป่วยเดิมถ้า HN ซ้ำ</span>
                  </label>
                )}
              </div>

              {/* Preview Table */}
              <div>
                <div className="text-xs font-semibold text-slate-700 mb-2 flex justify-between">
                  <span>ตัวอย่างข้อมูลที่จะนำเข้า (แสดง {Math.min(10, parsedResult.validPatients.length)} จาก {parsedResult.validPatients.length} ราย):</span>
                  <span className="text-slate-400 font-normal">พร้อมตัดสต๊อกทันทีหลังนำเข้า</span>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-64 divide-y divide-slate-100">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-100 text-slate-600 sticky top-0">
                      <tr>
                        <th className="py-2 px-3 font-mono">HN</th>
                        <th className="py-2 px-3">ชื่อ-นามสกุล</th>
                        <th className="py-2 px-3">อายุ/เพศ</th>
                        <th className="py-2 px-3">สิทธิการรักษา</th>
                        <th className="py-2 px-3">ประวัติแพ้ยา</th>
                        <th className="py-2 px-3">โรคประจำตัว</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedResult.validPatients.slice(0, 10).map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono font-bold text-teal-800">
                            {p.hn}
                          </td>
                          <td className="py-2 px-3 font-semibold text-slate-900">
                            {p.prefix}{p.firstName} {p.lastName}
                          </td>
                          <td className="py-2 px-3 text-slate-600">
                            {p.age} ปี ({p.gender === 'male' ? 'ช' : 'ญ'})
                          </td>
                          <td className="py-2 px-3 text-slate-600">
                            {p.coverageScheme}
                          </td>
                          <td className="py-2 px-3">
                            {p.allergies.length > 0 ? (
                              <span className="text-rose-700 font-semibold bg-rose-50 px-1.5 py-0.5 rounded text-[11px]">
                                {p.allergies.join(', ')}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">ไม่มี</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-slate-600 max-w-xs truncate">
                            {p.chronicDiseases.join(', ') || '-'}
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
            disabled={!parsedResult || parsedResult.validPatients.length === 0}
            className="px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 rounded-lg flex items-center gap-2 shadow-xs transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            <CheckCircle className="w-4 h-4" />
            <span>
              ยืนยันนำเข้าผู้ป่วย ({parsedResult?.validPatients.length || 0} รายการ)
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
