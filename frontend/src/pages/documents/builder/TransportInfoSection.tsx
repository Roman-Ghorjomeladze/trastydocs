import type { InvoiceData, Vehicle } from '../../../types/index.ts';
import type { InvoiceLabels } from '../../../lib/invoice-i18n.ts';

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
  const handleVehicleSelect = (vehicleId: string) => {
    const vehicle = trucks?.find((v) => v.id === vehicleId);
    if (vehicle) {
      onChange('vehicleModel', vehicle.model);
      onChange('vehiclePlate', vehicle.licensePlate);
    }
  };

  const handleTrailerSelect = (trailerId: string) => {
    const trailer = trailers?.find((v) => v.id === trailerId);
    if (trailer) {
      onChange('trailerPlate', trailer.licensePlate);
    }
  };

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
            placeholder="Transportation of goods from..."
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
            placeholder="City A — City B"
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              {labels.vehicleModel}
              {trucks && trucks.length > 0 && (
                <select
                  onChange={(e) => {
                    if (e.target.value) handleVehicleSelect(e.target.value);
                  }}
                  className="ml-2 text-xs text-accent bg-transparent border-none outline-none cursor-pointer"
                  value=""
                >
                  <option value="">Select...</option>
                  {trucks.filter((v) => v.isActive).map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.model} ({v.licensePlate})
                    </option>
                  ))}
                </select>
              )}
            </label>
            <input
              type="text"
              value={data.vehicleModel}
              onChange={(e) => onChange('vehicleModel', e.target.value)}
              placeholder="Mercedes Actros 1845"
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{labels.vehiclePlate}</label>
            <input
              type="text"
              value={data.vehiclePlate}
              onChange={(e) => onChange('vehiclePlate', e.target.value)}
              placeholder="ABC-123"
              className="w-full px-3 py-2 border border-border rounded-lg text-sm font-mono focus:ring-2 focus:ring-accent focus:border-accent outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            {labels.trailerPlate}
            {trailers && trailers.length > 0 && (
              <select
                onChange={(e) => {
                  if (e.target.value) handleTrailerSelect(e.target.value);
                }}
                className="ml-2 text-xs text-accent bg-transparent border-none outline-none cursor-pointer"
                value=""
              >
                <option value="">Select...</option>
                {trailers.filter((v) => v.isActive).map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.model} ({v.licensePlate})
                  </option>
                ))}
              </select>
            )}
          </label>
          <input
            type="text"
            value={data.trailerPlate}
            onChange={(e) => onChange('trailerPlate', e.target.value)}
            placeholder="XYZ-789"
            className="w-full px-3 py-2 border border-border rounded-lg text-sm font-mono focus:ring-2 focus:ring-accent focus:border-accent outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{labels.directorName}</label>
            <input
              type="text"
              value={data.directorName}
              onChange={(e) => onChange('directorName', e.target.value)}
              placeholder="John Smith"
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{labels.amountInWords}</label>
            <input
              type="text"
              value={data.amountInWords}
              onChange={(e) => onChange('amountInWords', e.target.value)}
              placeholder="One thousand two hundred..."
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
