import * as XLSX from 'xlsx';
import { Patient, Medicine } from '../types/pharmacy';

export interface ParsedPatientResult {
  validPatients: Patient[];
  errors: string[];
  totalRows: number;
}

export interface ParsedMedicineResult {
  validMedicines: Medicine[];
  errors: string[];
  totalRows: number;
}

// Clean and normalize text
const cleanStr = (val: any): string => {
  if (val === null || val === undefined) return '';
  return String(val).trim();
};

export const excelService = {
  /**
   * Parse an uploaded Excel (.xlsx, .xls, .csv) file into Medicine records
   * Notice: Price (ราคายา) is completely OPTIONAL and does not need to be entered!
   */
  async parseMedicineFile(file: File, existingMedicines: Medicine[] = []): Promise<ParsedMedicineResult> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = e => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });

          const sheetName = workbook.SheetNames[0];
          if (!sheetName) {
            resolve({ validMedicines: [], errors: ['ไม่พบแผ่นงาน (Sheet) ในไฟล์ Excel'], totalRows: 0 });
            return;
          }

          const worksheet = workbook.Sheets[sheetName];
          const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

          if (!rawRows || rawRows.length === 0) {
            resolve({ validMedicines: [], errors: ['ไฟล์ไม่มีข้อมูลหรือตารางว่างเปล่า'], totalRows: 0 });
            return;
          }

          const validMedicines: Medicine[] = [];
          const errors: string[] = [];

          // Calculate running max code for autogeneration
          let maxMedCodeNum = 0;
          existingMedicines.forEach(m => {
            const match = m.code.match(/MED-(\d+)/);
            if (match && match[1]) {
              const num = parseInt(match[1], 10);
              if (num > maxMedCodeNum) maxMedCodeNum = num;
            }
          });

          rawRows.forEach((row, index) => {
            const rowNumber = index + 2;

            const getValue = (keys: string[]): string => {
              for (const key of Object.keys(row)) {
                const normalized = key.toLowerCase().replace(/[\s_\-.]/g, '');
                for (const target of keys) {
                  const targetNorm = target.toLowerCase().replace(/[\s_\-.]/g, '');
                  if (normalized === targetNorm || normalized.includes(targetNorm)) {
                    return cleanStr(row[key]);
                  }
                }
              }
              return '';
            };

            let code = getValue(['code', 'รหัสยา', 'รหัส', 'medcode', 'itemcode', 'รหัสเวชภัณฑ์']);
            const genericName = getValue(['genericname', 'ชื่อสามัญ', 'ชื่อยา', 'ชื่อสามัญทางยา', 'generic', 'medicinename', 'drugname']);
            let tradeName = getValue(['tradename', 'ชื่อการค้า', 'ชื่อทางการค้า', 'brand', 'brandname', 'trade', 'ชื่อการค้าbrand']);
            const strength = getValue(['strength', 'ขนาด', 'ความแรง', 'ขนาดความแรง', 'dose', 'dosage']);
            let dosageForm = getValue(['dosageform', 'รูปแบบ', 'รูปแบบยา', 'form', 'dosage_form', 'ชนิดยา']);
            let category = getValue(['category', 'หมวดหมู่', 'หมวดหมู่ยา', 'กลุ่มยา', 'ประเภท']);
            let unit = getValue(['unit', 'หน่วย', 'หน่วยนับ', 'unitname']);
            const stockRaw = getValue(['currentstock', 'stock', 'สต๊อก', 'คงเหลือ', 'จำนวน', 'จำนวนคงเหลือ', 'qty', 'quantity']);
            const minStockRaw = getValue(['minstock', 'เกณฑ์เตือน', 'ขั้นต่ำ', 'min_stock', 'min', 'จุดสั่งซื้อ', 'จุดเตือน']);
            // PRICE IS COMPLETELY OPTIONAL (ไม่ต้องใส่ราคายา)
            const priceRaw = getValue(['unitprice', 'ราคา', 'ราคาต่อหน่วย', 'price', 'ราคายา']);
            let batchNumber = getValue(['batchnumber', 'lot', 'lotno', 'รุ่นผลิต', 'หมายเลขรุ่น', 'batch']);
            let expiryDate = getValue(['expirydate', 'วันหมดอายุ', 'หมดอายุ', 'exp', 'expiry']);
            const location = getValue(['location', 'ชั้นวาง', 'ตำแหน่ง', 'ที่เก็บ', 'shelf', 'ตู้เก็บ']);
            const instructions = getValue(['defaultinstructions', 'วิธีใช้', 'วิธีรับประทาน', 'instructions', 'วิธีใช้ยา']);
            const warning = getValue(['warning', 'คำเตือน', 'ข้อควรระวัง', 'caution']);

            // Ignore row if generic name is missing and no trade name
            if (!genericName && !tradeName) {
              return;
            }

            const chosenGenericName = genericName || tradeName;
            if (!tradeName) tradeName = chosenGenericName;

            // Generate code if missing
            if (!code) {
              maxMedCodeNum++;
              code = `MED-${maxMedCodeNum.toString().padStart(3, '0')}`;
            }

            if (!dosageForm) dosageForm = 'เม็ด';
            if (!unit) unit = 'เม็ด';
            if (!category) category = 'ยาตรวจรักษาทั่วไป';

            // Parse numbers gracefully
            const currentStock = parseFloat(stockRaw) || 0;
            const minStock = parseFloat(minStockRaw) || 20;
            // Unit price is optional (defaults to 0 if not provided or empty)
            const unitPrice = parseFloat(priceRaw) || 0;

            // Default lot and expiry if empty
            if (!batchNumber) {
              const yr = new Date().getFullYear().toString().slice(-2);
              const mo = (new Date().getMonth() + 1).toString().padStart(2, '0');
              batchNumber = `LOT-${yr}${mo}-${(index + 1).toString().padStart(2, '0')}`;
            }

            if (!expiryDate) {
              const exp = new Date();
              exp.setFullYear(exp.getFullYear() + 2);
              expiryDate = exp.toISOString().split('T')[0];
            } else if (expiryDate.includes('/')) {
              // Convert DD/MM/YYYY to YYYY-MM-DD if needed
              const parts = expiryDate.split('/');
              if (parts.length === 3) {
                if (parts[2].length === 4) {
                  expiryDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                }
              }
            }

            const parsedMed: Medicine = {
              id: `med-import-${Date.now()}-${index}`,
              code,
              genericName: chosenGenericName,
              tradeName,
              dosageForm,
              strength: strength || '-',
              category,
              unit,
              currentStock,
              minStock,
              unitPrice, // 0 if omitted
              batchNumber,
              expiryDate,
              location: location || 'คลังยาหลัก',
              defaultInstructions: instructions || 'รับประทานตามแพทย์สั่ง',
              warning: warning || '',
            };

            validMedicines.push(parsedMed);
          });

          resolve({
            validMedicines,
            errors,
            totalRows: rawRows.length,
          });
        } catch (err: any) {
          reject(new Error(`เกิดข้อผิดพลาดในการอ่านไฟล์คลังยา: ${err.message || 'รูปแบบไฟล์ไม่ถูกต้อง'}`));
        }
      };

      reader.onerror = () => {
        reject(new Error('ไม่สามารถอ่านไฟล์ได้'));
      };

      reader.readAsArrayBuffer(file);
    });
  },

  /**
   * Generates and downloads a pre-formatted Excel template for Medicines
   * Note: "ราคายา (ไม่ต้องใส่ก็ได้)"
   */
  downloadMedicineTemplate() {
    const templateData = [
      {
        'รหัสยา': 'MED-101',
        'ชื่อสามัญทางยา (Generic Name)': 'Paracetamol',
        'ชื่อทางการค้า (Trade Name)': 'Sara / Tylenol',
        'ขนาดความแรง': '500 mg',
        'รูปแบบยา': 'เม็ด',
        'หมวดหมู่ยา': 'ยาแก้ปวด/ลดไข้',
        'หน่วยนับ': 'เม็ด',
        'สต๊อกคงเหลือ': 500,
        'เกณฑ์เตือนสต๊อกต่ำ': 100,
        'ราคายา (เว้นว่างได้ ไม่ต้องใส่)': '', // Price is explicitly blank/not needed
        'รุ่นผลิต (Lot No.)': 'LOT-2410-01',
        'วันหมดอายุ (YYYY-MM-DD)': '2028-06-30',
        'ชั้นวาง': 'A-01',
        'วิธีใช้ยาเริ่มต้น': 'รับประทานครั้งละ 1-2 เม็ด ทุก 4-6 ชั่วโมง เมื่อมีไข้',
        'คำเตือน': 'ไม่ควรทานเกิน 8 เม็ดต่อวัน',
      },
      {
        'รหัสยา': 'MED-102',
        'ชื่อสามัญทางยา (Generic Name)': 'Amoxicillin',
        'ชื่อทางการค้า (Trade Name)': 'Amoxil',
        'ขนาดความแรง': '500 mg',
        'รูปแบบยา': 'แคปซูล',
        'หมวดหมู่ยา': 'ยาปฏิชีวนะ (Antibiotics)',
        'หน่วยนับ': 'แคปซูล',
        'สต๊อกคงเหลือ': 200,
        'เกณฑ์เตือนสต๊อกต่ำ': 50,
        'ราคายา (เว้นว่างได้ ไม่ต้องใส่)': '',
        'รุ่นผลิต (Lot No.)': 'LOT-2410-02',
        'วันหมดอายุ (YYYY-MM-DD)': '2027-12-31',
        'ชั้นวาง': 'A-02',
        'วิธีใช้ยาเริ่มต้น': 'รับประทานครั้งละ 1 แคปซูล วันละ 3 ครั้ง ก่อนอาหาร เช้า กลางวัน เย็น',
        'คำเตือน': 'ทานติดต่อกันจนหมดตามแพทย์สั่ง',
      },
      {
        'รหัสยา': 'MED-103',
        'ชื่อสามัญทางยา (Generic Name)': 'Losartan potassium',
        'ชื่อทางการค้า (Trade Name)': 'Cozaar',
        'ขนาดความแรง': '500 mg',
        'รูปแบบยา': 'เม็ด',
        'หมวดหมู่ยา': 'ยาลดความดันโลหิต',
        'หน่วยนับ': 'เม็ด',
        'สต๊อกคงเหลือ': 300,
        'เกณฑ์เตือนสต๊อกต่ำ': 60,
        'ราคายา (เว้นว่างได้ ไม่ต้องใส่)': '',
        'รุ่นผลิต (Lot No.)': 'LOT-2410-03',
        'วันหมดอายุ (YYYY-MM-DD)': '2028-01-15',
        'ชั้นวาง': 'B-01',
        'วิธีใช้ยาเริ่มต้น': 'รับประทานครั้งละ 1 เม็ด วันละ 1 ครั้ง หลังอาหารเช้า',
        'คำเตือน': 'ห้ามหยุดยาเอง',
      },
      {
        'รหัสยา': 'MED-104',
        'ชื่อสามัญทางยา (Generic Name)': 'Cetirizine 2HCl',
        'ชื่อทางการค้า (Trade Name)': 'Zyrtec',
        'ขนาดความแรง': '10 mg',
        'รูปแบบยา': 'เม็ด',
        'หมวดหมู่ยา': 'ยาแก้แพ้/ลดน้ำมูก',
        'หน่วยนับ': 'เม็ด',
        'สต๊อกคงเหลือ': 150,
        'เกณฑ์เตือนสต๊อกต่ำ': 40,
        'ราคายา (เว้นว่างได้ ไม่ต้องใส่)': '',
        'รุ่นผลิต (Lot No.)': 'LOT-2410-04',
        'วันหมดอายุ (YYYY-MM-DD)': '2027-09-30',
        'ชั้นวาง': 'C-01',
        'วิธีใช้ยาเริ่มต้น': 'รับประทานครั้งละ 1 เม็ด วันละ 1 ครั้ง ก่อนนอน',
        'คำเตือน': 'อาจทำให้ง่วงซึม',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);

    worksheet['!cols'] = [
      { wch: 12 }, // รหัสยา
      { wch: 28 }, // Generic Name
      { wch: 22 }, // Trade Name
      { wch: 14 }, // Strength
      { wch: 12 }, // Form
      { wch: 24 }, // Category
      { wch: 10 }, // Unit
      { wch: 14 }, // Stock
      { wch: 16 }, // Min Stock
      { wch: 26 }, // Price (Optional)
      { wch: 16 }, // Lot
      { wch: 22 }, // Exp
      { wch: 12 }, // Shelf
      { wch: 38 }, // Instructions
      { wch: 28 }, // Warning
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'รายการยา');
    XLSX.writeFile(workbook, 'แบบฟอร์มนำเข้าคลังยา_Excel.xlsx');
  },

  /**
   * Export all existing medicines to an Excel spreadsheet
   */
  exportMedicinesToExcel(medicines: Medicine[]) {
    const exportData = medicines.map(m => ({
      รหัสยา: m.code,
      'ชื่อสามัญ (Generic Name)': m.genericName,
      'ชื่อการค้า (Trade Name)': m.tradeName,
      ขนาดความแรง: m.strength,
      รูปแบบยา: m.dosageForm,
      หมวดหมู่: m.category,
      หน่วยนับ: m.unit,
      จำนวนคงเหลือ: m.currentStock,
      เกณฑ์เตือนสต๊อกต่ำ: m.minStock,
      'ราคาต่อหน่วย (บาท)': m.unitPrice > 0 ? m.unitPrice : 'ไม่ระบุ',
      'รุ่นผลิต (Lot No.)': m.batchNumber,
      วันหมดอายุ: m.expiryDate,
      ตำแหน่งชั้นวาง: m.location,
      วิธีใช้ยาเริ่มต้น: m.defaultInstructions,
      คำเตือน: m.warning,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    worksheet['!cols'] = [
      { wch: 12 },
      { wch: 26 },
      { wch: 20 },
      { wch: 14 },
      { wch: 12 },
      { wch: 22 },
      { wch: 10 },
      { wch: 14 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 14 },
      { wch: 14 },
      { wch: 36 },
      { wch: 26 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'คลังยาเวชภัณฑ์');
    XLSX.writeFile(workbook, `คลังยาและสต๊อก_${new Date().toISOString().split('T')[0]}.xlsx`);
  },

  /**
   * Parse an uploaded Excel (.xlsx, .xls, .csv) file into Patient records
   */
  async parsePatientFile(file: File): Promise<ParsedPatientResult> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = e => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });

          const sheetName = workbook.SheetNames[0];
          if (!sheetName) {
            resolve({ validPatients: [], errors: ['ไม่พบแผ่นงาน (Sheet) ในไฟล์ Excel'], totalRows: 0 });
            return;
          }

          const worksheet = workbook.Sheets[sheetName];
          const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

          if (!rawRows || rawRows.length === 0) {
            resolve({ validPatients: [], errors: ['ไฟล์ไม่มีข้อมูลหรือตารางว่างเปล่า'], totalRows: 0 });
            return;
          }

          const validPatients: Patient[] = [];
          const errors: string[] = [];

          rawRows.forEach((row, index) => {
            const rowNumber = index + 2;

            const getValue = (keys: string[]): string => {
              for (const key of Object.keys(row)) {
                const normalized = key.toLowerCase().replace(/[\s_\-.]/g, '');
                for (const target of keys) {
                  const targetNorm = target.toLowerCase().replace(/[\s_\-.]/g, '');
                  if (normalized === targetNorm || normalized.includes(targetNorm)) {
                    return cleanStr(row[key]);
                  }
                }
              }
              return '';
            };

            let hn = getValue(['hn', 'เลขประจำตัวผู้ป่วย', 'รหัสผู้ป่วย', 'hospitalnumber', 'รหัสhn', 'เลขhn']);
            let prefix = getValue(['คำนำหน้า', 'คำนำหน้านาม', 'prefix', 'title']);
            let firstName = getValue(['ชื่อ', 'ชื่อจริง', 'firstname', 'first_name']);
            let lastName = getValue(['นามสกุล', 'lastname', 'last_name', 'surname']);
            const fullName = getValue(['ชื่อสกุล', 'ชื่อนามสกุล', 'fullname', 'full_name']);
            const idCard = getValue(['เลขบัตรประชาชน', 'เลขบัตรปชช', 'เลขประชาชน', 'idcard', 'cid', 'nationalid']);
            const ageRaw = getValue(['อายุ', 'age']);
            const genderRaw = getValue(['เพศ', 'gender', 'sex']);
            const bloodGroupRaw = getValue(['กรุ๊ปเลือด', 'หมู่เลือด', 'blood', 'bloodgroup']);
            const allergiesRaw = getValue(['แพ้ยา', 'ประวัติแพ้ยา', 'drugallergy', 'allergies', 'แพ้ยาอะไรบ้าง']);
            const chronicRaw = getValue(['โรคประจำตัว', 'chronic', 'chronicdiseases', 'โรคเรื้อรัง']);
            const phone = getValue(['เบอร์โทร', 'เบอร์โทรศัพท์', 'phone', 'tel', 'mobile', 'โทรศัพท์']);
            const coverage = getValue(['สิทธิการรักษา', 'สิทธิ', 'coveragescheme', 'coverage', 'scheme', 'สิทธิ์']);

            if ((!firstName || !lastName) && fullName) {
              const parts = fullName.split(/\s+/).filter(Boolean);
              if (parts.length > 0) {
                const knownPrefixes = ['นาย', 'นาง', 'นางสาว', 'ด.ช.', 'ด.ญ.', 'พระ'];
                if (knownPrefixes.includes(parts[0])) {
                  prefix = parts[0];
                  firstName = parts[1] || '';
                  lastName = parts.slice(2).join(' ') || '';
                } else {
                  firstName = parts[0] || '';
                  lastName = parts.slice(1).join(' ') || '';
                }
              }
            }

            if (!hn && !firstName) {
              return;
            }

            if (!hn) {
              const yr = new Date().getFullYear().toString().slice(-2);
              hn = `HN-${yr}-${(1000 + index).toString()}`;
            }

            if (!firstName) {
              errors.push(`แถวที่ ${rowNumber}: ไม่พบชื่อผู้ป่วย (HN: ${hn})`);
              return;
            }

            let gender: 'male' | 'female' | 'other' = 'male';
            const gLower = genderRaw.toLowerCase();
            if (gLower.includes('หญิง') || gLower.includes('female') || gLower === 'f' || prefix.includes('นาง')) {
              gender = 'female';
            } else if (gLower.includes('ชาย') || gLower.includes('male') || gLower === 'm' || prefix.includes('นาย')) {
              gender = 'male';
            } else if (genderRaw) {
              gender = 'other';
            }

            let bloodGroup: 'A' | 'B' | 'AB' | 'O' | 'ไม่ระบุ' = 'ไม่ระบุ';
            const bUpper = bloodGroupRaw.toUpperCase();
            if (bUpper.includes('AB')) bloodGroup = 'AB';
            else if (bUpper.includes('A')) bloodGroup = 'A';
            else if (bUpper.includes('B')) bloodGroup = 'B';
            else if (bUpper.includes('O')) bloodGroup = 'O';

            const allergies: string[] = allergiesRaw
              ? allergiesRaw
                  .split(/[,;\n\r/|]+/)
                  .map(a => a.trim())
                  .filter(a => a && a !== '-' && a !== 'ไม่มี' && a !== 'ปฏิเสธ')
              : [];

            const chronicDiseases: string[] = chronicRaw
              ? chronicRaw
                  .split(/[,;\n\r/|]+/)
                  .map(c => c.trim())
                  .filter(c => c && c !== '-' && c !== 'ไม่มี' && c !== 'ปฏิเสธ')
              : [];

            const parsedPatient: Patient = {
              hn,
              prefix: prefix || (gender === 'female' ? 'นางสาว' : 'นาย'),
              firstName,
              lastName: lastName || '-',
              idCard: idCard || '',
              age: parseInt(ageRaw, 10) || 30,
              gender,
              birthDate: new Date().toISOString().split('T')[0],
              bloodGroup,
              allergies,
              chronicDiseases,
              phone: phone || '',
              coverageScheme: coverage || 'บัตรทอง (UC)',
              registeredAt: new Date().toISOString().split('T')[0],
              lastVisit: new Date().toISOString().split('T')[0],
            };

            validPatients.push(parsedPatient);
          });

          resolve({
            validPatients,
            errors,
            totalRows: rawRows.length,
          });
        } catch (err: any) {
          reject(new Error(`เกิดข้อผิดพลาดในการอ่านไฟล์: ${err.message || 'รูปแบบไฟล์ไม่ถูกต้อง'}`));
        }
      };

      reader.onerror = () => {
        reject(new Error('ไม่สามารถอ่านไฟล์ได้'));
      };

      reader.readAsArrayBuffer(file);
    });
  },

  /**
   * Generates and downloads a pre-formatted Excel template file for Patients
   */
  downloadTemplate() {
    const templateData = [
      {
        HN: 'HN-67-00101',
        คำนำหน้า: 'นาย',
        ชื่อ: 'สมชาย',
        นามสกุล: 'ใจดี',
        เลขบัตรประชาชน: '1-1002-00432-11-2',
        อายุ: 48,
        เพศ: 'ชาย',
        กรุ๊ปเลือด: 'O',
        ประวัติแพ้ยา: 'Penicillin, Amoxicillin',
        โรคประจำตัว: 'ความดันโลหิตสูง (HT), ไขมันในเลือดสูง',
        เบอร์โทร: '081-456-7890',
        สิทธิการรักษา: 'บัตรทอง (UC)',
      },
      {
        HN: 'HN-67-00102',
        คำนำหน้า: 'นางสาว',
        ชื่อ: 'กานดา',
        นามสกุล: 'วิริยะกุล',
        เลขบัตรประชาชน: '3-1015-00219-45-8',
        อายุ: 32,
        เพศ: 'หญิง',
        กรุ๊ปเลือด: 'B',
        ประวัติแพ้ยา: 'Sulfonamides (ยากลุ่มซัลฟา)',
        โรคประจำตัว: 'ภูมิแพ้อากาศ (Allergic Rhinitis)',
        เบอร์โทร: '089-234-5678',
        สิทธิการรักษา: 'ประกันสังคม (SSS)',
      },
      {
        HN: 'HN-67-00103',
        คำนำหน้า: 'นาง',
        ชื่อ: 'อำไพ',
        นามสกุล: 'รักษ์เจริญ',
        เลขบัตรประชาชน: '3-7201-00891-33-4',
        อายุ: 64,
        เพศ: 'หญิง',
        กรุ๊ปเลือด: 'A',
        ประวัติแพ้ยา: 'ไม่มี',
        โรคประจำตัว: 'เบาหวานชนิดที่ 2, ความดันโลหิตสูง',
        เบอร์โทร: '086-778-9901',
        สิทธิการรักษา: 'ข้าราชการ/เบิกจ่ายตรง (CSMBS)',
      },
      {
        HN: 'HN-67-00104',
        คำนำหน้า: 'นาย',
        ชื่อ: 'วีรยุทธ',
        นามสกุล: 'สุขสวัสดิ์',
        เลขบัตรประชาชน: '1-5099-00124-78-9',
        อายุ: 29,
        เพศ: 'ชาย',
        กรุ๊ปเลือด: 'AB',
        ประวัติแพ้ยา: 'Aspirin, Ibuprofen',
        โรคประจำตัว: 'หอบหืด',
        เบอร์โทร: '091-888-2233',
        สิทธิการรักษา: 'ประกันสังคม (SSS)',
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);

    worksheet['!cols'] = [
      { wch: 14 },
      { wch: 10 },
      { wch: 16 },
      { wch: 16 },
      { wch: 20 },
      { wch: 8 },
      { wch: 8 },
      { wch: 10 },
      { wch: 28 },
      { wch: 28 },
      { wch: 15 },
      { wch: 24 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'รายชื่อผู้ป่วย');
    XLSX.writeFile(workbook, 'แบบฟอร์มนำเข้าผู้ป่วย_HN.xlsx');
  },

  /**
   * Export all existing patients to an Excel spreadsheet
   */
  exportPatientsToExcel(patients: Patient[]) {
    const exportData = patients.map(p => ({
      HN: p.hn,
      คำนำหน้า: p.prefix,
      ชื่อ: p.firstName,
      นามสกุล: p.lastName,
      เลขบัตรประชาชน: p.idCard,
      อายุ: p.age,
      เพศ: p.gender === 'male' ? 'ชาย' : p.gender === 'female' ? 'หญิง' : 'อื่นๆ',
      กรุ๊ปเลือด: p.bloodGroup,
      ประวัติแพ้ยา: p.allergies.join(', '),
      โรคประจำตัว: p.chronicDiseases.join(', '),
      เบอร์โทร: p.phone,
      สิทธิการรักษา: p.coverageScheme,
      วันที่ลงทะเบียน: p.registeredAt,
      มาตรวจล่าสุด: p.lastVisit,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    worksheet['!cols'] = [
      { wch: 14 },
      { wch: 10 },
      { wch: 16 },
      { wch: 16 },
      { wch: 20 },
      { wch: 8 },
      { wch: 8 },
      { wch: 10 },
      { wch: 30 },
      { wch: 30 },
      { wch: 15 },
      { wch: 24 },
      { wch: 14 },
      { wch: 14 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ทะเบียนผู้ป่วย');
    XLSX.writeFile(workbook, `รายชื่อผู้ป่วย_HN_${new Date().toISOString().split('T')[0]}.xlsx`);
  }
};

