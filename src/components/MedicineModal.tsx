import React, { useState, useEffect } from 'react';
import { X, Pill, AlertCircle } from 'lucide-react';
import { Medicine } from '../types/pharmacy';

interface MedicineModalProps {
  medicine?: Medicine | null; // null if adding new
  existingMedicines: Medicine[];
  onSave: (medicine: Medicine) => void;
  onClose: () => void;
}

const COMMON_CATEGORIES = [
  'ยาแก้ปวด/ลดไข้',
  'ยาปฏิชีวนะ (Antibiotics)',
  'ยาแก้ปวด/ลดอักเสบ (NSAIDs)',
  'ยาลดความดันโลหิต',
  'ยาควบคุมระดับน้ำตาล (เบาหวาน)',
  'ยาลดไขมันในเลือด',
  'ยาลดกรดและรักษาแผลในกระเพาะ',
  'ยาแก้แพ้/ลดน้ำมูก',
  'ยาแก้ไอขับเสมหะ',
  'วิตามินและเกลือแร่',
  'ยารักษาโรคผิวหนัง',
  'ยาหยอดตา/หู',
];

const COMMON_DOSAGE_FORMS = [
  'เม็ด',
  'แคปซูล',
  'ยาน้ำ',
  'ยาน้ำแขวนตะกอน',
  'ยาพ่นสูด',
  'ขี้ผึ้ง/ครีม',
  'ยาหยอด',
  'ซองผงละลายน้ำ',
  'หลอดฉีด',
];

const COMMON_UNITS = ['เม็ด', 'แคปซูล', 'ขวด', 'ซอง', 'หลอด', 'แผง', 'กล่อง'];

