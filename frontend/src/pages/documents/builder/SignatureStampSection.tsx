import type { InvoiceData, SignatureAsset, StampAsset } from '../../../types/index.ts';
import type { InvoiceLabels } from '../../../lib/invoice-i18n.ts';
import { AuthImage } from '../../../components/shared/AuthImage.tsx';

interface Props {
  data: Pick<InvoiceData, 'signatureId' | 'stampId' | 'signerName' | 'signatureImageUrl' | 'stampImageUrl'>;
  labels: InvoiceLabels;
  signatures: SignatureAsset[];
  stamps: StampAsset[];
  onChange: (field: string, value: string) => void;
}

export function SignatureStampSection({ data, labels, signatures, stamps, onChange }: Props) {
  const handleSignatureSelect = (sigId: string) => {
    const sig = signatures.find((s) => s.id === sigId);
    onChange('signatureId', sigId);
    onChange('signatureImageUrl', sig?.imageUrl ?? '');
  };

  const handleStampSelect = (stampId: string) => {
    const stamp = stamps.find((s) => s.id === stampId);
    onChange('stampId', stampId);
    onChange('stampImageUrl', stamp?.imageUrl ?? '');
  };

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
        <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
        {labels.signatureAndStamp}
      </h3>

      <div className="space-y-4">
        {/* Signer Name */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">{labels.signerName}</label>
          <input
            type="text"
            value={data.signerName}
            onChange={(e) => onChange('signerName', e.target.value)}
            placeholder="John Smith"
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Signature selector */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{labels.signature}</label>
            <select
              value={data.signatureId}
              onChange={(e) => handleSignatureSelect(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none bg-card"
            >
              <option value="">None</option>
              {signatures.map((sig) => (
                <option key={sig.id} value={sig.id}>
                  {sig.name}{sig.isDefault ? ' (Default)' : ''}
                </option>
              ))}
            </select>
            {data.signatureImageUrl && (
              <div className="mt-2 p-3 bg-muted rounded-lg flex items-center justify-center min-h-[60px]">
                <AuthImage
                  src={data.signatureImageUrl}
                  alt="Signature"
                  className="max-h-[50px] max-w-full object-contain"
                />
              </div>
            )}
          </div>

          {/* Stamp selector */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{labels.stamp}</label>
            <select
              value={data.stampId}
              onChange={(e) => handleStampSelect(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none bg-card"
            >
              <option value="">None</option>
              {stamps.map((stamp) => (
                <option key={stamp.id} value={stamp.id}>
                  {stamp.name}{stamp.isDefault ? ' (Default)' : ''}
                </option>
              ))}
            </select>
            {data.stampImageUrl && (
              <div className="mt-2 p-3 bg-muted rounded-lg flex items-center justify-center min-h-[60px]">
                <AuthImage
                  src={data.stampImageUrl}
                  alt="Stamp"
                  className="max-h-[50px] max-w-full object-contain"
                />
              </div>
            )}
          </div>
        </div>

        {/* Combined preview */}
        {(data.signatureImageUrl || data.stampImageUrl) && (
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Preview</label>
            <div className="p-4 bg-muted rounded-lg flex items-center justify-center min-h-[100px] relative">
              {data.stampImageUrl && (
                <AuthImage
                  src={data.stampImageUrl}
                  alt="Stamp"
                  className="max-h-[80px] max-w-full object-contain opacity-70 absolute"
                />
              )}
              {data.signatureImageUrl && (
                <AuthImage
                  src={data.signatureImageUrl}
                  alt="Signature"
                  className="max-h-[60px] max-w-full object-contain relative z-10"
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
