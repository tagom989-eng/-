import React from 'react';
import { Pill, Activity, AlertTriangle, UserCheck } from 'lucide-react';
import { ClinicInfo } from '../services/storageService';

interface HeaderProps {
  activeTab: 'dispense' | 'inventory' | 'patients' | 'history' | 'reports';
  setActiveTab: (tab: 'dispense' | 'inventory' | 'patients' | 'history' | 'reports') => void;
  lowStockCount: number;
  todayDispenseCount: number;
  clinicInfo: ClinicInfo;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  lowStockCount,
  todayDispenseCount,
  clinicInfo,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Zone 1: Single Brand Lockup with Domain Meaning */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-slate-900 tracking-tight">PharmStock HN</span>
                <span className="text-xs text-slate-500 hidden sm:inline">· ระบบตัดสต๊อกยาตาม HN</span>
              </div>
              <p className="text-xs text-slate-500 truncate max-w-[280px] sm:max-w-md">
                {clinicInfo.hospitalName}
              </p>
            </div>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => setActiveTab('dispense')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'dispense'
                  ? 'bg-teal-50 text-teal-800 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Activity className="w-4 h-4 text-teal-600" />
              <span>ตัดสต๊อก & จ่ายยา (HN)</span>
            </button>

            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'inventory'
                  ? 'bg-teal-50 text-teal-800 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>คลังยา & สต๊อก</span>
              {lowStockCount > 0 && (
                <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold text-amber-800 bg-amber-100 rounded-full">
                  {lowStockCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('patients')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'patients'
                  ? 'bg-teal-50 text-teal-800 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>ทะเบียนผู้ป่วย (HN)</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-teal-50 text-teal-800 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>ประวัติการจ่ายยา</span>
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'reports'
                  ? 'bg-teal-50 text-teal-800 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>รายงาน & คุมสต๊อก</span>
            </button>
          </nav>

          {/* Zone 3: Primary Actions & Active Pharmacist status */}
          <div className="flex items-center gap-2">
            {lowStockCount > 0 && (
              <button
                onClick={() => setActiveTab('inventory')}
                title={`${lowStockCount} รายการยาใกล้หมดสต๊อก`}
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md transition-colors"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>เตือนยาใกล้หมด ({lowStockCount})</span>
              </button>
            )}

            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200 text-xs text-slate-600">
              <UserCheck className="w-4 h-4 text-teal-600" />
              <div className="leading-tight text-right">
                <span className="font-medium text-slate-800 block truncate max-w-[140px]">
                  {clinicInfo.defaultPharmacist.split('(')[0]}
                </span>
                <span className="text-[11px] text-slate-400">
                  จ่ายวันนี้ {todayDispenseCount} เคส
                </span>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('dispense')}
              className="px-3.5 py-2 text-xs sm:text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 rounded-lg shadow-xs transition-colors whitespace-nowrap flex items-center gap-1.5"
            >
              <Activity className="w-4 h-4" />
              <span>จ่ายยาทันที</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="flex md:hidden items-center gap-1 py-2 border-t border-slate-100 overflow-x-auto no-scrollbar text-xs">
          <button
            onClick={() => setActiveTab('dispense')}
            className={`px-3 py-1.5 font-medium rounded-md whitespace-nowrap ${
              activeTab === 'dispense' ? 'bg-teal-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            ตัดสต๊อก & จ่ายยา
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-3 py-1.5 font-medium rounded-md whitespace-nowrap flex items-center gap-1 ${
              activeTab === 'inventory' ? 'bg-teal-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>คลังยา</span>
            {lowStockCount > 0 && (
              <span className="px-1 text-[10px] bg-amber-500 text-white rounded-full">
                {lowStockCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('patients')}
            className={`px-3 py-1.5 font-medium rounded-md whitespace-nowrap ${
              activeTab === 'patients' ? 'bg-teal-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            ทะเบียนผู้ป่วย
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 font-medium rounded-md whitespace-nowrap ${
              activeTab === 'history' ? 'bg-teal-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            ประวัติจ่ายยา
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3 py-1.5 font-medium rounded-md whitespace-nowrap ${
              activeTab === 'reports' ? 'bg-teal-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            รายงาน & คุมสต๊อก
          </button>
        </div>
      </div>
    </header>
  );
};
