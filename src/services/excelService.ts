import * as XLSX from 'xlsx';
import { Patient } from '../types/pharmacy';

export interface ParsedPatientResult {
  validPatients: Patient[];
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
   * Parse an uploaded Excel (.xlsx, .xls, .csv) file into Patient records
   */
  async parsePatientFile(file: File): Promise<ParsedPatientResult> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = e => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });

          // Take first sheet
          const sheetName = workbook.SheetNames[0];
          if (!sheetName) {
            resolve({ validPatients: [], errors: ['ไม่พบแผ่นงาน (Sheet) ในไฟล์ Excel'], totalRows: 0 });
            return;
          }

          const worksheet = workbook.Sheets[sheetName];
          // Parse rows as raw objects
          const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

          if (!rawRows || rawRows.length === 0) {
            resolve({ validPatients: [], errors: ['ไฟล์ไม่มีข้อมูลหรือตารางว่างเปล่า'], totalRows: 0 });
            return;
          }

          const validPatients: Patient[] = [];
          const errors: string[] = [];

          rawRows.forEach((row, index) => {
            const rowNumber = index + 2; // Excel 1-based, with header row = 1

            // Helper to get value matching multiple possible column names
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

            // Read columns
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

            // If fullName was provided instead of separate first/last name
            if ((!firstName || !lastName) && fullName) {
              const parts = fullName.split(/\s+/).filter(Boolean);
              if (parts.length > 0) {
                // Check if first token is a known prefix
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

            // Check minimum requirements: HN and Name
            if (!hn && !firstName) {
              // Ignore empty trailing rows
              return;
            }

            // If HN missing, generate one
            if (!hn) {
              const yr = new Date().getFullYear().toString().slice(-2);
              hn = `HN-${yr}-${(1000 + index).toString()}`;
            }

            if (!firstName) {
              errors.push(`แถวที่ ${rowNumber}: ไม่พบชื่อผู้ป่วย (HN: ${hn})`);
              return;
            }

            // Parse Gender
            let gender: 'male' | 'female' | 'other' = 'male';
            const gLower = genderRaw.toLowerCase();
            if (gLower.includes('หญิง') || gLower.includes('female') || gLower === 'f' || prefix.includes('นาง')) {
              gender = 'female';
            } else if (gLower.includes('ชาย') || gLower.includes('male') || gLower === 'm' || prefix.includes('นาย')) {
              gender = 'male';
            } else if (genderRaw) {
              gender = 'other';
            }

            // Parse Blood Group
            let bloodGroup: 'A' | 'B' | 'AB' | 'O' | 'ไม่ระบุ' = 'ไม่ระบุ';
            const bUpper = bloodGroupRaw.toUpperCase();
            if (bUpper.includes('AB')) bloodGroup = 'AB';
            else if (bUpper.includes('A')) bloodGroup = 'A';
            else if (bUpper.includes('B')) bloodGroup = 'B';
            else if (bUpper.includes('O')) bloodGroup = 'O';

            // Parse Allergies (comma, semicolon, or slash separated)
            const allergies: string[] = allergiesRaw
              ? allergiesRaw
                  .split(/[,;\n\r/|]+/)
                  .map(a => a.trim())
                  .filter(a => a && a !== '-' && a !== 'ไม่มี' && a !== 'ปฏิเสธ')
              : [];

            // Parse Chronic Diseases
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
   * Generates and downloads a pre-formatted Excel template file
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

    // Set column widths for comfortable reading
    worksheet['!cols'] = [
      { wch: 14 }, // HN
      { wch: 10 }, // คำนำหน้า
      { wch: 16 }, // ชื่อ
      { wch: 16 }, // นามสกุล
      { wch: 20 }, // เลขบัตร ปชช
      { wch: 8 },  // อายุ
      { wch: 8 },  // เพศ
      { wch: 10 }, // กรุ๊ปเลือด
      { wch: 28 }, // แพ้ยา
      { wch: 28 }, // โรคประจำตัว
      { wch: 15 }, // เบอร์โทร
      { wch: 24 }, // สิทธิการรักษา
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
