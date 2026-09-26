import { Patient, Medicine, PrescriptionRecord, StockMovement } from '../types/pharmacy';
import { INITIAL_PATIENTS, INITIAL_MEDICINES, INITIAL_PRESCRIPTIONS, INITIAL_MOVEMENTS } from '../data/initialData';

const STORAGE_KEYS = {
  PATIENTS: 'pharmstock_patients_v1',
  MEDICINES: 'pharmstock_medicines_v1',
  PRESCRIPTIONS: 'pharmstock_prescriptions_v1',
  MOVEMENTS: 'pharmstock_movements_v1',
  CLINIC_INFO: 'pharmstock_clinic_info_v1',
};

export interface ClinicInfo {
  hospitalName: string;
  subTitle: string;
  department: string;
  defaultPharmacist: string;
  defaultDoctor: string;
  phone: string;
  address: string;
}

export const DEFAULT_CLINIC_INFO: ClinicInfo = {
  hospitalName: 'โรงพยาบาลส่งเสริมสุขภาพประจำตำบล / คลินิกเวชกรรมชุมชน',
  subTitle: 'ห้องจ่ายยาและคลังยาเวชภัณฑ์ (Pharmacy Department)',
  department: 'ห้องจ่ายยาผู้ป่วยนอก (OPD Pharmacy)',
  defaultPharmacist: 'ภก. วิชัย ธนสารพานิช (ภ.45291)',
  defaultDoctor: 'นพ. สมศักดิ์ กิจเจริญ (ว.58190)',
  phone: '02-555-0199 ต่อ 104',
  address: '128 หมู่ 5 ถ.สุขุมวิท ต.แสนสุข อ.เมือง จ.ชลบุรี 20130',
};

export const storageService = {
  getPatients(): Patient[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PATIENTS);
      return data ? JSON.parse(data) : INITIAL_PATIENTS;
    } catch {
      return INITIAL_PATIENTS;
    }
  },

  savePatients(patients: Patient[]) {
    localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(patients));
  },

  getMedicines(): Medicine[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MEDICINES);
      return data ? JSON.parse(data) : INITIAL_MEDICINES;
    } catch {
      return INITIAL_MEDICINES;
    }
  },

  saveMedicines(medicines: Medicine[]) {
    localStorage.setItem(STORAGE_KEYS.MEDICINES, JSON.stringify(medicines));
  },

  getPrescriptions(): PrescriptionRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PRESCRIPTIONS);
      return data ? JSON.parse(data) : INITIAL_PRESCRIPTIONS;
    } catch {
      return INITIAL_PRESCRIPTIONS;
    }
  },

  savePrescriptions(prescriptions: PrescriptionRecord[]) {
    localStorage.setItem(STORAGE_KEYS.PRESCRIPTIONS, JSON.stringify(prescriptions));
  },

  getMovements(): StockMovement[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MOVEMENTS);
      return data ? JSON.parse(data) : INITIAL_MOVEMENTS;
    } catch {
      return INITIAL_MOVEMENTS;
    }
  },

  saveMovements(movements: StockMovement[]) {
    localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(movements));
  },

  getClinicInfo(): ClinicInfo {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CLINIC_INFO);
      return data ? JSON.parse(data) : DEFAULT_CLINIC_INFO;
    } catch {
      return DEFAULT_CLINIC_INFO;
    }
  },

  saveClinicInfo(info: ClinicInfo) {
    localStorage.setItem(STORAGE_KEYS.CLINIC_INFO, JSON.stringify(info));
  },

  resetAll() {
    localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(INITIAL_PATIENTS));
    localStorage.setItem(STORAGE_KEYS.MEDICINES, JSON.stringify(INITIAL_MEDICINES));
    localStorage.setItem(STORAGE_KEYS.PRESCRIPTIONS, JSON.stringify(INITIAL_PRESCRIPTIONS));
    localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(INITIAL_MOVEMENTS));
    localStorage.setItem(STORAGE_KEYS.CLINIC_INFO, JSON.stringify(DEFAULT_CLINIC_INFO));
  },

  exportAllData() {
    return JSON.stringify(
      {
        patients: this.getPatients(),
        medicines: this.getMedicines(),
        prescriptions: this.getPrescriptions(),
        movements: this.getMovements(),
        clinicInfo: this.getClinicInfo(),
        exportedAt: new Date().toISOString(),
      },
      null,
      2
    );
  },

  importAllData(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (Array.isArray(data.patients) && Array.isArray(data.medicines)) {
        this.savePatients(data.patients);
        this.saveMedicines(data.medicines);
        if (Array.isArray(data.prescriptions)) this.savePrescriptions(data.prescriptions);
        if (Array.isArray(data.movements)) this.saveMovements(data.movements);
        if (data.clinicInfo) this.saveClinicInfo(data.clinicInfo);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }
};
