import React, { useState } from 'react';
import { X, PackagePlus, AlertCircle } from 'lucide-react';
import { Medicine } from '../types/pharmacy';

interface RestockModalProps {
  medicines: Medicine[];
  preselectedMedicineId?: string;
  onRestock: (
    medicineId: string,
    quantity: number,
    batchNumber: string,
    expiryDate: string,
    note: string
  ) => void;
  onClose: () => void;
}

export const RestockModal: React.FC<RestockModalProps> = ({
  medicines,
  preselectedMedicineId,
  onRestock,
  onClose,
}) => {
  const [selectedMedId, setSelectedMedId] = useState<string>(
    preselectedMedicineId || (medicines.length > 0 ? medicines[0].id : '')
  );
  const [quantity, setQuantity] = useState<number>(100);
  const [batchNumber, setBatchNumber] = useState<string>('');
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [note, setNote] = useState<string>('รับยาเข้าสต๊อกประจำงวด');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const selectedMed = medicines.find(m => m.id === selectedMedId);

  // Initialize batch & expiry when medicine changes
  React.useEffect(() => {
    if (selectedMed) {
      setBatchNumber(selectedMed.batchNumber || `LOT-${new Date().getFullYear().toString().slice(-2)}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-02`);
      setExpiryDate(selectedMed.expiryDate || '');
    }
  }, [selectedMedId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMedId) {
      setErrorMsg('กรุณาเลือกรายการยาที่ต้องการเติมสต๊อก');
      return;
    }
    if (quantity <= 0) {
      setErrorMsg('กรุณาระบุจำนวนที่มากกว่า 0');
      return;
    }

    onRestock(selectedMedId, Number(quantity), batchNumber, expiryDate, note);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
              <PackagePlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">รับยาเข้าคลัง / เติมสต๊อก</h3>
              <p className="text-xs text-slate-500">บันทึกรับยาจากบริษัทเวชภัณฑ์เข้าคลังยา</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-4 py-2.5 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              เลือกรายการยา *
            </label>
            <select
              value={selectedMedId}
              onChange={e => setSelectedMedId(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {medicines.map(med => (
                <option key={med.id} value={med.id}>
                  [{med.code}] {med.genericName} {med.strength} ({med.tradeName}) - คงเหลือ {med.currentStock} {med.unit}
                </option>
              ))}
            </select>
          </div>

          {selectedMed && (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center text-xs">
              <div>
                <span className="text-slate-500">สต๊อกปัจจุบัน: </span>
                <span className="font-bold text-slate-800 font-mono">
                  {selectedMed.currentStock} {selectedMed.unit}
                </span>
                <span className="mx-2 text-slate-300">|</span>
                <span className="text-slate-500">เกณฑ์เตือน: </span>
                <span className="font-mono text-slate-700">{selectedMed.minStock} {selectedMed.unit}</span>
              </div>
              <div className="text-teal-700 font-medium">
                ตำแหน่ง: {selectedMed.location}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                จำนวนที่รับเข้า ({selectedMed?.unit || 'หน่วย'}) *
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={e => setQuantity(Number(e.target.value))}
                required
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono font-bold text-teal-800"
              />
              {selectedMed && (
                <span className="text-[11px] text-slate-500 mt-1 block">
                  ยอดหลังเติม: <strong className="font-mono text-teal-800">{selectedMed.currentStock + (Number(quantity) || 0)}</strong> {selectedMed.unit}
                </span>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                รุ่นผลิตใหม่ (Lot No.)
              </label>
              <input
                type="text"
                value={batchNumber}
                onChange={e => setBatchNumber(e.target.value)}
                placeholder="เช่น LOT-2409"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                วันหมดอายุของ Lot นี้
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={e => setExpiryDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                หมายเหตุ / เลขที่ใบส่งของ
              </label>
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="เช่น PO-6709-12 / บ.โอสถ"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Footer buttons */}
          <div className="pt-4 flex justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-xs transition-colors"
            >
              ยืนยันรับเข้าสต๊อก (+{quantity})
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
