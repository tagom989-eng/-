import React, { useState, useMemo } from 'react';
import {
  Search,
  User,
  AlertTriangle,
  Plus,
  Trash2,
  CheckCircle2,
  Printer,
  Pill,
  UserPlus,
  ArrowRight,
  ShieldAlert,
  Calendar,
  Clock,
  RefreshCw,
  FileSpreadsheet,
} from 'lucide-react';
import { Patient, Medicine, DispenseItem, PrescriptionRecord, StockMovement } from '../types/pharmacy';
import { ClinicInfo } from '../services/storageService';

interface DispenseViewProps {
  patients: Patient[];
  medicines: Medicine[];
  clinicInfo: ClinicInfo;
  onDispenseSuccess: (
    prescription: PrescriptionRecord,
    updatedMedicines: Medicine[],
    newMovements: StockMovement[]
  ) => void;
  onOpenNewPatientModal: () => void;
  onOpenExcelImportModal?: () => void;
  onOpenPrintModal: (prescription: PrescriptionRecord) => void;
  selectedHnFromOutside?: string;
}

export const DispenseView: React.FC<DispenseViewProps> = ({
  patients,
  medicines,
  clinicInfo,
  onDispenseSuccess,
  onOpenNewPatientModal,
  onOpenExcelImportModal,
  onOpenPrintModal,
  selectedHnFromOutside,
}) => {
  // Step 1: Patient selection
  const [hnInput, setHnInput] = useState(selectedHnFromOutside || '');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(() => {
    if (selectedHnFromOutside) {
      return patients.find(p => p.hn.toLowerCase() === selectedHnFromOutside.toLowerCase()) || null;
    }
    return patients[0] || null; // default to first demo patient for convenience
  });
  const [isHnDropdownOpen, setIsHnDropdownOpen] = useState(false);

  // Sync if selectedHnFromOutside changes
  React.useEffect(() => {
    if (selectedHnFromOutside) {
      const p = patients.find(pt => pt.hn.toLowerCase() === selectedHnFromOutside.toLowerCase());
      if (p) {
        setSelectedPatient(p);
        setHnInput(p.hn);
      }
    }
  }, [selectedHnFromOutside, patients]);

  // Step 2: Medication selection
  const [selectedMedicineId, setSelectedMedicineId] = useState<string>(
    medicines.length > 0 ? medicines[0].id : ''
  );
  const [medicineSearch, setMedicineSearch] = useState('');
  const [quantity, setQuantity] = useState<number>(10);
  const [customInstructions, setCustomInstructions] = useState<string>('');
  const [customWarning, setCustomWarning] = useState<string>('');

  // Cart of items to dispense
  const [cartItems, setCartItems] = useState<DispenseItem[]>([]);

  // Metadata
  const [doctorName, setDoctorName] = useState(clinicInfo.defaultDoctor);
  const [pharmacistName, setPharmacistName] = useState(clinicInfo.defaultPharmacist);
  const [department, setDepartment] = useState(clinicInfo.department);
  const [diagnosis, setDiagnosis] = useState('ตรวจรักษาโรคทั่วไป (General Consultation)');
  const [notes, setNotes] = useState('');

  // Alert & feedback state
  const [formError, setFormError] = useState<string>('');
  const [lastDispensedRx, setLastDispensedRx] = useState<PrescriptionRecord | null>(null);

  // Filter patients by HN or name or phone
  const filteredPatients = useMemo(() => {
    if (!hnInput.trim()) return patients.slice(0, 8);
    const q = hnInput.toLowerCase().trim();
    return patients.filter(
      p =>
        p.hn.toLowerCase().includes(q) ||
        p.firstName.toLowerCase().includes(q) ||
        p.lastName.toLowerCase().includes(q) ||
        p.phone.includes(q) ||
        p.idCard.includes(q)
    );
  }, [patients, hnInput]);

  // Current selected medicine object
  const currentMed = useMemo(() => {
    return medicines.find(m => m.id === selectedMedicineId) || medicines[0];
  }, [medicines, selectedMedicineId]);

  // Update instructions when medicine changes
  React.useEffect(() => {
    if (currentMed) {
      setCustomInstructions(currentMed.defaultInstructions);
      setCustomWarning(currentMed.warning);
    }
  }, [currentMed]);

  // Check if current patient is allergic to current selected medicine
  const allergyConflict = useMemo(() => {
    if (!selectedPatient || !currentMed || selectedPatient.allergies.length === 0) return null;
    const medText = `${currentMed.genericName} ${currentMed.tradeName} ${currentMed.category}`.toLowerCase();
    for (const allergy of selectedPatient.allergies) {
      const allergyLower = allergy.toLowerCase();
      // Match keywords e.g. penicillin, amoxicillin, nsaid, aspirin, sulfa
      if (
        medText.includes(allergyLower) ||
        (allergyLower.includes('penicillin') && (medText.includes('amoxicillin') || medText.includes('augmentin') || medText.includes('ampicillin'))) ||
        (allergyLower.includes('amoxicillin') && (medText.includes('penicillin') || medText.includes('augmentin'))) ||
        (allergyLower.includes('nsaid') && (medText.includes('ibuprofen') || medText.includes('naproxen') || medText.includes('diclofenac'))) ||
        (allergyLower.includes('aspirin') && (medText.includes('ibuprofen') || medText.includes('nsaid'))) ||
        (allergyLower.includes('sulfa') && (medText.includes('cotrimoxazole') || medText.includes('sulfamethoxazole')))
      ) {
        return allergy;
      }
    }
    return null;
  }, [selectedPatient, currentMed]);

  // Available stock in inventory minus what is already in cart
  const availableRemainingStock = useMemo(() => {
    if (!currentMed) return 0;
    const inCartQty = cartItems
      .filter(item => item.medicineId === currentMed.id)
      .reduce((sum, item) => sum + item.quantity, 0);
    return Math.max(0, currentMed.currentStock - inCartQty);
  }, [currentMed, cartItems]);

  // Handle adding medicine to dispense cart
  const handleAddToCart = () => {
    setFormError('');
    if (!currentMed) {
      setFormError('กรุณาเลือกรายการยา');
      return;
    }
    if (quantity <= 0) {
      setFormError('กรุณาระบุจำนวนที่มากกว่า 0');
      return;
    }
    if (quantity > availableRemainingStock) {
      setFormError(
        `สต๊อกคงเหลือไม่เพียงพอ (มีในคลัง ${currentMed.currentStock} ${currentMed.unit}, คงเหลือจ่ายได้อีก ${availableRemainingStock} ${currentMed.unit})`
      );
      return;
    }

    // Check if already in cart
    const existingIndex = cartItems.findIndex(i => i.medicineId === currentMed.id);
    if (existingIndex >= 0) {
      const updated = [...cartItems];
      const newQty = updated[existingIndex].quantity + quantity;
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: newQty,
        totalPrice: newQty * updated[existingIndex].unitPrice,
        instructions: customInstructions,
        warning: customWarning,
      };
      setCartItems(updated);
    } else {
      const newItem: DispenseItem = {
        medicineId: currentMed.id,
        medicineCode: currentMed.code,
        genericName: currentMed.genericName,
        tradeName: currentMed.tradeName,
        dosageForm: currentMed.dosageForm,
        strength: currentMed.strength,
        quantity,
        unit: currentMed.unit,
        unitPrice: currentMed.unitPrice,
        totalPrice: quantity * currentMed.unitPrice,
        batchNumber: currentMed.batchNumber,
        instructions: customInstructions,
        warning: customWarning,
      };
      setCartItems([...cartItems, newItem]);
    }

    // Reset quantity
    setQuantity(10);
  };

  const handleRemoveFromCart = (index: number) => {
    setCartItems(cartItems.filter((_, idx) => idx !== index));
  };

  const totalCartAmount = useMemo(() => {
    return cartItems.reduce((acc, curr) => acc + curr.totalPrice, 0);
  }, [cartItems]);

  const totalCartUnits = useMemo(() => {
    return cartItems.reduce((acc, curr) => acc + curr.quantity, 0);
  }, [cartItems]);

  // Execute Stock Deduction & Dispensing
  const handleConfirmDispense = () => {
    if (!selectedPatient) {
      setFormError('กรุณาเลือกหรือระบุผู้ป่วย (HN)');
      return;
    }
    if (cartItems.length === 0) {
      setFormError('กรุณาเพิ่มรายการยาที่ต้องการจ่ายลงในใบสั่งยาอย่างน้อย 1 รายการ');
      return;
    }

    // Double check stock availability
    for (const item of cartItems) {
      const med = medicines.find(m => m.id === item.medicineId);
      if (!med || med.currentStock < item.quantity) {
        setFormError(
          `ไม่สามารถตัดสต๊อกได้: ยา ${item.genericName} มีสต๊อกคงเหลือไม่พอ (${med ? med.currentStock : 0} ${item.unit})`
        );
        return;
      }
    }

    const timestamp = new Date().toISOString();
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const rxId = `RX-${dateStr}-${randomSuffix}`;

    const newPrescription: PrescriptionRecord = {
      id: rxId,
      dispensedAt: timestamp,
      patientHn: selectedPatient.hn,
      patientName: `${selectedPatient.prefix}${selectedPatient.firstName} ${selectedPatient.lastName}`,
      patientAge: selectedPatient.age,
      patientGender: selectedPatient.gender === 'male' ? 'ชาย' : selectedPatient.gender === 'female' ? 'หญิง' : 'อื่นๆ',
      patientAllergies: selectedPatient.allergies,
      coverageScheme: selectedPatient.coverageScheme,
      doctorName,
      pharmacistName,
      department,
      diagnosis,
      items: cartItems,
      totalAmount: totalCartAmount,
      notes,
      status: 'completed',
    };

    // Calculate updated medicine stocks & audit movements
    const updatedMedicines = medicines.map(med => {
      const dispensed = cartItems.find(item => item.medicineId === med.id);
      if (dispensed) {
        return {
          ...med,
          currentStock: med.currentStock - dispensed.quantity,
        };
      }
      return med;
    });

    const newMovements: StockMovement[] = cartItems.map((item, idx) => {
      const med = medicines.find(m => m.id === item.medicineId)!;
      return {
        id: `mov-${Date.now()}-${idx}`,
        timestamp,
        medicineId: item.medicineId,
        medicineName: `${item.genericName} ${item.strength}`,
        type: 'dispense',
        quantity: -item.quantity,
        balanceBefore: med.currentStock,
        balanceAfter: med.currentStock - item.quantity,
        reference: rxId,
        patientHn: selectedPatient.hn,
        patientName: `${selectedPatient.prefix}${selectedPatient.firstName} ${selectedPatient.lastName}`,
        performedBy: pharmacistName,
        note: `ตัดจ่ายตามใบสั่งยา ${rxId}`,
      };
    });

    // Commit to parent state & storage
    onDispenseSuccess(newPrescription, updatedMedicines, newMovements);
    setLastDispensedRx(newPrescription);
    setCartItems([]);
    setNotes('');
  };

  const handleStartNewDispense = () => {
    setLastDispensedRx(null);
    setCartItems([]);
    setFormError('');
  };

  // Filter medicines for selector
  const searchedMedicines = useMemo(() => {
    if (!medicineSearch.trim()) return medicines;
    const q = medicineSearch.toLowerCase().trim();
    return medicines.filter(
      m =>
        m.genericName.toLowerCase().includes(q) ||
        m.tradeName.toLowerCase().includes(q) ||
        m.code.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q)
    );
  }, [medicines, medicineSearch]);

  return (
    <div className="space-y-6">
      {/* SUCCESS MODAL / BANNER AFTER DISPENSE */}
      {lastDispensedRx && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-emerald-950">
                  ตัดสต๊อกและบันทึกการจ่ายยาสำเร็จเรียบร้อย!
                </h3>
                <p className="text-xs text-emerald-800 mt-0.5">
                  เลขที่ใบสั่งยา: <strong className="font-mono text-emerald-950">{lastDispensedRx.id}</strong> ·
                  ผู้ป่วย: <strong>{lastDispensedRx.patientName}</strong> (HN: {lastDispensedRx.patientHn}) ·
                  ตัดสต๊อกยา {lastDispensedRx.items.length} รายการ
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenPrintModal(lastDispensedRx)}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>พิมพ์สลากยา / ใบรับยา</span>
              </button>
              <button
                type="button"
                onClick={handleStartNewDispense}
                className="px-4 py-2 text-xs sm:text-sm font-medium text-emerald-900 bg-emerald-100 hover:bg-emerald-200 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>ทำรายการใหม่</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 1: PATIENT LOOKUP & PROFILE (HN) */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-teal-600 text-white flex items-center justify-center text-xs font-bold font-mono">
              HN
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                1. ระบุผู้ป่วยที่รับยาผ่านทางเลขประจำตัว (HN)
              </h2>
              <p className="text-xs text-slate-500">
                ค้นหาด้วยเลข HN, ชื่อ-สกุล, หรือเบอร์โทรศัพท์ เพื่อดึงข้อมูลการแพ้ยาและสิทธิ
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {onOpenExcelImportModal && (
              <button
                type="button"
                onClick={onOpenExcelImportModal}
                className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg flex items-center gap-1.5 transition-colors"
                title="นำเข้าไฟล์ Excel รายชื่อผู้ป่วย"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                <span>นำเข้า Excel</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenNewPatientModal}
              className="px-3 py-1.5 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ ลงทะเบียนผู้ป่วยใหม่</span>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* HN Search & Auto-suggest */}
          <div className="relative">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ค้นหาเลข HN หรือ ชื่อผู้ป่วย:
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={hnInput}
                onChange={e => {
                  setHnInput(e.target.value);
                  setIsHnDropdownOpen(true);
                }}
                onFocus={() => setIsHnDropdownOpen(true)}
                placeholder="พิมพ์ HN เช่น HN-67-00101 หรือ ชื่อ เช่น สมชาย, กานดา..."
                className="w-full pl-9 pr-24 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                {patients.length} รายชื่อในระบบ
              </span>
            </div>

            {/* Dropdown list */}
            {isHnDropdownOpen && filteredPatients.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto divide-y divide-slate-100">
                {filteredPatients.map(p => (
                  <button
                    key={p.hn}
                    type="button"
                    onClick={() => {
                      setSelectedPatient(p);
                      setHnInput(p.hn);
                      setIsHnDropdownOpen(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-xs hover:bg-teal-50 transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <span className="font-mono text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded text-[11px] group-hover:bg-teal-200">
                          {p.hn}
                        </span>
                        <span>{p.prefix}{p.firstName} {p.lastName}</span>
                        <span className="text-slate-400 font-normal">
                          (อายุ {p.age} ปี · {p.coverageScheme})
                        </span>
                      </div>
                      {p.allergies.length > 0 && (
                        <div className="text-[11px] text-rose-600 mt-0.5 flex items-center gap-1 font-medium">
                          <AlertTriangle className="w-3 h-3" />
                          <span>แพ้ยา: {p.allergies.join(', ')}</span>
                        </div>
                      )}
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-teal-600 transition-colors" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Demo Patients Selection Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs pt-1">
            <span className="text-slate-500 text-[11px] font-medium">ตัวอย่างผู้ป่วยทดสอบ (คลิกเพื่อเลือกทันที):</span>
            {patients.slice(0, 5).map(p => (
              <button
                key={p.hn}
                type="button"
                onClick={() => {
                  setSelectedPatient(p);
                  setHnInput(p.hn);
                  setIsHnDropdownOpen(false);
                }}
                className={`px-2.5 py-1 rounded text-xs transition-colors flex items-center gap-1 ${
                  selectedPatient?.hn === p.hn
                    ? 'bg-teal-700 text-white font-semibold'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span className="font-mono font-medium">{p.hn}</span>
                <span>{p.firstName}</span>
                {p.allergies.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-rose-500" title={`แพ้ยา: ${p.allergies.join(', ')}`} />
                )}
              </button>
            ))}
          </div>

          {/* SELECTED PATIENT SUMMARY BANNER */}
          {selectedPatient ? (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold font-mono text-teal-800 bg-white px-2 py-0.5 rounded border border-teal-200">
                        {selectedPatient.hn}
                      </span>
                      <h3 className="text-base font-bold text-slate-900">
                        {selectedPatient.prefix}{selectedPatient.firstName} {selectedPatient.lastName}
                      </h3>
                      <span className="text-xs text-slate-500">
                        (เพศ{selectedPatient.gender === 'male' ? 'ชาย' : 'หญิง'} · อายุ {selectedPatient.age} ปี)
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-600 mt-1 flex-wrap">
                      <span>เลข ปชช: <strong className="font-mono">{selectedPatient.idCard || '-'}</strong></span>
                      <span>·</span>
                      <span>กรุ๊ปเลือด: <strong>{selectedPatient.bloodGroup}</strong></span>
                      <span>·</span>
                      <span>สิทธิ: <strong className="text-slate-800">{selectedPatient.coverageScheme}</strong></span>
                      <span>·</span>
                      <span>โทร: <strong className="font-mono">{selectedPatient.phone || '-'}</strong></span>
                    </div>

                    {selectedPatient.chronicDiseases.length > 0 && (
                      <div className="text-xs text-slate-500 mt-1">
                        <span>โรคประจำตัว: </span>
                        <span className="text-slate-700 font-medium">
                          {selectedPatient.chronicDiseases.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-[11px] text-slate-400">มาตรวจล่าสุด: {selectedPatient.lastVisit}</div>
                  <span className="inline-block mt-1 text-xs text-teal-700 font-semibold bg-white px-2 py-1 rounded border border-teal-100">
                    พร้อมสั่งจ่ายยา
                  </span>
                </div>
              </div>

              {/* DRUG ALLERGY WARNING (HIGH PRIORITY SAFETY) */}
              {selectedPatient.allergies.length > 0 ? (
                <div className="mt-3 p-3 bg-rose-50 border border-rose-300 rounded-lg flex items-start gap-2 text-rose-900">
                  <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-rose-700">
                      แจ้งเตือนความปลอดภัย: ผู้ป่วยมีประวัติการแพ้ยา (Drug Allergies)
                    </div>
                    <div className="text-xs font-semibold text-rose-950 mt-0.5 flex flex-wrap gap-1.5">
                      {selectedPatient.allergies.map(a => (
                        <span key={a} className="bg-rose-200/80 px-2 py-0.5 rounded text-rose-900 font-bold">
                          ⚠️ {a}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-2 text-xs text-slate-500 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>ผู้ป่วยปฏิเสธประวัติการแพ้ยา (No Known Drug Allergies)</span>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>กรุณาค้นหาหรือเลือกผู้ป่วยด้านบนก่อนดำเนินการตัดสต๊อกยา</span>
            </div>
          )}
        </div>
      </div>

      {/* STEP 2: SELECT MEDICATION & CONFIGURE DISPENSE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Medicine Picker Form */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-teal-600 text-white flex items-center justify-center text-xs font-bold">
                <Pill className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-900">
                2. เลือกยาจากคลังและกำหนดจำนวนตัดสต๊อก
              </h2>
            </div>
            <span className="text-xs text-slate-500">
              คลังยาพร้อมจ่าย {medicines.length} รายการ
            </span>
          </div>

          <div className="p-6 space-y-4 flex-1">
            {formError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs px-4 py-2.5 rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Quick medicine search / filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ค้นหาและเลือกยา:
              </label>
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={medicineSearch}
                  onChange={e => setMedicineSearch(e.target.value)}
                  placeholder="พิมพ์ค้นหาชื่อยา เช่น Paracetamol, Amoxicillin, Losartan..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <select
                value={selectedMedicineId}
                onChange={e => setSelectedMedicineId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {searchedMedicines.map(m => (
                  <option key={m.id} value={m.id}>
                    [{m.code}] {m.genericName} {m.strength} ({m.tradeName}) - สต๊อกคงเหลือ {m.currentStock} {m.unit} (฿{m.unitPrice.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            {/* ALLERGY WARNING POPUP IF CHOSEN DRUG MATCHES PATIENT ALLERGY */}
            {allergyConflict && (
              <div className="p-4 bg-rose-100 border-2 border-rose-400 rounded-lg text-rose-950 animate-pulse">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="w-6 h-6 text-rose-700 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wide">
                      🚨 ตรวจพบการแพ้ยาที่อาจเป็นอันตรายถึงชีวิต!
                    </h4>
                    <p className="text-xs mt-1">
                      ผู้ป่วย <strong>{selectedPatient?.firstName}</strong> มีประวัติแพ้ยาในกลุ่ม: <strong>"{allergyConflict}"</strong>
                      <br />
                      ยานี้คือ <strong>{currentMed?.genericName} ({currentMed?.tradeName})</strong> ซึ่งอยู่ในกลุ่มยาที่ผู้ป่วยแพ้!
                    </p>
                    <p className="text-[11px] text-rose-800 mt-1 font-semibold">
                      ⚠️ แนะนำให้ปรึกษาแพทย์ผู้สั่งเพื่อเปลี่ยนยากลุ่มอื่นที่ปลอดภัย
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Medicine Details Card */}
            {currentMed && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-mono font-bold text-slate-500">{currentMed.code}</span>
                    <h3 className="text-base font-bold text-slate-900">
                      {currentMed.genericName} {currentMed.strength}
                    </h3>
                    <div className="text-xs text-slate-600">
                      ชื่อการค้า: {currentMed.tradeName} · หมวดหมู่: {currentMed.category}
                    </div>
                  </div>

                  {/* Stock balance indicator */}
                  <div className="text-right">
                    <span className="text-xs text-slate-500">สต๊อกในคลัง</span>
                    <div
                      className={`text-lg font-bold font-mono ${
                        currentMed.currentStock <= currentMed.minStock
                          ? 'text-rose-600'
                          : 'text-teal-800'
                      }`}
                    >
                      {currentMed.currentStock} {currentMed.unit}
                    </div>
                    {currentMed.currentStock <= currentMed.minStock && (
                      <span className="text-[10px] text-rose-600 font-semibold block">
                        (ใกล้หมดสต๊อก เกณฑ์ {currentMed.minStock})
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t border-slate-200 text-slate-600">
                  <div>
                    <span className="text-slate-400">Lot No: </span>
                    <span className="font-mono font-medium">{currentMed.batchNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">วันหมดอายุ: </span>
                    <span className="font-mono font-medium">{currentMed.expiryDate}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400">ราคา: </span>
                    <span className="font-mono font-semibold text-slate-800">฿{currentMed.unitPrice.toFixed(2)}/{currentMed.unit}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Quantity and Action to add */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  จำนวนตัดสต๊อกจ่าย ({currentMed?.unit || 'หน่วย'}) *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max={availableRemainingStock}
                    value={quantity}
                    onChange={e => setQuantity(Number(e.target.value))}
                    className="w-full px-3 py-2 text-base font-bold font-mono text-teal-800 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <div className="text-xs text-slate-500 whitespace-nowrap">
                    คงเหลือจ่ายได้: <strong className="font-mono text-slate-800">{availableRemainingStock}</strong>
                  </div>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เลือกด่วนตามวัน:
                </label>
                <div className="grid grid-cols-4 gap-1">
                  {[7, 14, 21, 30].map(days => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setQuantity(days)}
                      disabled={days > availableRemainingStock}
                      className="px-2 py-2 text-xs font-mono font-medium bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 text-slate-800 rounded transition-colors"
                    >
                      {days} วัน
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Custom Instructions (วิธีใช้ยา) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                วิธีใช้ยา (แสดงบนสลากยา):
              </label>
              <textarea
                rows={2}
                value={customInstructions}
                onChange={e => setCustomInstructions(e.target.value)}
                placeholder="ระบุวิธีรับประทานหรือใช้งาน..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Custom Warning */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                คำเตือน / ข้อควรระวัง:
              </label>
              <input
                type="text"
                value={customWarning}
                onChange={e => setCustomWarning(e.target.value)}
                placeholder="เช่น รับประทานหลังอาหารทันที / ทานให้ครบขนาด"
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Add to Prescription List button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={availableRemainingStock <= 0}
                className="w-full py-2.5 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 rounded-lg flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>
                  เพิ่มรายการยานี้ลงใบสั่งยา ({quantity} {currentMed?.unit})
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Prescription Cart & Deduction Execution */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-teal-600 text-white flex items-center justify-center text-xs font-bold font-mono">
                Rx
              </div>
              <h2 className="text-sm font-bold text-slate-900">
                3. สรุปรายการยาที่จะตัดสต๊อก
              </h2>
            </div>
            <span className="text-xs font-bold font-mono text-teal-800 bg-teal-50 px-2 py-0.5 rounded">
              {cartItems.length} รายการ
            </span>
          </div>

          <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
            {/* List of items in cart */}
            {cartItems.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-lg">
                <Pill className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <span>ยังไม่มีรายการยาในใบสั่งนี้</span>
                <p className="text-[11px] text-slate-400 mt-1">
                  เลือกยาจากกล่องด้านซ้ายแล้วกดปุ่ม "เพิ่มรายการยา"
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                {cartItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1 relative group"
                  >
                    <div className="flex justify-between items-start">
                      <div className="font-bold text-slate-900 pr-6">
                        {idx + 1}. {item.genericName} {item.strength}
                        {item.tradeName && item.tradeName !== item.genericName && (
                          <span className="text-slate-500 font-normal ml-1">
                            ({item.tradeName})
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFromCart(idx)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                        title="ลบรายการนี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-[11px] text-slate-600 line-clamp-1">
                      {item.instructions}
                    </div>

                    <div className="flex justify-between items-center pt-1 border-t border-slate-200 text-slate-600">
                      <div>
                        ตัดสต๊อก: <strong className="font-mono text-teal-800 font-bold">{item.quantity}</strong> {item.unit}
                        <span className="mx-1 text-slate-300">·</span>
                        <span className="text-[10px] text-slate-400 font-mono">Lot: {item.batchNumber}</span>
                      </div>
                      <div className="font-mono font-semibold text-slate-900">
                        ฿{item.totalPrice.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Prescriber & Metadata Inputs */}
            <div className="pt-2 border-t border-slate-200 space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                    แพทย์ผู้สั่งยา
                  </label>
                  <input
                    type="text"
                    value={doctorName}
                    onChange={e => setDoctorName(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                    เภสัชกรผู้ตัดจ่าย
                  </label>
                  <input
                    type="text"
                    value={pharmacistName}
                    onChange={e => setPharmacistName(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                  การวินิจฉัย / โรค
                </label>
                <input
                  type="text"
                  value={diagnosis}
                  onChange={e => setDiagnosis(e.target.value)}
                  placeholder="เช่น URI, ความดันโลหิตสูง, ปวดศีรษะ"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Cart Summary & Confirm Button */}
            <div className="pt-3 border-t border-slate-200 space-y-3">
              <div className="flex justify-between items-baseline text-xs text-slate-600">
                <span>จำนวนยาที่ตัดจ่ายทั้งหมด:</span>
                <span className="font-mono font-bold text-slate-900">
                  {cartItems.length} รายการ ({totalCartUnits} หน่วย)
                </span>
              </div>

              <div className="flex justify-between items-baseline text-sm font-bold text-slate-900">
                <span>มูลค่ารวมทั้งสิ้น:</span>
                <span className="font-mono text-lg text-teal-800">
                  ฿{totalCartAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <button
                type="button"
                onClick={handleConfirmDispense}
                disabled={cartItems.length === 0 || !selectedPatient}
                className="w-full py-3 text-sm font-bold text-white bg-teal-700 hover:bg-teal-800 active:bg-teal-900 disabled:bg-slate-300 rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>ยืนยันตัดสต๊อกยาและจ่ายยา</span>
              </button>
              <p className="text-[11px] text-center text-slate-400">
                * เมื่อกดยืนยัน สต๊อกยาในระบบจะถูกหักออกทันที และบันทึกประวัติเข้าสู่ HN ของผู้ป่วย
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
