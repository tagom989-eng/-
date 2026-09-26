import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  PackagePlus,
  AlertTriangle,
  Calendar,
  MapPin,
  Edit2,
  Trash2,
  ArrowUpDown,
  Filter,
  FileSpreadsheet,
  Download,
} from 'lucide-react';
import { Medicine } from '../types/pharmacy';
import { excelService } from '../services/excelService';

interface InventoryViewProps {
  medicines: Medicine[];
  onOpenAddMedicineModal: () => void;
  onOpenEditMedicineModal: (med: Medicine) => void;
  onOpenRestockModal: (medicineId?: string) => void;
  onOpenExcelImportModal?: () => void;
  onDeleteMedicine: (id: string) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  medicines,
  onOpenAddMedicineModal,
  onOpenEditMedicineModal,
  onOpenRestockModal,
  onOpenExcelImportModal,
  onDeleteMedicine,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'low' | 'out' | 'normal'>('all');
  const [sortBy, setSortBy] = useState<'code' | 'name' | 'stock' | 'expiry'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    medicines.forEach(m => set.add(m.category));
    return Array.from(set);
  }, [medicines]);

  // Filtered & sorted
  const filteredMedicines = useMemo(() => {
    return medicines
      .filter(m => {
        // Search term
        const q = searchTerm.toLowerCase().trim();
        const matchesSearch =
          !q ||
          m.code.toLowerCase().includes(q) ||
          m.genericName.toLowerCase().includes(q) ||
          m.tradeName.toLowerCase().includes(q) ||
          m.batchNumber.toLowerCase().includes(q) ||
          m.location.toLowerCase().includes(q);

        // Category filter
        const matchesCat = categoryFilter === 'all' || m.category === categoryFilter;

        // Stock status
        let matchesStatus = true;
        if (stockStatusFilter === 'low') {
          matchesStatus = m.currentStock > 0 && m.currentStock <= m.minStock;
        } else if (stockStatusFilter === 'out') {
          matchesStatus = m.currentStock === 0;
        } else if (stockStatusFilter === 'normal') {
          matchesStatus = m.currentStock > m.minStock;
        }

        return matchesSearch && matchesCat && matchesStatus;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortBy === 'code') diff = a.code.localeCompare(b.code);
        else if (sortBy === 'name') diff = a.genericName.localeCompare(b.genericName);
        else if (sortBy === 'stock') diff = a.currentStock - b.currentStock;
        else if (sortBy === 'expiry') diff = a.expiryDate.localeCompare(b.expiryDate);
        return sortOrder === 'asc' ? diff : -diff;
      });
  }, [medicines, searchTerm, categoryFilter, stockStatusFilter, sortBy, sortOrder]);

  // Statistics
  const stats = useMemo(() => {
    const totalItems = medicines.length;
    const lowStock = medicines.filter(m => m.currentStock > 0 && m.currentStock <= m.minStock).length;
    const outOfStock = medicines.filter(m => m.currentStock === 0).length;
    const totalValue = medicines.reduce((sum, m) => sum + m.currentStock * m.unitPrice, 0);
    return { totalItems, lowStock, outOfStock, totalValue };
  }, [medicines]);

  const toggleSort = (col: 'code' | 'name' | 'stock' | 'expiry') => {
    if (sortBy === col) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortOrder('asc');
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">รายการยาทั้งหมดในคลัง</div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {stats.totalItems} <span className="text-xs font-normal text-slate-500">รายการ</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">ยาใกล้หมดสต๊อก (Low Stock)</div>
          <div className="text-2xl font-bold font-mono text-amber-600 mt-1 flex items-baseline gap-1.5">
            {stats.lowStock} <span className="text-xs font-normal text-slate-500">รายการ</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">ยาหมดสต๊อก (Out of Stock)</div>
          <div className="text-2xl font-bold font-mono text-rose-600 mt-1">
            {stats.outOfStock} <span className="text-xs font-normal text-slate-500">รายการ</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">มูลค่าคลังยารวมโดยประมาณ</div>
          <div className="text-2xl font-bold font-mono text-teal-800 mt-1">
            ฿{stats.totalValue.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {/* Card Header & Actions */}
        <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              ทะเบียนคลังยาและยอดคงเหลือ (Medication Stock)
            </h2>
            <p className="text-xs text-slate-500">
              ตรวจสอบจำนวนคงเหลือ สต๊อกขั้นต่ำ ล็อตการผลิต และวันหมดอายุ
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onOpenExcelImportModal && (
              <button
                type="button"
                onClick={onOpenExcelImportModal}
                className="px-3.5 py-2 text-xs sm:text-sm font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                title="นำเข้าไฟล์ Excel รายการยาและสต๊อก (ไม่ต้องใส่ราคายา)"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                <span>นำเข้ายาจาก Excel (.xlsx)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => excelService.exportMedicinesToExcel(medicines)}
              className="px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center gap-1.5 transition-colors"
              title="ส่งออกรายการยาทั้งหมดเป็นไฟล์ Excel"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>ส่งออก Excel</span>
            </button>

            <button
              onClick={() => onOpenRestockModal()}
              className="px-3.5 py-2 text-xs sm:text-sm font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <PackagePlus className="w-4 h-4 text-teal-600" />
              <span>+ รับยาเข้าคลัง/เติมสต๊อก</span>
            </button>

            <button
              onClick={onOpenAddMedicineModal}
              className="px-3.5 py-2 text-xs sm:text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>+ เพิ่มรายการยาใหม่</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="p-4 border-b border-slate-200 bg-white grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="ค้นหารหัสยา, ชื่อสามัญ, ชื่อการค้า, Lot No, ชั้นวาง..."
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono"
            />
          </div>

          <div className="sm:col-span-4">
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="all">ทุกหมวดหมู่ยา ({categories.length})</option>
              {categories.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={stockStatusFilter}
              onChange={e => setStockStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="all">สถานะสต๊อกทั้งหมด</option>
              <option value="low">⚠️ ใกล้หมดสต๊อก (ต่ำกว่าเกณฑ์)</option>
              <option value="out">❌ หมดสต๊อก (คงเหลือ 0)</option>
              <option value="normal">✅ สต๊อกเพียงพอปกติ</option>
            </select>
          </div>
        </div>

        {/* Medicines Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600">
                <th
                  onClick={() => toggleSort('code')}
                  className="py-3 px-4 font-semibold cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    <span>รหัสยา</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('name')}
                  className="py-3 px-4 font-semibold cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    <span>ชื่อยา / ความแรง</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4 font-semibold">หมวดหมู่</th>
                <th
                  onClick={() => toggleSort('stock')}
                  className="py-3 px-4 font-semibold text-right cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>คงเหลือ</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4 font-semibold text-right">เกณฑ์เตือน</th>
                <th className="py-3 px-4 font-semibold text-right">ราคา/หน่วย</th>
                <th className="py-3 px-4 font-semibold">Lot / วันหมดอายุ</th>
                <th className="py-3 px-4 font-semibold text-center">ชั้นวาง</th>
                <th className="py-3 px-4 font-semibold text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMedicines.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    ไม่พบรายการยาที่ตรงกับเงื่อนไขการค้นหา
                  </td>
                </tr>
              ) : (
                filteredMedicines.map(med => {
                  const isLow = med.currentStock > 0 && med.currentStock <= med.minStock;
                  const isOut = med.currentStock === 0;

                  return (
                    <tr
                      key={med.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                        {med.code}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">
                          {med.genericName} <span className="font-mono">{med.strength}</span>
                        </div>
                        {med.tradeName && med.tradeName !== med.genericName && (
                          <div className="text-[11px] text-slate-500">
                            {med.tradeName} ({med.dosageForm})
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        <span className="text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                          {med.category}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div
                          className={`font-mono font-bold text-sm ${
                            isOut
                              ? 'text-rose-600'
                              : isLow
                              ? 'text-amber-600'
                              : 'text-teal-800'
                          }`}
                        >
                          {med.currentStock.toLocaleString('th-TH')} {med.unit}
                        </div>
                        {isLow && (
                          <span className="text-[10px] text-amber-700 font-semibold block">
                            ใกล้หมดสต๊อก
                          </span>
                        )}
                        {isOut && (
                          <span className="text-[10px] text-rose-600 font-semibold block">
                            หมดสต๊อก
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right font-mono text-slate-500">
                        {med.minStock} {med.unit}
                      </td>

                      <td className="py-3 px-4 text-right font-mono text-slate-700">
                        {med.unitPrice > 0 ? (
                          `฿${med.unitPrice.toFixed(2)}`
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-mono text-slate-700 text-[11px]">
                          {med.batchNumber}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Exp: {med.expiryDate}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {med.location || '-'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onOpenRestockModal(med.id)}
                            title="เติมสต๊อกยา"
                            className="p-1.5 text-teal-700 hover:bg-teal-50 rounded transition-colors"
                          >
                            <PackagePlus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onOpenEditMedicineModal(med)}
                            title="แก้ไขข้อมูล"
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`ต้องการลบรายการยา "${med.genericName}" ออกจากระบบใช่หรือไม่?`)) {
                                onDeleteMedicine(med.id);
                              }
                            }}
                            title="ลบรายการยา"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex justify-between items-center text-xs text-slate-500">
          <div>
            แสดงผล {filteredMedicines.length} จากทั้งหมด {medicines.length} รายการ
          </div>
          <div>
            * ข้อมูลอัปเดตแบบเรียลไทม์ทันทีที่จ่ายยา
          </div>
        </div>
      </div>
    </div>
  );
};
