import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { MoreVertical, Pencil, PenLine, Send, Copy, Trash2 } from 'lucide-react';
import { useDocumentStore } from "../../stores/document.store.ts";
import { ROUTES, STATUS_COLORS } from "../../lib/constants.ts";
import { cn } from "../../lib/utils.ts";
import { isInvoiceData } from "../../lib/invoice-utils.ts";
import { exportInvoicePdf } from "../../lib/pdf-export.ts";
import { getDocument } from "../../api/documents.ts";
import { ConfirmModal } from "../../components/shared/ConfirmModal.tsx";
import { AuthImage, useAuthUrl } from "../../components/shared/AuthImage.tsx";
import type { DocumentStatus, InvoiceData } from "../../types/index.ts";

export function DocumentDetailPage() {
	const { t } = useTranslation();
	const { companyId, documentId } = useParams<{
		companyId: string;
		documentId: string;
	}>();
	const navigate = useNavigate();
	const {
		currentDocument: doc,
		isLoading,
		fetchDocument,
		updateDocument,
		deleteDocument,
		sendDocument,
		duplicateDocument,
		uploadPdf,
	} = useDocumentStore();

	const [isEditing, setIsEditing] = useState(false);
	const [editName, setEditName] = useState("");
	const [editNotes, setEditNotes] = useState("");
	const [showSendModal, setShowSendModal] = useState(false);
	const [sendEmail, setSendEmail] = useState("");
	const [isSending, setIsSending] = useState(false);
	const [isGenerating, setIsGenerating] = useState(false);
	const [pdfError, setPdfError] = useState<string | null>(null);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);
	// Pass updatedAt as version key so the blob is refetched after PDF regeneration
	// (the pdfUrl path stays the same when the file is overwritten)
	const pdfBlobUrl = useAuthUrl(doc?.pdfUrl, doc?.updatedAt);

	useEffect(() => {
		if (documentId) fetchDocument(documentId);
	}, [documentId, fetchDocument]);

	useEffect(() => {
		if (doc) {
			setEditName(doc.name);
			setEditNotes(doc.notes || "");
		}
	}, [doc]);

	if (isLoading || !doc) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
			</div>
		);
	}

	const isDraft = doc.status === "DRAFT";

	const handleSave = async () => {
		await updateDocument(doc.id, {
			name: editName,
			notes: editNotes || null,
		});
		setIsEditing(false);
	};

	const handleStatusChange = async (status: DocumentStatus) => {
		await updateDocument(doc.id, { status });
		await fetchDocument(doc.id);
	};

	const handleSend = async () => {
		if (!sendEmail) return;
		setIsSending(true);
		try {
			await sendDocument(doc.id, { recipientEmail: sendEmail });
			setShowSendModal(false);
			setSendEmail("");
		} finally {
			setIsSending(false);
		}
	};

	const handleDuplicate = async () => {
		const dup = await duplicateDocument(doc.id);
		if (companyId) navigate(ROUTES.DOCUMENT_DETAIL(companyId, dup.id));
	};

	const handleDeleteConfirm = async () => {
		setIsDeleting(true);
		try {
			await deleteDocument(doc.id);
			if (companyId) navigate(ROUTES.DOCUMENTS(companyId));
		} finally {
			setIsDeleting(false);
			setShowDeleteConfirm(false);
		}
	};

	const handleGeneratePdf = async () => {
		setIsGenerating(true);
		setPdfError(null);
		try {
			// Fetch fresh document data directly (bypasses store's isLoading flicker)
			let inputData = doc.inputData;
			try {
				const freshDoc = await getDocument(doc.id);
				inputData = freshDoc.inputData;
			} catch {
				// fallback to current doc.inputData
			}

			if (!isInvoiceData(inputData)) {
				setPdfError(t('documents.noInvoiceData'));
				return;
			}

			const invoiceData = inputData as unknown as InvoiceData;
			const pdfBytes = await exportInvoicePdf(invoiceData);

			// Upload to server so the embedded viewer refreshes
			const base64 = btoa(
				Array.from(pdfBytes)
					.map((b) => String.fromCharCode(b))
					.join(""),
			);
			await uploadPdf(doc.id, base64);
			// Re-fetch to update the preview and timestamps
			await fetchDocument(doc.id);
		} catch (err) {
			console.error("PDF generation failed:", err);
			setPdfError(err instanceof Error ? err.message : t('documents.pdfGenerationFailed'));
		} finally {
			setIsGenerating(false);
		}
	};

	const formatDate = (dateStr: string) => {
		return new Date(dateStr).toLocaleString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	return (
		<div>
			{/* Header */}
			<div className="flex items-start justify-between mb-6 gap-3">
				<div className="min-w-0 flex-1">
					<button
						type="button"
						onClick={() => companyId && navigate(ROUTES.DOCUMENTS(companyId))}
						className="text-sm text-accent hover:text-accent-hover mb-2 inline-block"
					>
						&larr; {t('documents.back')}
					</button>
					<div className="flex items-center gap-3 flex-wrap">
						{isEditing ? (
							<input
								type="text"
								value={editName}
								onChange={(e) => setEditName(e.target.value)}
								className="text-2xl font-bold text-foreground border-b-2 border-accent outline-none bg-transparent min-w-0"
								autoFocus
							/>
						) : (
							<h1 className="text-2xl font-bold text-foreground break-words">{doc.name}</h1>
						)}
						<span
							className={cn(
								"inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium shrink-0",
								STATUS_COLORS[doc.status] || "bg-gray-100 text-gray-800",
							)}
						>
							{t(`status.${doc.status}`)}
						</span>
					</div>
					{doc.documentNumber && <p className="text-sm text-muted-foreground font-mono mt-1">{doc.documentNumber}</p>}
				</div>

				{/* Desktop actions */}
				<div className="hidden md:flex items-center gap-2 shrink-0">
					{isDraft && !isEditing && (
						<button
							type="button"
							onClick={() => setIsEditing(true)}
							className="px-3 py-1.5 text-sm border rounded-lg hover:bg-muted"
						>
							{t('common.edit')}
						</button>
					)}
					{isEditing && (
						<>
							<button
								type="button"
								onClick={handleSave}
								className="px-3 py-1.5 text-sm bg-accent text-white rounded-lg hover:bg-accent-hover"
							>
								{t('common.save')}
							</button>
							<button
								type="button"
								onClick={() => setIsEditing(false)}
								className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
							>
								{t('common.cancel')}
							</button>
						</>
					)}
					{isDraft && companyId && (
						<button
							type="button"
							onClick={() =>
								navigate(ROUTES.DOCUMENT_BUILDER(companyId, doc.id))
							}
							className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent text-white rounded-lg hover:bg-accent-hover"
						>
							<PenLine className="w-4 h-4" />
							{t('documents.openBuilder')}
						</button>
					)}
					<button
						type="button"
						onClick={() => setShowSendModal(true)}
						className="px-3 py-1.5 text-sm border rounded-lg hover:bg-muted"
					>
						{t('documents.send')}
					</button>
					<button
						type="button"
						onClick={handleDuplicate}
						className="px-3 py-1.5 text-sm border rounded-lg hover:bg-muted"
					>
						{t('documents.duplicate')}
					</button>
					<button
						type="button"
						onClick={() => setShowDeleteConfirm(true)}
						className="px-3 py-1.5 text-sm text-danger border border-danger rounded-lg hover:bg-danger/10"
					>
						{t('common.delete')}
					</button>
				</div>

				{/* Mobile actions menu */}
				<div className="md:hidden relative shrink-0" ref={menuRef}>
					{isEditing ? (
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={handleSave}
								className="px-3 py-1.5 text-sm bg-accent text-white rounded-lg hover:bg-accent-hover"
							>
								{t('common.save')}
							</button>
							<button
								type="button"
								onClick={() => setIsEditing(false)}
								className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
							>
								{t('common.cancel')}
							</button>
						</div>
					) : (
						<>
							<button
								type="button"
								onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
								className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
								aria-label="Actions"
							>
								<MoreVertical className="w-5 h-5" />
							</button>

							{mobileMenuOpen && (
								<>
									<div className="fixed inset-0 z-30" onClick={() => setMobileMenuOpen(false)} />
									<div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg z-40 min-w-[220px] py-1 animate-fade-in">
										{isDraft && (
											<button
												type="button"
												onClick={() => {
													setMobileMenuOpen(false);
													setIsEditing(true);
												}}
												className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
											>
												<Pencil className="w-4 h-4 text-muted-foreground" />
												{t('common.edit')}
											</button>
										)}
										{isDraft && companyId && (
											<button
												type="button"
												onClick={() => {
													setMobileMenuOpen(false);
													navigate(ROUTES.DOCUMENT_BUILDER(companyId, doc.id));
												}}
												className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
											>
												<PenLine className="w-4 h-4 text-muted-foreground" />
												{t('documents.openBuilder')}
											</button>
										)}
										<button
											type="button"
											onClick={() => {
												setMobileMenuOpen(false);
												setShowSendModal(true);
											}}
											className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
										>
											<Send className="w-4 h-4 text-muted-foreground" />
											{t('documents.send')}
										</button>
										<button
											type="button"
											onClick={() => {
												setMobileMenuOpen(false);
												handleDuplicate();
											}}
											className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
										>
											<Copy className="w-4 h-4 text-muted-foreground" />
											{t('documents.duplicate')}
										</button>
										<div className="border-t border-border my-1" />
										<button
											type="button"
											onClick={() => {
												setMobileMenuOpen(false);
												setShowDeleteConfirm(true);
											}}
											className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-danger hover:bg-danger/10 transition-colors"
										>
											<Trash2 className="w-4 h-4" />
											{t('common.delete')}
										</button>
									</div>
								</>
							)}
						</>
					)}
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Main Content */}
				<div className="lg:col-span-2 space-y-6">
					{/* PDF Section */}
					<div className="bg-card border border-border rounded-lg p-6">
						<h3 className="text-lg font-semibold text-foreground mb-4">{t('documents.pdfPreview')}</h3>
						{doc.pdfUrl ? (
							<div>
								{pdfBlobUrl ? (
									<object
										data={`${pdfBlobUrl}#toolbar=1`}
										type="application/pdf"
										className="w-full h-[500px] border rounded-lg"
									>
										<div className="flex flex-col items-center justify-center h-full bg-muted rounded-lg">
											<p className="text-muted-foreground mb-3">PDF preview not available in this browser</p>
											<a
												href={pdfBlobUrl}
												target="_blank"
												rel="noopener noreferrer"
												className="px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent-hover"
											>
												{t('documents.downloadPdf')}
											</a>
										</div>
									</object>
								) : (
									<div className="flex items-center justify-center h-[500px] bg-muted rounded-lg">
										<div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
									</div>
								)}
								<div className="mt-3 flex items-center gap-2">
									<a
										href={pdfBlobUrl || '#'}
										target="_blank"
										rel="noopener noreferrer"
										className="px-3 py-1.5 text-sm border rounded-lg hover:bg-muted"
									>
										{t('documents.downloadPdf')}
									</a>
									<button
										type="button"
										onClick={handleGeneratePdf}
										disabled={isGenerating}
										className="px-3 py-1.5 text-sm border rounded-lg hover:bg-muted disabled:opacity-50"
									>
										{isGenerating ? t('documents.generating') : t('documents.generatePdf')}
									</button>
									{doc.pdfSize && (
										<span className="text-xs text-muted-foreground">
											{(doc.pdfSize / 1024).toFixed(1)} KB
										</span>
									)}
								</div>
								{pdfError && (
									<p className="mt-2 text-sm text-danger">{pdfError}</p>
								)}
							</div>
						) : (
							<div className="text-center py-8 bg-muted rounded-lg">
								<p className="text-muted-foreground mb-3">{t('documents.noPdf')}</p>
								<button
									type="button"
									onClick={handleGeneratePdf}
									disabled={isGenerating}
									className="px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50"
								>
									{isGenerating ? t('documents.generating') : t('documents.generatePdf')}
								</button>
								{pdfError && (
									<p className="mt-3 text-sm text-danger">{pdfError}</p>
								)}
							</div>
						)}
					</div>

					{/* Notes */}
					{(isEditing || doc.notes) && (
						<div className="bg-card border border-border rounded-lg p-6">
							<h3 className="text-lg font-semibold text-foreground mb-3">{t('documents.notes')}</h3>
							{isEditing ? (
								<textarea
									value={editNotes}
									onChange={(e) => setEditNotes(e.target.value)}
									rows={4}
									className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-accent outline-none"
								/>
							) : (
								<p className="text-sm text-foreground whitespace-pre-wrap">{doc.notes}</p>
							)}
						</div>
					)}

					{/* Signatures */}
					{doc.documentSignatures && doc.documentSignatures.length > 0 && (
						<div className="bg-card border border-border rounded-lg p-6">
							<h3 className="text-lg font-semibold text-foreground mb-3">{t('documents.signatures')}</h3>
							<div className="grid grid-cols-2 gap-3">
								{doc.documentSignatures.map((ds) => (
									<div key={ds.id} className="flex items-center gap-3 p-3 border rounded-lg">
										<AuthImage
											src={ds.signature?.imageUrl || ds.stamp?.imageUrl}
											alt={ds.signature?.name || ds.stamp?.name}
											className="w-12 h-12 object-contain"
										/>
										<div>
											<p className="text-sm font-medium">
												{ds.signature?.name || ds.stamp?.name}
											</p>
											<p className="text-xs text-muted-foreground">Page {ds.pageNumber}</p>
										</div>
									</div>
								))}
							</div>
						</div>
					)}
				</div>

				{/* Sidebar Info */}
				<div className="space-y-6">
					{/* Info Panel */}
					<div className="bg-card border border-border rounded-lg p-6">
						<h3 className="text-lg font-semibold text-foreground mb-4">{t('documents.documentInfo')}</h3>
						<dl className="space-y-3">
							<div>
								<dt className="text-xs font-medium text-muted-foreground uppercase">{t('documents.buyer')}</dt>
								<dd className="text-sm text-foreground mt-0.5">{doc.buyer?.name || "-"}</dd>
							</div>
								<div>
								<dt className="text-xs font-medium text-muted-foreground uppercase">{t('documents.createdBy')}</dt>
								<dd className="text-sm text-foreground mt-0.5">{doc.createdBy?.name || "-"}</dd>
							</div>
							<div>
								<dt className="text-xs font-medium text-muted-foreground uppercase">{t('documents.createdAt')}</dt>
								<dd className="text-sm text-foreground mt-0.5">{formatDate(doc.createdAt)}</dd>
							</div>
							{doc.completedAt && (
								<div>
									<dt className="text-xs font-medium text-muted-foreground uppercase">{t('status.COMPLETED')}</dt>
									<dd className="text-sm text-foreground mt-0.5">{formatDate(doc.completedAt)}</dd>
								</div>
							)}
						</dl>
					</div>

					{/* Status Actions */}
					{isDraft && (
						<div className="bg-card border border-border rounded-lg p-6">
							<h3 className="text-lg font-semibold text-foreground mb-3">{t('documents.updateStatus')}</h3>
							<div className="space-y-2">
								<button
									type="button"
									onClick={() => handleStatusChange("PENDING_SIGNATURE")}
									className="w-full px-3 py-2 text-sm text-left border rounded-lg hover:bg-yellow-50 hover:border-yellow-300"
								>
									{t('status.PENDING_SIGNATURE')}
								</button>
								<button
									type="button"
									onClick={() => handleStatusChange("COMPLETED")}
									className="w-full px-3 py-2 text-sm text-left border rounded-lg hover:bg-green-50 hover:border-green-300"
								>
									{t('status.COMPLETED')}
								</button>
							</div>
						</div>
					)}
					{doc.status === "PENDING_SIGNATURE" && (
						<div className="bg-card border border-border rounded-lg p-6">
							<h3 className="text-lg font-semibold text-foreground mb-3">{t('documents.updateStatus')}</h3>
							<div className="space-y-2">
								<button
									type="button"
									onClick={() => handleStatusChange("SIGNED")}
									className="w-full px-3 py-2 text-sm text-left border rounded-lg hover:bg-blue-50 hover:border-blue-300"
								>
									{t('status.SIGNED')}
								</button>
								<button
									type="button"
									onClick={() => handleStatusChange("COMPLETED")}
									className="w-full px-3 py-2 text-sm text-left border rounded-lg hover:bg-green-50 hover:border-green-300"
								>
									{t('status.COMPLETED')}
								</button>
							</div>
						</div>
					)}
					{doc.status === "SIGNED" && (
						<div className="bg-card border border-border rounded-lg p-6">
							<h3 className="text-lg font-semibold text-foreground mb-3">{t('documents.updateStatus')}</h3>
							<button
								type="button"
								onClick={() => handleStatusChange("COMPLETED")}
								className="w-full px-3 py-2 text-sm text-left border rounded-lg hover:bg-green-50 hover:border-green-300"
							>
								{t('status.COMPLETED')}
							</button>
						</div>
					)}
				</div>
			</div>

			{/* Send Modal */}
			{showSendModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
					<div className="bg-card rounded-lg shadow-xl w-full max-w-md p-6">
						<h3 className="text-lg font-semibold text-foreground mb-4">{t('documents.sendEmail')}</h3>
						<div>
							<label className="block text-sm font-medium text-foreground mb-1">{t('documents.recipientEmail')}</label>
							<input
								type="email"
								value={sendEmail}
								onChange={(e) => setSendEmail(e.target.value)}
								placeholder="recipient@example.com"
								className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none"
								autoFocus
							/>
						</div>
						<div className="flex items-center justify-end gap-2 mt-6">
							<button
								type="button"
								onClick={() => setShowSendModal(false)}
								className="px-4 py-2 text-sm text-foreground border border-border rounded-lg hover:bg-muted"
							>
								{t('common.cancel')}
							</button>
							<button
								type="button"
								onClick={handleSend}
								disabled={!sendEmail || isSending}
								className="px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50"
							>
								{isSending ? t('documents.sending') : t('documents.send')}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Delete Confirmation Modal */}
			<ConfirmModal
				isOpen={showDeleteConfirm}
				title={t('documents.deleteDocument')}
				message={t('documents.confirmDelete')}
				confirmLabel={t('common.delete')}
				variant="danger"
				isLoading={isDeleting}
				onConfirm={handleDeleteConfirm}
				onCancel={() => setShowDeleteConfirm(false)}
			/>
		</div>
	);
}
