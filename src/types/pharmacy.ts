export interface Patient {
  hn: string; // e.g. "HN-67-00101"
  prefix: string; // "นาย", "นาง", "นางสาว", "ด.ช.", "ด.ญ."
  firstName: string;
  lastName: string;
  idCard: string; // 13-digit Thai national ID
  age: number;
  gender: 'male' | 'female' | 'other';
  birthDate: string;
  bloodGroup: 'A' | 'B' | 'AB' | 'O' | 'ไม่ระบุ';
  allergies: string[]; // List of allergic drug names or categories
  chronicDiseases: string[];
  phone: string;
  coverageScheme: string; // สิทธิการรักษา: บัตรทอง, ประกันสังคม, ข้าราชการ, ชำระเงินเอง
  registeredAt: string;
  lastVisit: string;
}

export interface Medicine {
  id: string;
  code: string; // e.g. "MED-001"
  genericName: string; // e.g. "Paracetamol"
  tradeName: string; // e.g. "Sara"
  dosageForm: string; // "เม็ด", "แคปซูล", "ยาน้ำ", "ครีม", "ยาพ่น", "หลอด"
  strength: string; // e.g. "500 mg", "10 mg", "125 mg/5 mL"
  category: string; // e.g. "ยาแก้ปวด/ลดไข้", "ยาปฏิชีวนะ", "ยาลดความดัน", "ยาเบาหวาน", "ยาลดไขมัน"
  unit: string; // e.g. "เม็ด", "แคปซูล", "ขวด", "แผง", "หลอด"
  currentStock: number;
  minStock: number; // Low stock threshold
  unitPrice?: number; // Optional price in THB
  batchNumber: string; // Lot No.
  expiryDate: string; // YYYY-MM-DD
  location: string; // Storage shelf e.g. "A-01", "ตู้เย็น 2-8°C"
  defaultInstructions: string; // e.g. "รับประทานครั้งละ 1 เม็ด วันละ 3 ครั้ง หลังอาหาร เช้า กลางวัน เย็น"
  warning: string; // e.g. "ไม่ควรรับประทานติดต่อกันเกิน 5 วัน", "ทานให้หมดแผงแม้หายดีแล้ว"
}

export interface DispenseItem {
  medicineId: string;
  medicineCode: string;
  genericName: string;
  tradeName: string;
  dosageForm: string;
  strength: string;
  quantity: number;
  unit: string;
  unitPrice?: number;
  totalPrice?: number;
  batchNumber: string;
  instructions: string;
  warning: string;
}

export interface PrescriptionRecord {
  id: string; // e.g. "RX-670926-001"
  dispensedAt: string;
  patientHn: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  patientAllergies: string[];
  coverageScheme: string;
  doctorName: string;
  pharmacistName: string;
  department: string;
  diagnosis: string;
  items: DispenseItem[];
  totalAmount?: number;
  notes?: string;
  status: 'completed' | 'cancelled';
  cancelledAt?: string;
  cancelReason?: string;
}

export interface StockMovement {
  id: string;
  timestamp: string;
  medicineId: string;
  medicineName: string;
  type: 'dispense' | 'restock' | 'adjust' | 'cancel_dispense';
  quantity: number; // positive for addition, negative for deduction
  balanceBefore: number;
  balanceAfter: number;
  reference: string; // e.g. "RX-670926-001" or "PO-8812"
  patientHn?: string;
  patientName?: string;
  performedBy: string;
  note?: string;
}
