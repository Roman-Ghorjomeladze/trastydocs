import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStampStore } from '../../stores/stamp.store.ts';
import { cn } from '../../lib/utils.ts';
import { removeWhiteBackground } from '../../lib/image-utils.ts';
import type { StampAsset } from '../../types/index.ts';

export function StampsPage() {
  const { t } = useTranslation();
  const { companyId } = useParams<{ companyId: string }>();
  const { stamps, isLoading, fetchStamps, createStamp, updateStamp, deleteStamp } =
    useStampStore();
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (companyId) fetchStamps(companyId);
  }, [companyId, fetchStamps]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !companyId) return;
    setIsSaving(true);
    try {
      const reader = new FileReader();
      const rawBase64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Remove white background to create transparent PNG
      // This ensures stamps overlay signatures properly in PDF export
      const transparentBase64 = await removeWhiteBackground(rawBase64);

      await createStamp(companyId, {
        name: file.name.replace(/\.\w+$/, ''),
        imageBase64: transparentBase64,
        isDefault: false,
      });
    } finally {
      setIsSaving(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSetDefault = async (stamp: StampAsset) => {
    if (!companyId) return;
    await updateStamp(companyId, stamp.id, { isDefault: true });
  };

  const handleRename = async (id: string) => {
    if (!companyId || !editName.trim()) {
      setEditingId(null);
      return;
    }
    await updateStamp(companyId, id, { name: editName.trim() });
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!companyId) return;
    await deleteStamp(companyId, id);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('stamps.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('stamps.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSaving}
            className="px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            {isSaving ? t('stamps.saving') : t('stamps.upload')}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && stamps.length === 0 && (
        <div className="text-center py-12 bg-muted rounded-lg">
          <p className="text-muted-foreground">{t('stamps.noStamps')}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {t('stamps.createFirst')}
          </p>
        </div>
      )}

      {/* Stamp Grid */}
      {!isLoading && stamps.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stamps.map((stamp) => (
            <div
              key={stamp.id}
              className={cn(
                'bg-card border rounded-lg p-4 relative',
                stamp.isDefault
                  ? 'border-accent ring-1 ring-accent/10'
                  : 'border-border',
              )}
            >
              {stamp.isDefault && (
                <span className="absolute top-2 right-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-accent/15 text-accent">
                  {t('stamps.default')}
                </span>
              )}
              <div className="bg-muted rounded-lg p-3 mb-3 flex items-center justify-center min-h-[100px]">
                <img
                  src={stamp.imageUrl}
                  alt={stamp.name}
                  className="max-h-[80px] max-w-full object-contain"
                />
              </div>
              {editingId === stamp.id ? (
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRename(stamp.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    className="flex-1 px-2 py-1 border rounded text-sm focus:ring-2 focus:ring-accent outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => handleRename(stamp.id)}
                    className="text-xs text-accent hover:text-accent-hover"
                  >
                    {t('common.save')}
                  </button>
                </div>
              ) : (
                <p
                  className="font-medium text-sm text-foreground mb-2 cursor-pointer hover:text-accent"
                  onClick={() => {
                    setEditingId(stamp.id);
                    setEditName(stamp.name);
                  }}
                >
                  {stamp.name}
                </p>
              )}
              <div className="flex items-center gap-2 text-xs">
                {!stamp.isDefault && (
                  <button
                    type="button"
                    onClick={() => handleSetDefault(stamp)}
                    className="text-accent hover:text-accent-hover"
                  >
                    {t('stamps.setDefault')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(stamp.id)}
                  className="text-danger hover:text-danger-hover ml-auto"
                >
                  {t('stamps.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
