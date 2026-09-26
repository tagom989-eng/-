import React, { useState, useMemo } from 'react';
import {
  Search,
  Calendar,
  Printer,
  RotateCcw,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  User,
  UserCheck,
  Edit2,
} from 'lucide-react';
import { PrescriptionRecord, Medicine, StockMovement } from '../types/pharmacy';

interface HistoryViewProps {
  prescriptions: PrescriptionRecord[];
  medicines: Medicine[];
  onOpenPrintModal: (rx: PrescriptionRecord) => void;
  onCancelPrescription: (
    rxId: string,
    reason: string,
    restockMovements: StockMovement[],
    updatedMedicines: Medicine[]
  ) => void;
  onUpdatePrescriber?: (rxId: string, newDoctorName: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  prescriptions,
  medicines,
  onOpenPrintModal,
  onCancelPrescription,
  onUpdatePrescriber,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'cancelled'>('all');
  const [expandedRxId, setExpandedRxId] = useState<string | null>(null);

  // Cancellation modal state
  const [cancellingRx, setCancellingRx] = useState<PrescriptionRecord | null>(null);
  const [cancelReason, setCancelReason] = useState('ผู้ป่วยขอเปลี่ยนยา / แพทย์สั่งยกเลิก');

  // Prescriber editing modal state
  const [editingDoctorRx, setEditingDoctorRx] = useState<PrescriptionRecord | null>(null);
  const [editedDoctorName, setEditedDoctorName] = useState<string>('');

  const COMMON_DOCTORS = [
    'นพ. สมศักดิ์ กิจเจริญ (ว.58190)',
    'พญ. วราภรณ์ สุขสถิตย์ (ว.62410)',
    'นพ. ธีรเดช นิมิตมงคล (ว.49120)',
    'พญ. กนกวรรณ จันทร์สว่าง (ว.55310)',
    'นพ. ประพันธ์ วิศิษฏ์พงษ์ (ว.41203)',
  ];

  const filteredPrescriptions = useMemo(() => {
    return prescriptions
      .filter(rx => {
        const q = searchTerm.toLowerCase().trim();
        const matchesSearch =
          !q ||
          rx.id.toLowerCase().includes(q) ||
          rx.patientHn.toLowerCase().includes(q) ||
          rx.patientName.toLowerCase().includes(q) ||
          rx.doctorName.toLowerCase().includes(q) ||
          rx.pharmacistName.toLowerCase().includes(q) ||
          rx.items.some(i => i.genericName.toLowerCase().includes(q) || i.tradeName.toLowerCase().includes(q));

        const matchesStatus = statusFilter === 'all' || rx.status === statusFilter;

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => new Date(b.dispensedAt).getTime() - new Date(a.dispensedAt).getTime());
  }, [prescriptions, searchTerm, statusFilter]);

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const handleConfirmCancel = () => {
    if (!cancellingRx) return;

    // Calculate returned stocks
    const updatedMedicines = medicines.map(med => {
      const itemToReturn = cancellingRx.items.find(i => i.medicineId === med.id);
      if (itemToReturn) {
        return {
          ...med,
          currentStock: med.currentStock + itemToReturn.quantity,
        };
      }
      return med;
    });

    const timestamp = new Date().toISOString();
    const movements: StockMovement[] = cancellingRx.items.map((item, idx) => {
      const currentMed = medicines.find(m => m.id === item.medicineId)!;
      return {
        id: `mov-void-${Date.now()}-${idx}`,
        timestamp,
        medicineId: item.medicineId,
        medicineName: `${item.genericName} ${item.strength}`,
        type: 'cancel_dispense',
        quantity: item.quantity, // Return back to stock
        balanceBefore: currentMed.currentStock,
        balanceAfter: currentMed.currentStock + item.quantity,
        reference: cancellingRx.id,
        patientHn: cancellingRx.patientHn,
        patientName: cancellingRx.patientName,
        performedBy: cancellingRx.pharmacistName,
        note: `ยกเลิกใบสั่งยา ${cancellingRx.id} (คืนสต๊อก: ${cancelReason})`,
      };
    });

    onCancelPrescription(cancellingRx.id, cancelReason, movements, updatedMedicines);
    setCancellingRx(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            ประวัติการตัดสต๊อกและจ่ายยา (Dispensing History & Audit)
          </h2>
          <p className="text-xs text-slate-500">
            ประวัติการตัดสต๊อกยาตามหมายเลข HN ย้อนหลัง พร้อมระบบพิมพ์ซ้ำและยกเลิกคืนสต๊อก
          </p>
        </div>

        <div className="text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 font-mono">
          จ่ายยาทั้งหมด: <strong>{prescriptions.length}</strong> ใบสั่งยา
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-8 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="ค้นหาเลขที่ Rx, HN, ชื่อผู้ป่วย, ชื่อยา, เภสัชกร..."
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono"
          />
        </div>

        <div className="sm:col-span-4">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="all">สถานะทั้งหมด</option>
            <option value="completed">เฉพาะที่จ่ายสำเร็จ (Completed)</option>
            <option value="cancelled">เฉพาะที่ยกเลิกคืนสต๊อกแล้ว (Cancelled)</option>
          </select>
        </div>
      </div>

      {/* Dispensing Records List */}
      <div className="space-y-3">
        {filteredPrescriptions.length === 0 ? (
          <div className="py-16 text-center text-slate-400 bg-white border border-slate-200 rounded-xl text-xs">
            <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            ไม่พบประวัติการตัดสต๊อกยาตามเงื่อนไขที่ระบุ
          </div>
        ) : (
          filteredPrescriptions.map(rx => {
            const isExpanded = expandedRxId === rx.id;
            const isCancelled = rx.status === 'cancelled';

            return (
              <div
                key={rx.id}
                className={`bg-white border rounded-xl overflow-hidden transition-all shadow-xs ${
                  isCancelled
                    ? 'border-slate-300 bg-slate-50/60 opacity-80'
                    : 'border-slate-200 hover:border-teal-300'
                }`}
              >
                {/* Main Header Line */}
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3">
                    <button
                      onClick={() => setExpandedRxId(isExpanded ? null : rx.id)}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors mt-0.5 sm:mt-0"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-sm text-slate-900">
                          {rx.id}
                        </span>
                        <span className="text-xs font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                          HN: {rx.patientHn}
                        </span>
                        <span className="text-sm font-bold text-slate-800">
                          {rx.patientName}
                        </span>
                        {isCancelled ? (
                          <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 flex items-center gap-1">
                            <XCircle className="w-3 h-3" />
                            ยกเลิก/คืนสต๊อกแล้ว
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            ตัดสต๊อกเรียบร้อย
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-3 flex-wrap">
                        <span>วันที่: {formatDate(rx.dispensedAt)}</span>
                        <span>·</span>
                        <span>สิทธิ: {rx.coverageScheme}</span>
                        <span>·</span>
                        <span>
                          แพทย์ผู้สั่ง: <strong className="text-slate-800 font-semibold">{rx.doctorName}</strong>
                        </span>
                        {onUpdatePrescriber && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingDoctorRx(rx);
                              setEditedDoctorName(rx.doctorName);
                            }}
                            className="text-teal-700 hover:text-teal-900 font-medium underline text-[11px] inline-flex items-center gap-0.5"
                            title="แก้ไขชื่อแพทย์ผู้สั่งยา"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>แก้ไข</span>
                          </button>
                        )}
                        <span>·</span>
                        <span>เภสัชกร: {rx.pharmacistName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <div className="text-right">
                      <div className="font-mono font-bold text-sm text-slate-900">
                        {rx.totalAmount > 0 ? (
                          `฿${rx.totalAmount.toFixed(2)}`
                        ) : (
                          <span className="text-slate-400 text-xs font-normal">ไม่ระบุราคา</span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {rx.items.length} รายการ
                      </div>
                    </div>

                    {onUpdatePrescriber && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingDoctorRx(rx);
                          setEditedDoctorName(rx.doctorName);
                        }}
                        className="px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center gap-1 transition-colors"
                        title="แก้ไขชื่อแพทย์ผู้สั่งยาสำหรับใบสั่งยานี้"
                      >
                        <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                        <span className="hidden sm:inline">แก้ไขผู้สั่งยา</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onOpenPrintModal(rx)}
                      className="px-3 py-1.5 text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg flex items-center gap-1 transition-colors"
                      title="พิมพ์สลากยา หรือ ใบรับยา"
                    >
                      <Printer className="w-3.5 h-3.5 text-teal-600" />
                      <span>พิมพ์สลาก</span>
                    </button>

                    {!isCancelled && (
                      <button
                        type="button"
                        onClick={() => setCancellingRx(rx)}
                        className="px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg flex items-center gap-1 transition-colors"
                        title="ยกเลิกใบสั่งยาและคืนสต๊อกยาเข้าคลัง"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                        <span>คืนสต๊อก</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Itemized Drawer */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/70 p-4 sm:p-6 space-y-3">
                    <div className="text-xs font-semibold text-slate-700">
                      รายการยาที่ถูกตัดสต๊อก ({rx.items.length} รายการ):
                    </div>

                    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-slate-600 border-b border-slate-200">
                            <th className="py-2 px-3">#</th>
                            <th className="py-2 px-3">ชื่อยา / ความแรง</th>
                            <th className="py-2 px-3">วิธีใช้ยา</th>
                            <th className="py-2 px-3">Lot No.</th>
                            <th className="py-2 px-3 text-right">จำนวนตัดสต๊อก</th>
                            <th className="py-2 px-3 text-right">ราคา/หน่วย</th>
                            <th className="py-2 px-3 text-right">รวม (บาท)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {rx.items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-slate-900">
                                  {item.genericName} {item.strength}
                                </div>
                                {item.tradeName && item.tradeName !== item.genericName && (
                                  <div className="text-[11px] text-slate-500">{item.tradeName}</div>
                                )}
                              </td>
                              <td className="py-2.5 px-3 max-w-xs text-slate-700">
                                <div>{item.instructions}</div>
                                {item.warning && (
                                  <div className="text-[10px] text-rose-600">{item.warning}</div>
                                )}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-600">
                                {item.batchNumber}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-teal-800">
                                {item.quantity} {item.unit}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                                {item.unitPrice > 0 ? `฿${item.unitPrice.toFixed(2)}` : '-'}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                                {item.totalPrice > 0 ? `฿${item.totalPrice.toFixed(2)}` : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                      <div>
                        <span>การวินิจฉัย: </span>
                        <strong className="text-slate-800">{rx.diagnosis || '-'}</strong>
                      </div>
                      <div className="sm:text-right">
                        <span>แพทย์ผู้ตรวจ/สั่งยา: </span>
                        <strong className="text-slate-800">{rx.doctorName}</strong>
                        {onUpdatePrescriber && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingDoctorRx(rx);
                              setEditedDoctorName(rx.doctorName);
                            }}
                            className="text-teal-700 hover:text-teal-900 font-medium underline text-xs ml-1.5"
                          >
                            [แก้ไข]
                          </button>
                        )}
                      </div>
                    </div>

                    {isCancelled && rx.cancelReason && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
                        <strong>เหตุผลที่ยกเลิก/คืนสต๊อก: </strong>
                        <span>{rx.cancelReason}</span>
                        <div className="text-[11px] text-rose-600 mt-0.5">
                          ยกเลิกเมื่อ: {formatDate(rx.cancelledAt || rx.dispensedAt)}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* CANCELLATION & RESTOCK DIALOG */}
      {cancellingRx && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  ยืนยันยกเลิกใบสั่งยา & คืนสต๊อกยา?
                </h3>
                <p className="text-xs text-slate-500">
                  ใบสั่งยาเลขที่ {cancellingRx.id} · HN: {cancellingRx.patientHn}
                </p>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-1">
              <p className="font-semibold">ระบบจะทำการเพิ่มสต๊อกยากลับเข้าคลังอัตโนมัติ:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                {cancellingRx.items.map((it, idx) => (
                  <li key={idx}>
                    คืน <strong>{it.genericName}</strong> +{it.quantity} {it.unit}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ระบุเหตุผลในการยกเลิก / คืนยา:
              </label>
              <input
                type="text"
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="เช่น ผู้ป่วยขอยกเลิก / บันทึกผิดพลาด / แพทย์เปลี่ยนแผนการรักษา"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setCancellingRx(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                ปิด
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors"
              >
                ยืนยันยกเลิกและคืนสต๊อก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PRESCRIBER / DOCTOR DIALOG */}
      {editingDoctorRx && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  แก้ไขชื่อแพทย์ผู้สั่งยา
                </h3>
                <p className="text-xs text-slate-500">
                  ใบสั่งยาเลขที่ {editingDoctorRx.id} · HN: {editingDoctorRx.patientHn}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เลือกจากรายชื่อแพทย์ที่พบบ่อย:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_DOCTORS.map(doc => (
                    <button
                      key={doc}
                      type="button"
                      onClick={() => setEditedDoctorName(doc)}
                      className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                        editedDoctorName === doc
                          ? 'bg-teal-700 text-white border-teal-700 font-semibold'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                      }`}
                    >
                      {doc.split('(')[0]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  หรือพิมพ์แก้ไขชื่อแพทย์/ผู้สั่งยาโดยตรง:
                </label>
                <input
                  type="text"
                  value={editedDoctorName}
                  onChange={e => setEditedDoctorName(e.target.value)}
                  placeholder="พิมพ์ชื่อแพทย์ผู้สั่งยา..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-900"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setEditingDoctorRx(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  if (editedDoctorName.trim() && onUpdatePrescriber) {
                    onUpdatePrescriber(editingDoctorRx.id, editedDoctorName.trim());
                  }
                  setEditingDoctorRx(null);
                }}
                disabled={!editedDoctorName.trim()}
                className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 rounded-lg shadow-xs transition-colors"
              >
                บันทึกการแก้ไข
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
