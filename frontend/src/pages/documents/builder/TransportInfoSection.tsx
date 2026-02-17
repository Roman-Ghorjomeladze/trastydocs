import { useMemo, useState } from 'react';
import type { InvoiceData, Vehicle } from '../../../types/index.ts';
import type { InvoiceLabels } from '../../../lib/invoice-i18n.ts';
import { SearchSelect } from '../../../components/shared/SearchSelect.tsx';

interface Props {
  data: Pick<
    InvoiceData,
    'serviceDescription' | 'transportRoute' | 'vehicleModel' | 'vehiclePlate' | 'trailerPlate' | 'directorName' | 'amountInWords'
  >;
  labels: InvoiceLabels;
  onChange: (field: string, value: string) => void;
  trucks?: Vehicle[];
  trailers?: Vehicle[];
}

export function TransportInfoSection({ data, labels, onChange, trucks, trailers }: Props) {
  const [selectedTruckId, setSelectedTruckId] = useState('');
  const [selectedTrailerId, setSelectedTrailerId] = useState('');

  const truckOptions = useMemo(
    () =>
      (trucks || [])
        .filter((v) => v.isActive)
        .map((v) => ({ value: v.id, label: v.model, sublabel: v.licensePlate })),
    [trucks],
  );

  const trailerOptions = useMemo(
    () =>
      (trailers || [])
        .filter((v) => v.isActive)
        .map((v) => ({ value: v.id, label: v.model, sublabel: v.licensePlate })),
    [trailers],
  );

  const handleVehicleSelect = (vehicleId: string) => {
    setSelectedTruckId(vehicleId);
    const vehicle = trucks?.find((v) => v.id === vehicleId);
    if (vehicle) {
      onChange('vehicleModel', vehicle.model);
      onChange('vehiclePlate', vehicle.licensePlate);
      // Auto-populate trailer from default trailer if trailer plate is empty
      if (!data.trailerPlate && vehicle.defaultTrailer) {
        onChange('trailerPlate', vehicle.defaultTrailer.licensePlate);
        setSelectedTrailerId(vehicle.defaultTrailer.id);
      }
    } else {
      // Cleared selection
      onChange('vehicleModel', '');
      onChange('vehiclePlate', '');
    }
  };

  const handleTrailerSelect = (trailerId: string) => {
    setSelectedTrailerId(trailerId);
    const trailer = trailers?.find((v) => v.id === trailerId);
    if (trailer) {
      onChange('trailerPlate', trailer.licensePlate);
    } else {
      onChange('trailerPlate', '');
    }
  };

  const hasTrucks = truckOptions.length > 0;
  const hasTrailers = trailerOptions.length > 0;

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
        <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12l2 5h-2v4a1 1 0 01-1 1h-1a2 2 0 01-4 0H10a2 2 0 01-4 0H5a1 1 0 01-1-1v-6l4-3z" />
        </svg>
        {labels.transportInfo}
      </h3>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">{labels.serviceDescription}</label>
          <textarea
            value={data.serviceDescription}
            onChange={(e) => onChange('serviceDescription', e.target.value)}
            placeholder={labels.placeholderServiceDescription}
            rows={2}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">{labels.transportRoute}</label>
          <input
            type="text"
            value={data.transportRoute}
            onChange={(e) => onChange('transportRoute', e.target.value)}
            placeholder={labels.placeholderTransportRoute}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none"
          />
        </div>

        {/* Truck — SearchSelect if vehicles exist, otherwise manual inputs */}
        {hasTrucks ? (
          <>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                {labels.vehicleModel}
              </label>
              <SearchSelect
                options={truckOptions}
                value={selectedTruckId}
                onChange={handleVehicleSelect}
                placeholder={labels.placeholderSelectTruck}
              />
            </div>
            {selectedTruckId && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">{labels.vehicleModel}</label>
                  <input
                    type="text"
                    value={data.vehicleModel}
                    readOnly
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-muted text-foreground outline-none cursor-default"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">{labels.vehiclePlate}</label>
                  <input
                    type="text"
                    value={data.vehiclePlate}
                    readOnly
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm font-mono bg-muted text-foreground outline-none cursor-default"
                  />
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">{labels.vehicleModel}</label>
              <input
                type="text"
                value={data.vehicleModel}
                onChange={(e) => onChange('vehicleModel', e.target.value)}
                placeholder={labels.placeholderVehicleModel}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">{labels.vehiclePlate}</label>
              <input
                type="text"
                value={data.vehiclePlate}
                onChange={(e) => onChange('vehiclePlate', e.target.value)}
                placeholder={labels.placeholderVehiclePlate}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm font-mono focus:ring-2 focus:ring-accent focus:border-accent outline-none"
              />
            </div>
          </div>
        )}

        {/* Trailer — SearchSelect if trailers exist, otherwise manual input */}
        {hasTrailers ? (
          <>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                {labels.trailerPlate}
              </label>
              <SearchSelect
                options={trailerOptions}
                value={selectedTrailerId}
                onChange={handleTrailerSelect}
                placeholder={labels.placeholderSelectTrailer}
              />
            </div>
            {selectedTrailerId && (
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">{labels.trailerPlate}</label>
                <input
                  type="text"
                  value={data.trailerPlate}
                  readOnly
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm font-mono bg-muted text-foreground outline-none cursor-default"
                />
              </div>
            )}
          </>
        ) : (
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{labels.trailerPlate}</label>
            <input
              type="text"
              value={data.trailerPlate}
              onChange={(e) => onChange('trailerPlate', e.target.value)}
              placeholder={labels.placeholderTrailerPlate}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm font-mono focus:ring-2 focus:ring-accent focus:border-accent outline-none"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{labels.directorName}</label>
            <input
              type="text"
              value={data.directorName}
              onChange={(e) => onChange('directorName', e.target.value)}
              placeholder={labels.placeholderDirectorName}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{labels.amountInWords}</label>
            <input
              type="text"
              value={data.amountInWords}
              onChange={(e) => onChange('amountInWords', e.target.value)}
              placeholder={labels.placeholderAmountInWords}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
