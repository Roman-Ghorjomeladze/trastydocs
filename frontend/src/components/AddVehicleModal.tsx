import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useVehicleStore } from '../stores/vehicle.store.ts';
import type { Vehicle, VehicleType } from '../types/index.ts';

interface Props {
  isOpen: boolean;
  companyId: string;
  type: VehicleType;
  onCreated: (vehicle: Vehicle) => void;
  onClose: () => void;
}

export function AddVehicleModal({ isOpen, companyId, type, onCreated, onClose }: Props) {
  const { t } = useTranslation();
  const { createVehicle, vehicles } = useVehicleStore();

  const [model, setModel] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [notes, setNotes] = useState('');
  const [defaultTrailerId, setDefaultTrailerId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Available trailers (for TRUCK type to pick a default trailer)
  const trailerOptions = useMemo(
    () => vehicles.filter((v) => v.type === 'TRAILER' && v.isActive),
    [vehicles],
  );

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      setModel('');
      setLicensePlate('');
      setNotes('');
      setDefaultTrailerId('');
      setError('');
    }
  }, [isOpen]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!model.trim() || !licensePlate.trim()) return;

    setIsSubmitting(true);
    setError('');
    try {
      const vehicle = await createVehicle(companyId, {
        model: model.trim(),
        licensePlate: licensePlate.trim(),
        type,
        notes: notes.trim() || undefined,
        defaultTrailerId: defaultTrailerId || undefined,
      });
      onCreated(vehicle);
    } catch {
      setError(t('common.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const title = type === 'TRUCK' ? t('vehicles.addTruck') : t('vehicles.addTrailer');
  const isTruck = type === 'TRUCK';

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 animate-fade-in" />
      <div
        className="relative bg-card border border-border rounded-lg shadow-xl w-full max-w-md mx-4 p-6 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12l2 5h-2v4a1 1 0 01-1 1h-1a2 2 0 01-4 0H10a2 2 0 01-4 0H5a1 1 0 01-1-1v-6l4-3z" />
            </svg>
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-lg text-sm text-danger">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              {t('vehicles.model')} <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={t('vehicles.modelPlaceholder')}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              {t('vehicles.plate')} <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={licensePlate}
              onChange={(e) => setLicensePlate(e.target.value)}
              placeholder={t('vehicles.platePlaceholder')}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm font-mono focus:ring-2 focus:ring-accent focus:border-accent outline-none"
            />
          </div>

          {isTruck && trailerOptions.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                {t('vehicles.defaultTrailer')}
              </label>
              <select
                value={defaultTrailerId}
                onChange={(e) => setDefaultTrailerId(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none bg-card"
              >
                <option value="">{t('vehicles.noDefaultTrailer')}</option>
                {trailerOptions.map((trailer) => (
                  <option key={trailer.id} value={trailer.id}>
                    {trailer.model} — {trailer.licensePlate}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              {t('vehicles.notes')}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('vehicles.notesPlaceholder')}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border mt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-foreground bg-muted hover:bg-border rounded-lg transition-colors disabled:opacity-50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !model.trim() || !licensePlate.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-accent-hover rounded-lg transition-colors disabled:opacity-50"
            >
              {isSubmitting ? t('vehicles.saving') : t('vehicles.addVehicle')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
