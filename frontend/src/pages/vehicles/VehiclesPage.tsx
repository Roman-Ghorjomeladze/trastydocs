import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useVehicleStore } from '../../stores/vehicle.store.ts';
import { ConfirmModal } from '../../components/shared/ConfirmModal.tsx';
import { SearchSelect } from '../../components/shared/SearchSelect.tsx';
import { cn } from '../../lib/utils.ts';
import type { Vehicle, VehicleType } from '../../types/index.ts';

export function VehiclesPage() {
  const { t } = useTranslation();
  const { companyId } = useParams<{ companyId: string }>();
  const {
    vehicles,
    isLoading,
    fetchVehicles,
    createVehicle,
    updateVehicle,
    deleteVehicle,
  } = useVehicleStore();

  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [filterType, setFilterType] = useState<VehicleType | ''>('');
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Form state
  const [formModel, setFormModel] = useState('');
  const [formPlate, setFormPlate] = useState('');
  const [formType, setFormType] = useState<VehicleType>('TRUCK');
  const [formNotes, setFormNotes] = useState('');
  const [formDefaultTrailerId, setFormDefaultTrailerId] = useState('');

  // Trailer options for the default trailer selector
  const trailerOptions = useMemo(
    () =>
      vehicles
        .filter((v) => v.type === 'TRAILER' && v.isActive)
        .map((v) => ({ value: v.id, label: v.model, sublabel: v.licensePlate })),
    [vehicles],
  );

  useEffect(() => {
    if (companyId) fetchVehicles(companyId);
  }, [companyId, fetchVehicles]);

  const filteredVehicles = filterType
    ? vehicles.filter((v) => v.type === filterType)
    : vehicles;

  const openCreateModal = () => {
    setEditingVehicle(null);
    setFormModel('');
    setFormPlate('');
    setFormType('TRUCK');
    setFormNotes('');
    setFormDefaultTrailerId('');
    setShowModal(true);
  };

  const openEditModal = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormModel(vehicle.model);
    setFormPlate(vehicle.licensePlate);
    setFormType(vehicle.type);
    setFormNotes(vehicle.notes ?? '');
    setFormDefaultTrailerId(vehicle.defaultTrailerId ?? '');
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!companyId || !formModel.trim() || !formPlate.trim()) return;
    setIsSaving(true);
    try {
      const effectiveType = editingVehicle ? editingVehicle.type : formType;
      if (editingVehicle) {
        await updateVehicle(companyId, editingVehicle.id, {
          model: formModel.trim(),
          licensePlate: formPlate.trim(),
          notes: formNotes.trim() || undefined,
          ...(effectiveType === 'TRUCK' && {
            defaultTrailerId: formDefaultTrailerId || null,
          }),
        });
      } else {
        await createVehicle(companyId, {
          model: formModel.trim(),
          licensePlate: formPlate.trim(),
          type: formType,
          notes: formNotes.trim() || undefined,
          ...(formType === 'TRUCK' && formDefaultTrailerId && {
            defaultTrailerId: formDefaultTrailerId,
          }),
        });
      }
      setShowModal(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (vehicle: Vehicle) => {
    if (!companyId) return;
    await updateVehicle(companyId, vehicle.id, {
      isActive: !vehicle.isActive,
    });
  };

  const handleDelete = async (id: string) => {
    if (!companyId) return;
    await deleteVehicle(companyId, id);
    setDeleteTarget(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('vehicles.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('vehicles.subtitle')}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
        >
          {t('vehicles.create')}
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {(['', 'TRUCK', 'TRAILER'] as const).map((filterVal) => (
          <button
            key={filterVal}
            type="button"
            onClick={() => setFilterType(filterVal)}
            className={cn(
              'px-3 py-1.5 text-sm rounded-lg border transition-colors',
              filterType === filterVal
                ? 'bg-accent/10 border-accent text-accent'
                : 'bg-card border-border text-muted-foreground hover:bg-muted',
            )}
          >
            {filterVal === '' ? t('common.all') : filterVal === 'TRUCK' ? t('vehicles.trucks') : t('vehicles.trailers')}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredVehicles.length === 0 && (
        <div className="text-center py-12 bg-muted rounded-lg">
          <svg
            className="w-12 h-12 text-border mx-auto mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 7h12l2 5h-2v4a1 1 0 01-1 1h-1a2 2 0 01-4 0H10a2 2 0 01-4 0H5a1 1 0 01-1-1v-6l4-3z"
            />
          </svg>
          <p className="text-muted-foreground">{t('vehicles.noVehicles')}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {t('vehicles.createFirst')}
          </p>
        </div>
      )}

      {/* Vehicle Table */}
      {!isLoading && filteredVehicles.length > 0 && (
        <div className="bg-card border border-border rounded-lg overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">
                  {t('vehicles.type')}
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">
                  {t('vehicles.model')}
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">
                  {t('vehicles.plate')}
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">
                  {t('vehicles.notes')}
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">
                  {t('vehicles.status')}
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredVehicles.map((vehicle) => (
                <tr key={vehicle.id} className="hover:bg-muted">
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                        vehicle.type === 'TRUCK'
                          ? 'bg-accent/15 text-accent'
                          : 'bg-orange-100 text-orange-800',
                      )}
                    >
                      {vehicle.type === 'TRUCK' ? t('vehicles.truck') : t('vehicles.trailer')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground font-medium">
                    {vehicle.model}
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground font-mono">
                    {vehicle.licensePlate}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground max-w-[200px] truncate">
                    {vehicle.type === 'TRUCK' && vehicle.defaultTrailer
                      ? `${vehicle.defaultTrailer.model} (${vehicle.defaultTrailer.licensePlate})`
                      : vehicle.notes || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(vehicle)}
                      className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium cursor-pointer',
                        vehicle.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {vehicle.isActive ? t('vehicles.active') : t('vehicles.inactive')}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(vehicle)}
                        className="text-xs text-accent hover:text-accent-hover"
                      >
                        {t('vehicles.edit')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(vehicle.id)}
                        className="text-xs text-danger hover:text-danger-hover"
                      >
                        {t('common.delete')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        title={t('vehicles.deleteVehicle')}
        message={t('vehicles.confirmDelete')}
        variant="danger"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">
              {editingVehicle ? t('vehicles.editVehicle') : t('vehicles.addVehicle')}
            </h2>

            <div className="space-y-3">
              {!editingVehicle && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    {t('vehicles.type')}
                  </label>
                  <select
                    value={formType}
                    onChange={(e) =>
                      setFormType(e.target.value as VehicleType)
                    }
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none bg-card"
                  >
                    <option value="TRUCK">{t('vehicles.truck')}</option>
                    <option value="TRAILER">{t('vehicles.trailer')}</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('vehicles.model')}
                </label>
                <input
                  type="text"
                  value={formModel}
                  onChange={(e) => setFormModel(e.target.value)}
                  placeholder="e.g. Mercedes Actros 1845"
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('vehicles.plate')}
                </label>
                <input
                  type="text"
                  value={formPlate}
                  onChange={(e) => setFormPlate(e.target.value)}
                  placeholder="e.g. ABC-123"
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('vehicles.notes')}
                </label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Optional notes..."
                  rows={2}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none resize-none"
                />
              </div>

              {/* Default trailer selector - only for trucks */}
              {((editingVehicle && editingVehicle.type === 'TRUCK') || (!editingVehicle && formType === 'TRUCK')) && trailerOptions.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    {t('vehicles.defaultTrailer')}
                  </label>
                  <SearchSelect
                    options={trailerOptions}
                    value={formDefaultTrailerId}
                    onChange={setFormDefaultTrailerId}
                    placeholder={t('vehicles.selectDefaultTrailer')}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-foreground bg-muted rounded-lg hover:bg-muted transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSaving || !formModel.trim() || !formPlate.trim()}
                className="px-4 py-2 text-sm text-white bg-accent rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
              >
                {isSaving
                  ? t('common.loading')
                  : editingVehicle
                    ? t('common.save')
                    : t('common.create')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
