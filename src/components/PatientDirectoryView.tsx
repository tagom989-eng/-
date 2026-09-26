import React, { useState, useMemo } from 'react';
import {
  Search,
  UserPlus,
  User,
  AlertTriangle,
  FileText,
  Phone,
  Activity,
  Edit2,
  Trash2,
  Calendar,
  CreditCard,
  History,
  FileSpreadsheet,
  Upload,
  Download,
} from 'lucide-react';
import { Patient, PrescriptionRecord } from '../types/pharmacy';
import { excelService } from '../services/excelService';

interface PatientDirectoryViewProps {
  patients: Patient[];
  prescriptions: PrescriptionRecord[];
  onOpenNewPatientModal: () => void;
  onOpenEditPatientModal: (patient: Patient) => void;
  onOpenExcelImportModal: () => void;
  onDeletePatient: (hn: string) => void;
  onSelectPatientToDispense: (hn: string) => void;
  onOpenPrintModal: (rx: PrescriptionRecord) => void;
}

export const PatientDirectoryView: React.FC<PatientDirectoryViewProps> = ({
  patients,
  prescriptions,
  onOpenNewPatientModal,
  onOpenEditPatientModal,
  onOpenExcelImportModal,
  onDeletePatient,
  onSelectPatientToDispense,
  onOpenPrintModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [coverageFilter, setCoverageFilter] = useState('all');
  const [allergyFilter, setAllergyFilter] = useState<'all' | 'has_allergy' | 'no_allergy'>('all');
  const [selectedPatientForHistory, setSelectedPatientForHistory] = useState<Patient | null>(null);

  // Filtered patients
  const filteredPatients = useMemo(() => {
    return patients.filter(p => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.hn.toLowerCase().includes(q) ||
        p.firstName.toLowerCase().includes(q) ||
        p.lastName.toLowerCase().includes(q) ||
        p.idCard.includes(q) ||
        p.phone.includes(q);

      const matchesCoverage = coverageFilter === 'all' || p.coverageScheme.includes(coverageFilter);

      let matchesAllergy = true;
      if (allergyFilter === 'has_allergy') matchesAllergy = p.allergies.length > 0;
      if (allergyFilter === 'no_allergy') matchesAllergy = p.allergies.length === 0;

      return matchesSearch && matchesCoverage && matchesAllergy;
    });
  }, [patients, searchTerm, coverageFilter, allergyFilter]);

  // History for selected patient in drawer/modal
  const patientPrescriptions = useMemo(() => {
    if (!selectedPatientForHistory) return [];
    return prescriptions.filter(rx => rx.patientHn === selectedPatientForHistory.hn);
  }, [prescriptions, selectedPatientForHistory]);

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            ทะเบียนประวัติผู้ป่วย (Patient Directory & HN Records)
          </h2>
          <p className="text-xs text-slate-500">
            ฐานข้อมูลผู้ป่วย เลขประจำตัว HN ประวัติการแพ้ยา และประวัติการรับยาทั้งหมด
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* EXCEL IMPORT BUTTON */}
          <button
            type="button"
            onClick={onOpenExcelImportModal}
            className="px-3.5 py-2 text-xs sm:text-sm font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>นำเข้าข้อมูลจาก Excel (.xlsx)</span>
          </button>

          {/* EXCEL EXPORT BUTTON */}
          <button
            type="button"
            onClick={() => excelService.exportPatientsToExcel(patients)}
            className="px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center gap-1.5 transition-colors"
            title="ส่งออกรายชื่อผู้ป่วยทั้งหมดเป็นไฟล์ Excel"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>ส่งออก Excel</span>
          </button>

          {/* MANUAL ADD NEW PATIENT */}
          <button
            type="button"
            onClick={onOpenNewPatientModal}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ ลงทะเบียนผู้ป่วยใหม่ (HN)</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-6 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="ค้นหาเลข HN, ชื่อผู้ป่วย, เบอร์โทร, เลขบัตรประชาชน..."
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono"
          />
        </div>

        <div className="sm:col-span-3">
          <select
            value={coverageFilter}
            onChange={e => setCoverageFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="all">ทุกสิทธิการรักษา</option>
            <option value="บัตรทอง">บัตรทอง (UC)</option>
            <option value="ประกันสังคม">ประกันสังคม (SSS)</option>
            <option value="ข้าราชการ">ข้าราชการ/เบิกจ่ายตรง</option>
            <option value="ชำระเงินเอง">ชำระเงินเอง (Cash)</option>
          </select>
        </div>

        <div className="sm:col-span-3">
          <select
            value={allergyFilter}
            onChange={e => setAllergyFilter(e.target.value as any)}
            className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="all">ประวัติแพ้ยาทั้งหมด</option>
            <option value="has_allergy">⚠️ เฉพาะที่มีประวัติแพ้ยา</option>
            <option value="no_allergy">✅ ไม่พบประวัติแพ้ยา</option>
          </select>
        </div>
      </div>

      {/* Patients Grid / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPatients.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 bg-white border border-slate-200 rounded-xl">
            <User className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm">ไม่พบข้อมูลผู้ป่วยที่ตรงกับการค้นหา</p>
          </div>
        ) : (
          filteredPatients.map(patient => {
            const rxCount = prescriptions.filter(rx => rx.patientHn === patient.hn).length;

            return (
              <div
                key={patient.hn}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-teal-300 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top: HN and Scheme */}
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      {patient.hn}
                    </span>
                    <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-medium">
                      {patient.coverageScheme}
                    </span>
                  </div>

                  {/* Name & Basic Info */}
                  <h3 className="text-base font-bold text-slate-900">
                    {patient.prefix}{patient.firstName} {patient.lastName}
                  </h3>
                  <div className="text-xs text-slate-500 mt-0.5">
                    อายุ {patient.age} ปี · เพศ{patient.gender === 'male' ? 'ชาย' : 'หญิง'} · กรุ๊ปเลือด {patient.bloodGroup}
                  </div>

                  <div className="text-xs text-slate-500 mt-2 space-y-1 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono">{patient.idCard || '-'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono">{patient.phone || '-'}</span>
                    </div>
                  </div>

                  {/* ALLERGIES BADGE */}
                  <div className="mt-3">
                    {patient.allergies.length > 0 ? (
                      <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs">
                        <div className="font-bold flex items-center gap-1 text-rose-700 text-[11px]">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          <span>แพ้ยา:</span>
                        </div>
                        <div className="mt-0.5 font-medium line-clamp-2">
                          {patient.allergies.join(', ')}
                        </div>
                      </div>
                    ) : (
                      <div className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                        ✓ ปฏิเสธประวัติแพ้ยา
                      </div>
                    )}
                  </div>

                  {/* Chronic illnesses */}
                  {patient.chronicDiseases.length > 0 && (
                    <div className="mt-2 text-[11px] text-slate-600">
                      <span className="text-slate-400">โรคประจำตัว: </span>
                      <span>{patient.chronicDiseases.join(', ')}</span>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setSelectedPatientForHistory(patient)}
                      title={`ดูประวัติการรับยา (${rxCount} ครั้ง)`}
                      className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg flex items-center gap-1 transition-colors"
                    >
                      <History className="w-3.5 h-3.5 text-slate-500" />
                      <span>ประวัติ ({rxCount})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenEditPatientModal(patient)}
                      title="แก้ไขข้อมูลผู้ป่วย"
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`ต้องการลบข้อมูลผู้ป่วย "${patient.firstName} ${patient.lastName}" (${patient.hn}) ใช่หรือไม่?`)) {
                          onDeletePatient(patient.hn);
                        }
                      }}
                      title="ลบข้อมูลผู้ป่วย"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* PRIMARY ACTION: DISPENSE TO THIS PATIENT */}
                  <button
                    type="button"
                    onClick={() => onSelectPatientToDispense(patient.hn)}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 rounded-lg flex items-center gap-1 shadow-xs transition-colors whitespace-nowrap"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>จ่ายยา HN นี้</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* PATIENT PRESCRIPTION HISTORY MODAL */}
      {selectedPatientForHistory && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    ประวัติการรับยา: {selectedPatientForHistory.prefix}{selectedPatientForHistory.firstName} {selectedPatientForHistory.lastName}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    HN: {selectedPatientForHistory.hn} · สิทธิ: {selectedPatientForHistory.coverageScheme}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPatientForHistory(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                ปิดหน้าต่าง
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {patientPrescriptions.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  ยังไม่มีประวัติการตัดสต๊อกจ่ายยาให้ผู้ป่วยรายนี้
                </div>
              ) : (
                patientPrescriptions.map(rx => (
                  <div
                    key={rx.id}
                    className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2"
                  >
                    <div className="flex justify-between items-start border-b border-slate-200 pb-2">
                      <div>
                        <span className="font-mono font-bold text-slate-900 text-sm">{rx.id}</span>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          วันที่: {formatDate(rx.dispensedAt)} · แพทย์: {rx.doctorName} · เภสัชกร: {rx.pharmacistName}
                        </div>
                      </div>

                      <div className="text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPatientForHistory(null);
                            onOpenPrintModal(rx);
                          }}
                          className="px-2.5 py-1 text-xs font-medium text-teal-700 bg-white border border-teal-200 hover:bg-teal-50 rounded-md transition-colors"
                        >
                          พิมพ์สลาก/ใบเสร็จ
                        </button>
                        <div className="font-mono font-bold text-slate-900 mt-1">
                          ฿{rx.totalAmount.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Prescribed Items */}
                    <div className="divide-y divide-slate-100">
                      {rx.items.map((item, i) => (
                        <div key={i} className="py-1.5 flex justify-between items-center text-xs">
                          <div>
                            <span className="font-semibold text-slate-800">
                              {item.genericName} {item.strength}
                            </span>
                            <span className="text-[11px] text-slate-500 ml-2">
                              {item.instructions}
                            </span>
                          </div>
                          <div className="font-mono text-slate-700">
                            {item.quantity} {item.unit}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  const hn = selectedPatientForHistory.hn;
                  setSelectedPatientForHistory(null);
                  onSelectPatientToDispense(hn);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Activity className="w-4 h-4" />
                <span>เปิดหน้าตัดสต๊อกจ่ายยาให้ผู้ป่วยรายนี้</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