export const MedicineModal: React.FC<MedicineModalProps> = ({
  medicine,
  existingMedicines,
  onSave,
  onClose,
}) => {
  const generateNextCode = () => {
    let maxNum = 0;
    existingMedicines.forEach(m => {
      const match = m.code.match(/MED-(\d+)/);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    return `MED-${(maxNum + 1).toString().padStart(3, '0')}`;
  };

  const [code, setCode] = useState('');
  const [genericName, setGenericName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [dosageForm, setDosageForm] = useState('เม็ด');
  const [strength, setStrength] = useState('');
  const [category, setCategory] = useState(COMMON_CATEGORIES[0]);
  const [unit, setUnit] = useState('เม็ด');
  const [currentStock, setCurrentStock] = useState<number>(100);
  const [minStock, setMinStock] = useState<number>(30);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [batchNumber, setBatchNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [location, setLocation] = useState('A-01');
  const [defaultInstructions, setDefaultInstructions] = useState('');
  const [warning, setWarning] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (medicine) {
      setCode(medicine.code);
      setGenericName(medicine.genericName);
      setTradeName(medicine.tradeName);
      setDosageForm(medicine.dosageForm);
      setStrength(medicine.strength);
      setCategory(medicine.category);
      setUnit(medicine.unit);
      setCurrentStock(medicine.currentStock);
      setMinStock(medicine.minStock);
      setUnitPrice(medicine.unitPrice);
      setBatchNumber(medicine.batchNumber);
      setExpiryDate(medicine.expiryDate);
      setLocation(medicine.location);
      setDefaultInstructions(medicine.defaultInstructions);
      setWarning(medicine.warning);
    } else {
      setCode(generateNextCode());
      // Default expiry 2 years from now
      const d = new Date();
      d.setFullYear(d.getFullYear() + 2);
      setExpiryDate(d.toISOString().split('T')[0]);
      setBatchNumber(`LOT-${new Date().getFullYear().toString().slice(-2)}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-01`);
    }
  }, [medicine]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!genericName.trim()) {
      setErrorMsg('กรุณาระบุชื่อสามัญทางยา (Generic Name)');
      return;
    }

    const newMed: Medicine = {
      id: medicine?.id || `med-${Date.now()}`,
      code: code.trim(),
      genericName: genericName.trim(),
      tradeName: tradeName.trim() || genericName.trim(),
      dosageForm,
      strength: strength.trim(),
      category,
      unit,
      currentStock: Number(currentStock) || 0,
      minStock: Number(minStock) || 0,
      unitPrice: Number(unitPrice) || 0,
      batchNumber: batchNumber.trim(),
      expiryDate,
      location: location.trim(),
      defaultInstructions: defaultInstructions.trim(),
      warning: warning.trim(),
    };

    onSave(newMed);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
              <Pill className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {medicine ? 'แก้ไขข้อมูลยาในคลัง' : 'เพิ่มรายการยาใหม่เข้าคลัง'}
              </h3>
              <p className="text-xs text-slate-500">จัดการรหัสยา สเปค ขนาดยา และจุดแจ้งเตือนสต๊อก</p>
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-4 py-2.5 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">รหัสยา (Code) *</label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm font-mono font-semibold bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">หมวดหมู่ยา *</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {COMMON_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ตำแหน่งเก็บ/ชั้นวาง</label>
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="เช่น A-01, ตู้เย็น"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ชื่อสามัญทางยา (Generic Name) *
              </label>
              <input
                type="text"
                value={genericName}
                onChange={e => setGenericName(e.target.value)}
                placeholder="เช่น Paracetamol, Amoxicillin"
                required
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ชื่อทางการค้า (Trade / Brand Name)
              </label>
              <input
                type="text"
                value={tradeName}
                onChange={e => setTradeName(e.target.value)}
                placeholder="เช่น Sara, Tylenol, Amoxil"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ขนาดความแรง (Strength)</label>
              <input
                type="text"
                value={strength}
                onChange={e => setStrength(e.target.value)}
                placeholder="เช่น 500 mg, 10 mg/ml"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">รูปแบบยา (Form)</label>
              <select
                value={dosageForm}
                onChange={e => setDosageForm(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {COMMON_DOSAGE_FORMS.map(df => (
                  <option key={df} value={df}>
                    {df}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">หน่วยนับ (Unit)</label>
              <select
                value={unit}
                onChange={e => setUnit(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {COMMON_UNITS.map(u => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                จำนวนคงเหลือปัจจุบัน ({unit})
              </label>
              <input
                type="number"
                min="0"
                value={currentStock}
                onChange={e => setCurrentStock(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono font-bold text-teal-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                จุดสั่งซื้อขั้นต่ำ (Min Stock)
              </label>
              <input
                type="number"
                min="0"
                value={minStock}
                onChange={e => setMinStock(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
              />
              <span className="text-[11px] text-slate-400">เตือนเมื่อยอดน้อยกว่านี้</span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ราคาต่อหน่วย (บาท) <span className="text-slate-400 font-normal">- ไม่จำเป็นต้องใส่</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={unitPrice || ''}
                onChange={e => setUnitPrice(e.target.value === '' ? 0 : Number(e.target.value))}
                placeholder="0.00 (เว้นว่างได้)"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">หมายเลขรุ่นผลิต (Lot No.)</label>
              <input
                type="text"
                value={batchNumber}
                onChange={e => setBatchNumber(e.target.value)}
                placeholder="เช่น LOT-2401"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">วันหมดอายุ (Expiry Date)</label>
              <input
                type="date"
                value={expiryDate}
                onChange={e => setExpiryDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              วิธีใช้ยาเริ่มต้น (Default Instructions)
            </label>
            <input
              type="text"
              value={defaultInstructions}
              onChange={e => setDefaultInstructions(e.target.value)}
              placeholder="เช่น รับประทานครั้งละ 1 เม็ด วันละ 3 ครั้ง หลังอาหาร เช้า กลางวัน เย็น"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              คำเตือน / ข้อควรระวัง (Warning / Caution)
            </label>
            <input
              type="text"
              value={warning}
              onChange={e => setWarning(e.target.value)}
              placeholder="เช่น รับประทานหลังอาหารทันทีและดื่มน้ำตามมากๆ / ไม่ควรทานเกิน 5 วัน"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
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
              {medicine ? 'บันทึกการแก้ไข' : 'เพิ่มรายการยา'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
