import React, { useState, useMemo } from 'react';
import {
  Download,
  Upload,
  RefreshCw,
  TrendingDown,
  Calendar,
  AlertTriangle,
  FileSpreadsheet,
  Clock,
  ArrowDownRight,
  ArrowUpRight,
  RotateCcw,
} from 'lucide-react';
import { StockMovement, Medicine, PrescriptionRecord, Patient } from '../types/pharmacy';
import { storageService, ClinicInfo } from '../services/storageService';

interface ReportsViewProps {
  movements: StockMovement[];
  medicines: Medicine[];
  prescriptions: PrescriptionRecord[];
  patients: Patient[];
  clinicInfo: ClinicInfo;
  onDataReloaded: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  movements,
  medicines,
  prescriptions,
  patients,
  clinicInfo,
  onDataReloaded,
}) => {
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Filtered movements
  const filteredMovements = useMemo(() => {
    return movements
      .filter(m => {
        const matchesType = movementTypeFilter === 'all' || m.type === movementTypeFilter;
        const q = searchTerm.toLowerCase().trim();
        const matchesSearch =
          !q ||
          m.medicineName.toLowerCase().includes(q) ||
          m.reference.toLowerCase().includes(q) ||
          (m.patientHn && m.patientHn.toLowerCase().includes(q)) ||
          (m.patientName && m.patientName.toLowerCase().includes(q));

        return matchesType && matchesSearch;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [movements, movementTypeFilter, searchTerm]);

  // Top dispensed medicines
  const topDispensed = useMemo(() => {
    const map: Record<string, { name: string; totalQty: number; count: number }> = {};
    prescriptions.forEach(rx => {
      if (rx.status === 'completed') {
        rx.items.forEach(item => {
          if (!map[item.medicineId]) {
            map[item.medicineId] = {
              name: `${item.genericName} ${item.strength}`,
              totalQty: 0,
              count: 0,
            };
          }
          map[item.medicineId].totalQty += item.quantity;
          map[item.medicineId].count += 1;
        });
      }
    });

    return Object.values(map)
      .sort((a, b) => b.totalQty - a.totalQty)
      .slice(0, 5);
  }, [prescriptions]);

  // Expiring soon medicines (within 6 months)
  const expiringSoon = useMemo(() => {
    const now = new Date();
    const sixMonthsLater = new Date();
    sixMonthsLater.setMonth(now.getMonth() + 6);

    return medicines
      .filter(m => {
        if (!m.expiryDate) return false;
        const exp = new Date(m.expiryDate);
        return exp <= sixMonthsLater;
      })
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
  }, [medicines]);

  // Export movements to CSV
  const handleExportCSV = () => {
    const headers = [
      'Timestamp',
      'Movement Type',
      'Medicine',
      'Quantity Change',
      'Balance Before',
      'Balance After',
      'Reference / Rx',
      'Patient HN',
      'Patient Name',
      'Staff',
      'Note',
    ];

    const rows = filteredMovements.map(m => [
      m.timestamp,
      m.type,
      `"${m.medicineName}"`,
      m.quantity,
      m.balanceBefore,
      m.balanceAfter,
      m.reference,
      m.patientHn || '',
      `"${m.patientName || ''}"`,
      `"${m.performedBy}"`,
      `"${m.note || ''}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `pharmstock_movements_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export full JSON backup
  const handleExportJSON = () => {
    const jsonStr = storageService.exportAllData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `pharmstock_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import JSON backup
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      const success = storageService.importAllData(content);
      if (success) {
        alert('นำเข้าข้อมูลสำรองสำเร็จ!');
        onDataReloaded();
      } else {
        alert('ไฟล์ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบรูปแบบไฟล์ JSON');
      }
    };
    reader.readAsText(file);
  };

  const handleResetData = () => {
    if (window.confirm('คุณต้องการรีเซ็ตข้อมูลทั้งหมดกลับเป็นค่าเริ่มต้นตัวอย่าง (Demo Data) หรือไม่?')) {
      storageService.resetAll();
      onDataReloaded();
    }
  };

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

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Tools */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            สมุดบันทึกการเคลื่อนไหวสต๊อก & รายงานคลัง (Stock Ledger & Reports)
          </h2>
          <p className="text-xs text-slate-500">
            ประวัติการตัดสต๊อกทุกรายการ การรับยาเข้าคลัง ตรวจสอบย้อนหลังได้ทุก Lot และผู้ป่วย
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>ส่งออก CSV</span>
          </button>

          <button
            onClick={handleExportJSON}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Download className="w-4 h-4 text-teal-600" />
            <span>สำรองข้อมูล JSON</span>
          </button>

          <label className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer">
            <Upload className="w-4 h-4 text-blue-600" />
            <span>กู้คืนข้อมูล</span>
            <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
          </label>

          <button
            onClick={handleResetData}
            title="รีเซ็ตเป็นข้อมูลตัวอย่างเริ่มต้น"
            className="px-3 py-2 text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-lg flex items-center gap-1 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>รีเซ็ต Demo</span>
          </button>
        </div>
      </div>

      {/* Two Insights Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Dispensed Meds */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-teal-600" />
            5 อันดับยาที่ถูกตัดสต๊อกจ่ายสูงสุด
          </h3>

          <div className="space-y-2.5">
            {topDispensed.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">ยังไม่มีข้อมูลการจ่ายยา</div>
            ) : (
              topDispensed.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 text-[11px] font-bold font-mono flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-slate-800">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-teal-800">{item.totalQty.toLocaleString()} หน่วย</span>
                    <span className="text-[11px] text-slate-400 ml-1.5">({item.count} ครั้ง)</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Expiring Soon Meds */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            ยาที่ใกล้หมดอายุภายใน 6 เดือน
          </h3>

          <div className="space-y-2.5">
            {expiringSoon.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                ไม่มียาที่ใกล้หมดอายุภายใน 6 เดือนนี้
              </div>
            ) : (
              expiringSoon.map((m, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs p-2 bg-amber-50/60 border border-amber-200 rounded-lg">
                  <div>
                    <div className="font-bold text-slate-900">{m.genericName} {m.strength}</div>
                    <div className="text-[11px] text-slate-500 font-mono">Lot: {m.batchNumber} · ชั้นวาง {m.location}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-rose-700">Exp: {m.expiryDate}</div>
                    <div className="text-[11px] text-slate-500 font-mono">คงเหลือ {m.currentStock} {m.unit}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Stock Movements Audit Ledger Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {/* Table Filter Bar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="ค้นหาชื่อยา, เลขที่ใบสั่งยา, เลข HN หรือชื่อผู้ป่วย..."
              className="w-full pl-3 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">ประเภทการเคลื่อนไหว:</span>
            <select
              value={movementTypeFilter}
              onChange={e => setMovementTypeFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="all">ทั้งหมด ({movements.length})</option>
              <option value="dispense">ตัดจ่ายตาม HN (Dispense)</option>
              <option value="restock">รับยาเข้าคลัง (Restock)</option>
              <option value="cancel_dispense">คืนสต๊อก (Void/Return)</option>
            </select>
          </div>
        </div>

        {/* Movements Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-600 border-b border-slate-200">
                <th className="py-2.5 px-3">วัน-เวลา</th>
                <th className="py-2.5 px-3">ประเภท</th>
                <th className="py-2.5 px-3">รายการยา</th>
                <th className="py-2.5 px-3 text-right">จำนวน</th>
                <th className="py-2.5 px-3 text-right">ก่อน / หลัง</th>
                <th className="py-2.5 px-3 font-mono">อ้างอิง / Rx No</th>
                <th className="py-2.5 px-3">ผู้ป่วย (HN)</th>
                <th className="py-2.5 px-3">ผู้ปฏิบัติงาน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    ไม่พบบันทึกการเคลื่อนไหวสต๊อก
                  </td>
                </tr>
              ) : (
                filteredMovements.map(m => {
                  const isDeduction = m.quantity < 0;
                  const isRestock = m.type === 'restock';
                  const isCancel = m.type === 'cancel_dispense';

                  return (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap font-mono text-[11px]">
                        {formatDate(m.timestamp)}
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {isDeduction && (
                          <span className="inline-flex items-center gap-1 font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded text-[11px]">
                            <ArrowDownRight className="w-3 h-3 text-teal-600" />
                            ตัดจ่ายยา
                          </span>
                        )}
                        {isRestock && (
                          <span className="inline-flex items-center gap-1 font-semibold text-blue-800 bg-blue-50 px-2 py-0.5 rounded text-[11px]">
                            <ArrowUpRight className="w-3 h-3 text-blue-600" />
                            รับเข้าคลัง
                          </span>
                        )}
                        {isCancel && (
                          <span className="inline-flex items-center gap-1 font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded text-[11px]">
                            <RotateCcw className="w-3 h-3 text-amber-600" />
                            คืนสต๊อก
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {m.medicineName}
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        <span className={isDeduction ? 'text-teal-800' : 'text-blue-700'}>
                          {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono text-slate-500 whitespace-nowrap">
                        <span>{m.balanceBefore}</span>
                        <span className="text-slate-300 mx-1">→</span>
                        <strong className="text-slate-900 font-bold">{m.balanceAfter}</strong>
                      </td>

                      <td className="py-2.5 px-3 font-mono text-slate-700 font-medium">
                        {m.reference}
                      </td>

                      <td className="py-2.5 px-3">
                        {m.patientHn ? (
                          <div>
                            <span className="font-mono text-teal-800 font-bold bg-teal-50 px-1 rounded text-[11px]">
                              {m.patientHn}
                            </span>
                            <span className="text-slate-700 ml-1.5">{m.patientName}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">-</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-slate-600 text-[11px] truncate max-w-[120px]">
                        {m.performedBy}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/50 text-xs text-slate-500 flex justify-between items-center">
          <span>แสดง {filteredMovements.length} รายการ</span>
          <span>ระบบบันทึก Audit Trail อัตโนมัติทุกครั้งที่มีการตัดสต๊อกหรือรับเข้า</span>
        </div>
      </div>
    </div>
  );
};
