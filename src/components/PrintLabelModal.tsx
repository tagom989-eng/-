import React, { useState } from 'react';
import { X, Printer, CheckCircle, AlertTriangle } from 'lucide-react';
import { PrescriptionRecord } from '../types/pharmacy';
import { ClinicInfo } from '../services/storageService';

interface PrintLabelModalProps {
  prescription: PrescriptionRecord;
  clinicInfo: ClinicInfo;
  onClose: () => void;
}

export const PrintLabelModal: React.FC<PrintLabelModalProps> = ({
  prescription,
  clinicInfo,
  onClose,
}) => {
  const [printMode, setPrintMode] = useState<'labels' | 'summary'>('labels');

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Top Bar (Hidden in print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 no-print">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                พิมพ์เอกสารการจ่ายยา #{prescription.id}
              </h3>
              <p className="text-xs text-slate-500">
                HN: {prescription.patientHn} · {prescription.patientName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Mode switch */}
            <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => setPrintMode('labels')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  printMode === 'labels' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                สลากยาติดซอง ({prescription.items.length} รายการ)
              </button>
              <button
                type="button"
                onClick={() => setPrintMode('summary')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  printMode === 'summary' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ใบสรุปรายการยา / ใบเสร็จ
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg flex items-center gap-2 shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>สั่งพิมพ์ (Ctrl+P)</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Content Container */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 print:bg-white print:p-0">
          {printMode === 'labels' ? (
            /* Mode 1: Individual Medicine Sticker Labels */
            <div className="space-y-6 print:space-y-4 max-w-2xl mx-auto">
              <div className="no-print bg-teal-50 border border-teal-200 text-teal-800 text-xs px-4 py-2.5 rounded-lg flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0 text-teal-600" />
                <span>
                  สลากยาขนาดมาตรฐานตามระเบียบกระทรวงสาธารณสุข สามารถสั่งพิมพ์ลงสติกเกอร์ซองยาได้ทันที
                </span>
              </div>

              {prescription.items.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white border-2 border-slate-300 rounded-lg p-5 shadow-xs print:shadow-none print:border-black print:page-break-inside-avoid print:mb-4"
                >
                  {/* Label Header */}
                  <div className="border-b border-slate-300 pb-2 mb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">
                          {clinicInfo.hospitalName}
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          {clinicInfo.phone} · {clinicInfo.department}
                        </p>
                      </div>
                      <div className="text-right text-[11px] font-mono">
                        <span className="font-semibold text-slate-700">{formatDate(prescription.dispensedAt)}</span>
                        <div className="text-slate-500">{prescription.id}</div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-2 pt-1 border-t border-dashed border-slate-200 text-xs">
                      <div>
                        <span className="text-slate-500">HN: </span>
                        <span className="font-bold text-slate-900 font-mono">{prescription.patientHn}</span>
                        <span className="mx-2 text-slate-300">|</span>
                        <span className="text-slate-500">ชื่อ: </span>
                        <span className="font-semibold text-slate-900">{prescription.patientName}</span>
                      </div>
                      <div className="text-slate-600">
                        อายุ {prescription.patientAge} ปี ({prescription.patientGender})
                      </div>
                    </div>
                  </div>

                  {/* Medicine Details */}
                  <div className="my-2">
                    <div className="flex justify-between items-baseline">
                      <div className="text-base font-bold text-slate-900">
                        {item.genericName} {item.strength}
                        {item.tradeName && item.tradeName !== item.genericName && (
                          <span className="text-xs font-normal text-slate-600 ml-1.5">
                            ({item.tradeName})
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-bold text-teal-700 font-mono">
                        จำนวน: {item.quantity} {item.unit}
                      </div>
                    </div>

                    {/* Usage Instructions */}
                    <div className="mt-3 bg-slate-50 print:bg-transparent p-3 rounded border border-slate-200 print:border-slate-400">
                      <div className="text-xs text-slate-500 font-semibold mb-1">วิธีใช้ยา:</div>
                      <div className="text-sm font-bold text-slate-900 leading-snug">
                        {item.instructions || 'ตามแพทย์สั่ง'}
                      </div>
                    </div>

                    {/* Warnings */}
                    {item.warning && (
                      <div className="mt-2 text-xs text-rose-700 font-medium flex items-start gap-1">
                        <span className="font-bold shrink-0">คำเตือน:</span>
                        <span>{item.warning}</span>
                      </div>
                    )}
                  </div>

                  {/* Label Footer */}
                  <div className="border-t border-slate-200 mt-4 pt-2 flex justify-between items-center text-[11px] text-slate-500">
                    <div>
                      <span>Lot: {item.batchNumber}</span>
                      <span className="mx-1.5">·</span>
                      <span>รูปแบบ: {item.dosageForm}</span>
                    </div>
                    <div className="text-right">
                      เภสัชกรผู้จ่าย: {prescription.pharmacistName}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Mode 2: Full Prescription Summary Receipt */
            <div className="bg-white border border-slate-300 rounded-lg p-8 max-w-2xl mx-auto shadow-xs print:shadow-none print:border-none print:p-0">
              {/* Header */}
              <div className="text-center border-b border-slate-300 pb-4 mb-4">
                <h2 className="text-xl font-bold text-slate-900">{clinicInfo.hospitalName}</h2>
                <p className="text-xs text-slate-600 mt-0.5">{clinicInfo.address} · โทร: {clinicInfo.phone}</p>
                <div className="inline-block mt-2 px-3 py-1 bg-slate-100 rounded text-xs font-semibold text-slate-800">
                  ใบสรุปรายการยาและการตัดสต๊อก / ใบรับยา
                </div>
              </div>

              {/* Patient & Prescription Info */}
              <div className="grid grid-cols-2 gap-3 text-xs border-b border-slate-200 pb-4 mb-4">
                <div>
                  <span className="text-slate-500">เลขที่ใบสั่งยา (Rx No): </span>
                  <span className="font-mono font-bold text-slate-800">{prescription.id}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500">วันที่ตัดสต๊อก & จ่ายยา: </span>
                  <span className="font-semibold text-slate-800">{formatDate(prescription.dispensedAt)}</span>
                </div>
                <div>
                  <span className="text-slate-500">รหัสประจำตัวผู้ป่วย (HN): </span>
                  <span className="font-mono font-bold text-teal-800 text-sm">{prescription.patientHn}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500">สิทธิการรักษา: </span>
                  <span className="font-medium text-slate-800">{prescription.coverageScheme}</span>
                </div>
                <div>
                  <span className="text-slate-500">ชื่อผู้ป่วย: </span>
                  <span className="font-bold text-slate-900 text-sm">{prescription.patientName}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500">อายุ/เพศ: </span>
                  <span className="text-slate-800">{prescription.patientAge} ปี ({prescription.patientGender})</span>
                </div>
                {prescription.patientAllergies.length > 0 && (
                  <div className="col-span-2 bg-rose-50 text-rose-800 p-2 rounded border border-rose-200 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span className="font-bold">ประวัติแพ้ยา: </span>
                    <span>{prescription.patientAllergies.join(', ')}</span>
                  </div>
                )}
                <div>
                  <span className="text-slate-500">แพทย์ผู้สั่งยา: </span>
                  <span className="text-slate-800">{prescription.doctorName}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500">เภสัชกรผู้ตัดจ่าย: </span>
                  <span className="text-slate-800">{prescription.pharmacistName}</span>
                </div>
              </div>

              {/* Items Table */}
              <div className="mb-4">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-300 text-slate-700 bg-slate-50">
                      <th className="py-2 px-1 text-center w-8">#</th>
                      <th className="py-2 px-2">รายการยา / ความแรง</th>
                      <th className="py-2 px-2 text-center">วิธีใช้</th>
                      <th className="py-2 px-2 text-right">จำนวน</th>
                      <th className="py-2 px-2 text-right">ราคา/หน่วย</th>
                      <th className="py-2 px-2 text-right">รวม (บาท)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {prescription.items.map((item, idx) => (
                      <tr key={idx} className="align-top">
                        <td className="py-2 px-1 text-center text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-2 px-2">
                          <div className="font-bold text-slate-900">{item.genericName} {item.strength}</div>
                          {item.tradeName && item.tradeName !== item.genericName && (
                            <div className="text-[11px] text-slate-500">{item.tradeName}</div>
                          )}
                          <div className="text-[10px] text-slate-400 font-mono">Lot: {item.batchNumber}</div>
                        </td>
                        <td className="py-2 px-2 max-w-[200px]">
                          <div className="text-slate-700">{item.instructions}</div>
                          {item.warning && (
                            <div className="text-[10px] text-rose-600 mt-0.5">{item.warning}</div>
                          )}
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-semibold">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-slate-600">
                          {item.unitPrice > 0 ? item.unitPrice.toFixed(2) : '-'}
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-bold text-slate-900">
                          {item.totalPrice > 0 ? item.totalPrice.toFixed(2) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-300">
                      <td colSpan={4} className="py-3 px-2 font-bold text-slate-800 text-right">
                        ยอดรวมทั้งสิ้น ({prescription.items.length} รายการ):
                      </td>
                      <td colSpan={2} className="py-3 px-2 font-mono font-bold text-base text-teal-800 text-right">
                        {prescription.totalAmount > 0
                          ? `฿${prescription.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
                          : 'บริการตามสิทธิ (ไม่คิดมูลค่า)'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 pt-8 mt-4 border-t border-dashed border-slate-300 text-xs text-center">
                <div>
                  <div className="border-b border-slate-400 w-44 mx-auto mb-1.5 h-8"></div>
                  <p className="font-medium text-slate-800">{prescription.pharmacistName}</p>
                  <p className="text-slate-400 text-[11px]">เภสัชกรผู้ตรวจสอบและตัดจ่ายสต๊อก</p>
                </div>
                <div>
                  <div className="border-b border-slate-400 w-44 mx-auto mb-1.5 h-8"></div>
                  <p className="font-medium text-slate-800">{prescription.patientName}</p>
                  <p className="text-slate-400 text-[11px]">ผู้ป่วยหรือผู้รับมอบฉันทะรับยา</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
