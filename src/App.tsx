/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { DispenseView } from './components/DispenseView';
import { InventoryView } from './components/InventoryView';
import { PatientDirectoryView } from './components/PatientDirectoryView';
import { HistoryView } from './components/HistoryView';
import { ReportsView } from './components/ReportsView';
import { PrintLabelModal } from './components/PrintLabelModal';
import { PatientModal } from './components/PatientModal';
import { MedicineModal } from './components/MedicineModal';
import { RestockModal } from './components/RestockModal';
import { ExcelImportModal } from './components/ExcelImportModal';
import {
  Patient,
  Medicine,
  PrescriptionRecord,
  StockMovement,
} from './types/pharmacy';
import { storageService, ClinicInfo } from './services/storageService';

export default function App() {
  // Main data states initialized from LocalStorage
  const [patients, setPatients] = useState<Patient[]>(() => storageService.getPatients());
  const [medicines, setMedicines] = useState<Medicine[]>(() => storageService.getMedicines());
  const [prescriptions, setPrescriptions] = useState<PrescriptionRecord[]>(() =>
    storageService.getPrescriptions()
  );
  const [movements, setMovements] = useState<StockMovement[]>(() => storageService.getMovements());
  const [clinicInfo, setClinicInfo] = useState<ClinicInfo>(() => storageService.getClinicInfo());

  // UI state
  const [activeTab, setActiveTab] = useState<
    'dispense' | 'inventory' | 'patients' | 'history' | 'reports'
  >('dispense');
  const [selectedHnForDispense, setSelectedHnForDispense] = useState<string | undefined>(undefined);

  // Modals state
  const [printingPrescription, setPrintingPrescription] = useState<PrescriptionRecord | null>(null);
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [isMedicineModalOpen, setIsMedicineModalOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [restockMedicineId, setRestockMedicineId] = useState<string | undefined>(undefined);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string>('');

  // Sync to localStorage whenever states change
  useEffect(() => {
    storageService.savePatients(patients);
  }, [patients]);

  useEffect(() => {
    storageService.saveMedicines(medicines);
  }, [medicines]);

  useEffect(() => {
    storageService.savePrescriptions(prescriptions);
  }, [prescriptions]);

  useEffect(() => {
    storageService.saveMovements(movements);
  }, [movements]);

  // Derived statistics for Header and Alerts
  const lowStockCount = useMemo(() => {
    return medicines.filter(m => m.currentStock > 0 && m.currentStock <= m.minStock).length;
  }, [medicines]);

  const todayDispenseCount = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return prescriptions.filter(
      p => p.dispensedAt.startsWith(todayStr) && p.status === 'completed'
    ).length;
  }, [prescriptions]);

  // Handler: Dispense and Deduct Stock Completed
  const handleDispenseSuccess = (
    newRx: PrescriptionRecord,
    updatedMeds: Medicine[],
    newMovements: StockMovement[]
  ) => {
    setPrescriptions(prev => [newRx, ...prev]);
    setMedicines(updatedMeds);
    setMovements(prev => [...newMovements, ...prev]);

    // Also update patient's last visit
    setPatients(prev =>
      prev.map(p => {
        if (p.hn === newRx.patientHn) {
          return {
            ...p,
            lastVisit: new Date().toISOString().split('T')[0],
          };
        }
        return p;
      })
    );
  };

  // Handler: Save Patient (Add or Edit)
  const handleSavePatient = (savedPatient: Patient) => {
    if (editingPatient) {
      setPatients(prev => prev.map(p => (p.hn === savedPatient.hn ? savedPatient : p)));
    } else {
      setPatients(prev => [savedPatient, ...prev]);
    }
    setIsPatientModalOpen(false);
    setEditingPatient(null);
  };

  const handleDeletePatient = (hn: string) => {
    setPatients(prev => prev.filter(p => p.hn !== hn));
  };

  // Handler: Batch Import Patients from Excel
  const handleExcelImport = (importedPatients: Patient[], overwrite: boolean) => {
    let updated = [...patients];
    let addedCount = 0;
    let updatedCount = 0;

    importedPatients.forEach(newP => {
      const existingIndex = updated.findIndex(
        p => p.hn.toLowerCase() === newP.hn.toLowerCase()
      );
      if (existingIndex >= 0) {
        if (overwrite) {
          updated[existingIndex] = {
            ...updated[existingIndex],
            ...newP,
            // Keep existing lastVisit if not provided
            lastVisit: updated[existingIndex].lastVisit || newP.lastVisit,
          };
          updatedCount++;
        }
      } else {
        updated.push(newP);
        addedCount++;
      }
    });

    setPatients(updated);
    storageService.savePatients(updated);
    setIsExcelModalOpen(false);
    setToastMessage(
      `นำเข้าข้อมูลผู้ป่วยจาก Excel สำเร็จ! เพิ่มใหม่ ${addedCount} ราย${
        updatedCount > 0 ? `, อัปเดตข้อมูลเดิม ${updatedCount} ราย` : ''
      }`
    );
    setTimeout(() => setToastMessage(''), 6000);
  };

  // Handler: Select Patient from Directory to Dispense
  const handleSelectPatientToDispense = (hn: string) => {
    setSelectedHnForDispense(hn);
    setActiveTab('dispense');
  };

  // Handler: Save Medicine (Add or Edit)
  const handleSaveMedicine = (savedMed: Medicine) => {
    if (editingMedicine) {
      setMedicines(prev => prev.map(m => (m.id === savedMed.id ? savedMed : m)));
    } else {
      setMedicines(prev => [...prev, savedMed]);
    }
    setIsMedicineModalOpen(false);
    setEditingMedicine(null);
  };

  const handleDeleteMedicine = (id: string) => {
    setMedicines(prev => prev.filter(m => m.id !== id));
  };

  // Handler: Restock Medicine
  const handleRestock = (
    medicineId: string,
    quantity: number,
    batchNumber: string,
    expiryDate: string,
    note: string
  ) => {
    const med = medicines.find(m => m.id === medicineId);
    if (!med) return;

    const beforeStock = med.currentStock;
    const afterStock = beforeStock + quantity;

    // Update medicine
    setMedicines(prev =>
      prev.map(m => {
        if (m.id === medicineId) {
          return {
            ...m,
            currentStock: afterStock,
            batchNumber: batchNumber || m.batchNumber,
            expiryDate: expiryDate || m.expiryDate,
          };
        }
        return m;
      })
    );

    // Record Stock Movement
    const movement: StockMovement = {
      id: `mov-restock-${Date.now()}`,
      timestamp: new Date().toISOString(),
      medicineId,
      medicineName: `${med.genericName} ${med.strength}`,
      type: 'restock',
      quantity,
      balanceBefore: beforeStock,
      balanceAfter: afterStock,
      reference: `PO-${Date.now().toString().slice(-4)}`,
      performedBy: clinicInfo.defaultPharmacist,
      note: note || 'รับยาเข้าคลัง',
    };

    setMovements(prev => [movement, ...prev]);
    setIsRestockModalOpen(false);
    setRestockMedicineId(undefined);
  };

  // Handler: Cancel Prescription and Revert/Return Stock
  const handleCancelPrescription = (
    rxId: string,
    reason: string,
    restockMovements: StockMovement[],
    updatedMeds: Medicine[]
  ) => {
    setPrescriptions(prev =>
      prev.map(rx => {
        if (rx.id === rxId) {
          return {
            ...rx,
            status: 'cancelled',
            cancelledAt: new Date().toISOString(),
            cancelReason: reason,
          };
        }
        return rx;
      })
    );
    setMedicines(updatedMeds);
    setMovements(prev => [...restockMovements, ...prev]);
  };

  // Reload all from storage (e.g. after import or demo reset)
  const handleDataReloaded = () => {
    setPatients(storageService.getPatients());
    setMedicines(storageService.getMedicines());
    setPrescriptions(storageService.getPrescriptions());
    setMovements(storageService.getMovements());
    setClinicInfo(storageService.getClinicInfo());
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans">
      {/* 3-Zone Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={tab => {
          setActiveTab(tab);
          if (tab !== 'dispense') {
            setSelectedHnForDispense(undefined);
          }
        }}
        lowStockCount={lowStockCount}
        todayDispenseCount={todayDispenseCount}
        clinicInfo={clinicInfo}
      />

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="bg-emerald-600 text-white px-4 py-2.5 shadow-md flex items-center justify-between text-xs sm:text-sm font-medium sticky top-16 z-20">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
            <span>✓ {toastMessage}</span>
            <button
              onClick={() => setToastMessage('')}
              className="text-emerald-200 hover:text-white ml-3 font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dispense' && (
          <DispenseView
            patients={patients}
            medicines={medicines}
            clinicInfo={clinicInfo}
            selectedHnFromOutside={selectedHnForDispense}
            onDispenseSuccess={handleDispenseSuccess}
            onOpenNewPatientModal={() => {
              setEditingPatient(null);
              setIsPatientModalOpen(true);
            }}
            onOpenExcelImportModal={() => setIsExcelModalOpen(true)}
            onOpenPrintModal={rx => setPrintingPrescription(rx)}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryView
            medicines={medicines}
            onOpenAddMedicineModal={() => {
              setEditingMedicine(null);
              setIsMedicineModalOpen(true);
            }}
            onOpenEditMedicineModal={med => {
              setEditingMedicine(med);
              setIsMedicineModalOpen(true);
            }}
            onOpenRestockModal={medId => {
              setRestockMedicineId(medId);
              setIsRestockModalOpen(true);
            }}
            onDeleteMedicine={handleDeleteMedicine}
          />
        )}

        {activeTab === 'patients' && (
          <PatientDirectoryView
            patients={patients}
            prescriptions={prescriptions}
            onOpenNewPatientModal={() => {
              setEditingPatient(null);
              setIsPatientModalOpen(true);
            }}
            onOpenEditPatientModal={patient => {
              setEditingPatient(patient);
              setIsPatientModalOpen(true);
            }}
            onOpenExcelImportModal={() => setIsExcelModalOpen(true)}
            onDeletePatient={handleDeletePatient}
            onSelectPatientToDispense={handleSelectPatientToDispense}
            onOpenPrintModal={rx => setPrintingPrescription(rx)}
          />
        )}

        {activeTab === 'history' && (
          <HistoryView
            prescriptions={prescriptions}
            medicines={medicines}
            onOpenPrintModal={rx => setPrintingPrescription(rx)}
            onCancelPrescription={handleCancelPrescription}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsView
            movements={movements}
            medicines={medicines}
            prescriptions={prescriptions}
            patients={patients}
            clinicInfo={clinicInfo}
            onDataReloaded={handleDataReloaded}
          />
        )}
      </main>

      {/* Global Modals */}
      {/* 1. Print Sticker / Receipt Modal */}
      {printingPrescription && (
        <PrintLabelModal
          prescription={printingPrescription}
          clinicInfo={clinicInfo}
          onClose={() => setPrintingPrescription(null)}
        />
      )}

      {/* 2. Patient Registration / Edit Modal */}
      {isPatientModalOpen && (
        <PatientModal
          patient={editingPatient}
          existingPatients={patients}
          onSave={handleSavePatient}
          onClose={() => {
            setIsPatientModalOpen(false);
            setEditingPatient(null);
          }}
        />
      )}

      {/* 3. Medicine Catalog / Edit Modal */}
      {isMedicineModalOpen && (
        <MedicineModal
          medicine={editingMedicine}
          existingMedicines={medicines}
          onSave={handleSaveMedicine}
          onClose={() => {
            setIsMedicineModalOpen(false);
            setEditingMedicine(null);
          }}
        />
      )}

      {/* 4. Restock / Stock-In Modal */}
      {isRestockModalOpen && (
        <RestockModal
          medicines={medicines}
          preselectedMedicineId={restockMedicineId}
          onRestock={handleRestock}
          onClose={() => {
            setIsRestockModalOpen(false);
            setRestockMedicineId(undefined);
          }}
        />
      )}

      {/* 5. Excel Patient Import Modal */}
      {isExcelModalOpen && (
        <ExcelImportModal
          existingPatients={patients}
          onImportComplete={handleExcelImport}
          onClose={() => setIsExcelModalOpen(false)}
        />
      )}
    </div>
  );
}
