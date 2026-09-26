import React, { useState, useEffect } from 'react';
import { X, UserPlus, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { Patient } from '../types/pharmacy';

interface PatientModalProps {
  patient?: Patient | null; // null if adding new
  existingPatients: Patient[];
  onSave: (patient: Patient) => void;
  onClose: () => void;
}

const COMMON_ALLERGIES = [
  'Penicillin',
  'Amoxicillin',
  'Sulfonamides (ยากลุ่มซัลฟา)',
  'Aspirin',
  'Ibuprofen (NSAIDs)',
  'Paracetamol',
  'Cotrimoxazole',
  'Ciprofloxacin',
];

const COMMON_CHRONIC = [
  'ความดันโลหิตสูง (HT)',
  'เบาหวานชนิดที่ 2 (DM type 2)',
  'ไขมันในเลือดสูง (DLP)',
  'หอบหืด (Asthma)',
  'โรคเกาต์ (Gout)',
  'โรคหัวใจขาดเลือด (CAD)',
  'โรคไตเรื้อรัง (CKD)',
];

export const PatientModal: React.FC<PatientModalProps> = ({
  patient,
  existingPatients,
  onSave,
  onClose,
}) => {
  // Generate next HN automatically if new
  const generateNextHn = () => {
    const currentYearShort = new Date().getFullYear().toString().slice(-2);
    // Find highest index for this year
    let maxNum = 100;
    existingPatients.forEach(p => {
      const match = p.hn.match(/HN-\d+-(\d+)/);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    return `HN-${currentYearShort}-${(maxNum + 1).toString().padStart(5, '0')}`;
  };

  const [hn, setHn] = useState('');
  const [prefix, setPrefix] = useState('นาย');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [idCard, setIdCard] = useState('');
  const [age, setAge] = useState<number>(30);
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [bloodGroup, setBloodGroup] = useState<'A' | 'B' | 'AB' | 'O' | 'ไม่ระบุ'>('O');
  const [allergies, setAllergies] = useState<string[]>([]);
  const [newAllergyInput, setNewAllergyInput] = useState('');
  const [chronicDiseases, setChronicDiseases] = useState<string[]>([]);
  const [newChronicInput, setNewChronicInput] = useState('');
  const [phone, setPhone] = useState('');
  const [coverageScheme, setCoverageScheme] = useState('บัตรทอง (UC)');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (patient) {
      setHn(patient.hn);
      setPrefix(patient.prefix);
      setFirstName(patient.firstName);
      setLastName(patient.lastName);
      setIdCard(patient.idCard);
      setAge(patient.age);
      setGender(patient.gender);
      setBloodGroup(patient.bloodGroup);
      setAllergies([...patient.allergies]);
      setChronicDiseases([...patient.chronicDiseases]);
      setPhone(patient.phone);
      setCoverageScheme(patient.coverageScheme);
    } else {
      setHn(generateNextHn());
    }
  }, [patient]);

  const handleAddAllergy = (name: string) => {
    const trimmed = name.trim();
    if (trimmed && !allergies.includes(trimmed)) {
      setAllergies([...allergies, trimmed]);
      setNewAllergyInput('');
    }
  };

  const handleRemoveAllergy = (name: string) => {
    setAllergies(allergies.filter(a => a !== name));
  };

  const handleAddChronic = (name: string) => {
    const trimmed = name.trim();
    if (trimmed && !chronicDiseases.includes(trimmed)) {
      setChronicDiseases([...chronicDiseases, trimmed]);
      setNewChronicInput('');
    }
  };

  const handleRemoveChronic = (name: string) => {
    setChronicDiseases(chronicDiseases.filter(c => c !== name));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hn.trim()) {
      setErrorMsg('กรุณาระบุเลขประจำตัวผู้ป่วย (HN)');
      return;
    }
    if (!firstName.trim() || !lastName.trim()) {
      setErrorMsg('กรุณากรอกชื่อและนามสกุลผู้ป่วยให้ครบถ้วน');
      return;
    }

    // Check duplicate HN if new patient
    if (!patient) {
      const exists = existingPatients.some(p => p.hn.toLowerCase() === hn.trim().toLowerCase());
      if (exists) {
        setErrorMsg(`เลข HN "${hn}" มีอยู่ในระบบแล้ว กรุณาใช้ HN อื่น`);
        return;
      }
    }

    const updatedPatient: Patient = {
      hn: hn.trim(),
      prefix,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      idCard: idCard.trim(),
      age: Number(age) || 0,
      gender,
      birthDate: patient?.birthDate || new Date().toISOString().split('T')[0],
      bloodGroup,
      allergies,
      chronicDiseases,
      phone: phone.trim(),
      coverageScheme,
      registeredAt: patient?.registeredAt || new Date().toISOString().split('T')[0],
      lastVisit: new Date().toISOString().split('T')[0],
    };

    onSave(updatedPatient);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {patient ? 'แก้ไขข้อมูลผู้ป่วย' : 'ลงทะเบียนผู้ป่วยใหม่ (HN)'}
              </h3>
              <p className="text-xs text-slate-500">บันทึกข้อมูลประจำตัว ประวัติการแพ้ยา และสิทธิการรักษา</p>
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                เลขประจำตัวผู้ป่วย (HN) *
              </label>
              <input
                type="text"
                value={hn}
                onChange={e => setHn(e.target.value)}
                placeholder="เช่น HN-67-00101"
                required
                className="w-full px-3 py-2 text-sm font-mono font-semibold bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">คำนำหน้า *</label>
              <select
                value={prefix}
                onChange={e => setPrefix(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="นาย">นาย</option>
                <option value="นาง">นาง</option>
                <option value="นางสาว">นางสาว</option>
                <option value="ด.ช.">ด.ช.</option>
                <option value="ด.ญ.">ด.ญ.</option>
                <option value="พระ">พระภิกษุ</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">สิทธิการรักษา *</label>
              <select
                value={coverageScheme}
                onChange={e => setCoverageScheme(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="บัตรทอง (UC)">บัตรทอง (UC 30 บาท)</option>
                <option value="ประกันสังคม (SSS)">ประกันสังคม (SSS)</option>
                <option value="ข้าราชการ/เบิกจ่ายตรง (CSMBS)">ข้าราชการ/เบิกจ่ายตรง (CSMBS)</option>
                <option value="ชำระเงินเอง (Cash)">ชำระเงินเอง (Cash)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อจริง *</label>
              <input
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder="เช่น สมชาย"
                required
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">นามสกุล *</label>
              <input
                type="text"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                placeholder="เช่น ใจดี"
                required
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">อายุ (ปี) *</label>
              <input
                type="number"
                min="0"
                max="130"
                value={age}
                onChange={e => setAge(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">เพศ *</label>
              <select
                value={gender}
                onChange={e => setGender(e.target.value as any)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="male">ชาย</option>
                <option value="female">หญิง</option>
                <option value="other">อื่นๆ</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">กรุ๊ปเลือด</label>
              <select
                value={bloodGroup}
                onChange={e => setBloodGroup(e.target.value as any)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="AB">AB</option>
                <option value="O">O</option>
                <option value="ไม่ระบุ">ไม่ระบุ</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">เบอร์โทรศัพท์</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="08X-XXX-XXXX"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              เลขบัตรประชาชน (13 หลัก)
            </label>
            <input
              type="text"
              value={idCard}
              onChange={e => setIdCard(e.target.value)}
              placeholder="X-XXXX-XXXXX-XX-X"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
            />
          </div>

          {/* DRUG ALLERGIES (CRITICAL SAFETY) */}
          <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                ประวัติการแพ้ยา (Drug Allergy) *สำคัญมาก
              </span>
              <span className="text-[11px] text-rose-600">
                {allergies.length === 0 ? 'ปฏิเสธประวัติแพ้ยา' : `มีแพ้ยา ${allergies.length} รายการ`}
              </span>
            </div>

            {/* List of current allergies */}
            <div className="flex flex-wrap gap-1.5 min-h-[28px]">
              {allergies.length === 0 ? (
                <span className="text-xs text-slate-400 italic">ไม่มีข้อมูลการแพ้ยา</span>
              ) : (
                allergies.map(item => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-800 bg-rose-100 border border-rose-300 rounded-md"
                  >
                    <span>{item}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAllergy(item)}
                      className="text-rose-500 hover:text-rose-800"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                ))
              )}
            </div>

            {/* Add allergy custom */}
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={newAllergyInput}
                onChange={e => setNewAllergyInput(e.target.value)}
                placeholder="พิมพ์ชื่อยาที่แพ้ (เช่น Penicillin)..."
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddAllergy(newAllergyInput);
                  }
                }}
                className="flex-1 px-3 py-1.5 text-xs bg-white border border-rose-300 rounded-md focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
              <button
                type="button"
                onClick={() => handleAddAllergy(newAllergyInput)}
                className="px-3 py-1.5 text-xs font-medium text-rose-800 bg-rose-200 hover:bg-rose-300 rounded-md flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                เพิ่ม
              </button>
            </div>

            {/* Suggestions */}
            <div className="text-[11px] text-slate-500 pt-1">
              <span>เลือกจากรายการที่พบบ่อย: </span>
              <div className="flex flex-wrap gap-1 mt-1">
                {COMMON_ALLERGIES.filter(a => !allergies.includes(a)).map(a => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => handleAddAllergy(a)}
                    className="px-2 py-0.5 text-[11px] bg-white border border-slate-200 hover:border-rose-400 hover:text-rose-700 rounded transition-colors"
                  >
                    + {a}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* CHRONIC DISEASES */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">
                โรคประจำตัว (Chronic Diseases)
              </span>
              <span className="text-[11px] text-slate-500">
                {chronicDiseases.length} รายการ
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 min-h-[28px]">
              {chronicDiseases.length === 0 ? (
                <span className="text-xs text-slate-400 italic">ไม่มีโรคประจำตัว</span>
              ) : (
                chronicDiseases.map(item => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-200 rounded-md"
                  >
                    <span>{item}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveChronic(item)}
                      className="text-slate-400 hover:text-slate-700"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                ))
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={newChronicInput}
                onChange={e => setNewChronicInput(e.target.value)}
                placeholder="พิมพ์ชื่อโรคประจำตัว..."
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddChronic(newChronicInput);
                  }
                }}
                className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              <button
                type="button"
                onClick={() => handleAddChronic(newChronicInput)}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-200 hover:bg-slate-300 rounded-md flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                เพิ่ม
              </button>
            </div>

            <div className="text-[11px] text-slate-500 pt-1">
              <div className="flex flex-wrap gap-1">
                {COMMON_CHRONIC.filter(c => !chronicDiseases.includes(c)).map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleAddChronic(c)}
                    className="px-2 py-0.5 text-[11px] bg-white border border-slate-200 hover:border-teal-400 hover:text-teal-700 rounded transition-colors"
                  >
                    + {c}
                  </button>
                ))}
              </div>
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
              {patient ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูลผู้ป่วย'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
