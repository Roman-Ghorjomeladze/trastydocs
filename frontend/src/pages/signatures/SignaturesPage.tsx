import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSignatureStore } from '../../stores/signature.store.ts';
import { ConfirmModal } from '../../components/shared/ConfirmModal.tsx';
import { AuthImage } from '../../components/shared/AuthImage.tsx';
import { cn } from '../../lib/utils.ts';
import { colorizeSignatureBlue } from '../../lib/image-utils.ts';
import type { SignatureAsset } from '../../types/index.ts';

export function SignaturesPage() {
  const { t } = useTranslation();
  const { signatures, isLoading, fetchSignatures, createSignature, updateSignature, deleteSignature } =
    useSignatureStore();
  const [showDrawing, setShowDrawing] = useState(false);
  const [sigName, setSigName] = useState(t('signatures.defaultName', 'My Signature'));
  const [isDefault, setIsDefault] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSignatures();
  }, [fetchSignatures]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  useEffect(() => {
    if (showDrawing) {
      // Small delay to let canvas mount
      setTimeout(clearCanvas, 50);
    }
  }, [showDrawing, clearCanvas]);

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      const touch = e.touches[0];
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true;
    const { x, y } = getCanvasCoords(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const { x, y } = getCanvasCoords(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#193296';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDraw = () => {
    isDrawingRef.current = false;
  };

  const saveFromCanvas = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsSaving(true);
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const rawBase64 = dataUrl.split(',')[1];
      // Colorize to blue pen ink and remove white background
      const blueBase64 = await colorizeSignatureBlue(rawBase64);
      await createSignature({ name: sigName, imageBase64: blueBase64, isDefault });
      setShowDrawing(false);
      setSigName(t('signatures.defaultName', 'My Signature'));
      setIsDefault(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
      // Colorize to blue pen ink and remove white background
      const blueBase64 = await colorizeSignatureBlue(rawBase64);
      await createSignature({ name: file.name.replace(/\.\w+$/, ''), imageBase64: blueBase64, isDefault: false });
    } finally {
      setIsSaving(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSetDefault = async (sig: SignatureAsset) => {
    await updateSignature(sig.id, { isDefault: true });
  };

  const handleRename = async (id: string) => {
    if (editName.trim()) {
      await updateSignature(id, { name: editName.trim() });
    }
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    await deleteSignature(id);
    setDeleteTarget(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('signatures.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('signatures.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors"
          >
            {t('signatures.upload')}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => setShowDrawing(true)}
            className="px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
          >
            {t('signatures.draw')}
          </button>
        </div>
      </div>

      {/* Drawing Panel */}
      {showDrawing && (
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            {t('signatures.drawTitle')}
          </h3>
          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-1">
              {t('signatures.name')}
            </label>
            <input
              type="text"
              value={sigName}
              onChange={(e) => setSigName(e.target.value)}
              className="w-full max-w-sm px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none"
            />
          </div>
          <div className="border-2 border-dashed border-border rounded-lg mb-4 inline-block">
            <canvas
              ref={canvasRef}
              width={500}
              height={200}
              className="cursor-crosshair rounded-lg touch-none"
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={stopDraw}
              onMouseLeave={stopDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={stopDraw}
            />
          </div>
          <div className="flex items-center gap-3 mb-4">
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="rounded border-border"
              />
              {t('signatures.setAsDefault')}
            </label>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={saveFromCanvas}
              disabled={isSaving}
              className="px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
            >
              {isSaving ? t('signatures.saving') : t('signatures.save')}
            </button>
            <button
              type="button"
              onClick={clearCanvas}
              className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors"
            >
              {t('signatures.clear')}
            </button>
            <button
              type="button"
              onClick={() => setShowDrawing(false)}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && signatures.length === 0 && !showDrawing && (
        <div className="text-center py-12 bg-muted rounded-lg">
          <p className="text-muted-foreground">{t('signatures.noSignatures')}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {t('signatures.createFirst')}
          </p>
        </div>
      )}

      {/* Signature Grid */}
      {!isLoading && signatures.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {signatures.map((sig) => (
            <div
              key={sig.id}
              className={cn(
                'bg-card border rounded-lg p-4 relative',
                sig.isDefault
                  ? 'border-accent ring-1 ring-accent/10'
                  : 'border-border',
              )}
            >
              {sig.isDefault && (
                <span className="absolute top-2 right-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-accent/15 text-accent">
                  {t('signatures.defaultLabel')}
                </span>
              )}
              <div className="bg-muted rounded-lg p-3 mb-3 flex items-center justify-center min-h-[100px]">
                <AuthImage
                  src={sig.imageUrl}
                  alt={sig.name}
                  className="max-h-[80px] max-w-full object-contain"
                />
              </div>
              {editingId === sig.id ? (
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRename(sig.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    className="flex-1 px-2 py-1 border rounded text-sm focus:ring-2 focus:ring-accent outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => handleRename(sig.id)}
                    className="text-xs text-accent hover:text-accent-hover"
                  >
                    {t('common.save')}
                  </button>
                </div>
              ) : (
                <p
                  className="font-medium text-sm text-foreground mb-2 cursor-pointer hover:text-accent"
                  onClick={() => {
                    setEditingId(sig.id);
                    setEditName(sig.name);
                  }}
                >
                  {sig.name}
                </p>
              )}
              <div className="flex items-center gap-2 text-xs">
                {!sig.isDefault && (
                  <button
                    type="button"
                    onClick={() => handleSetDefault(sig)}
                    className="text-accent hover:text-accent-hover"
                  >
                    {t('signatures.setAsDefault')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setDeleteTarget(sig.id)}
                  className="text-danger hover:text-danger-hover ml-auto"
                >
                  {t('signatures.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        title={t('signatures.deleteSignature')}
        message={t('signatures.confirmDelete')}
        variant="danger"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
