export default function ReportPreviewModal({ open, title, html, onClose, onDownload }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/65 backdrop-blur-sm px-4 py-6">
      <div className="w-full max-w-6xl h-[90vh] bg-surface-container-lowest rounded-3xl overflow-hidden border border-outline-variant/20 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-outline-variant/15 bg-surface/95">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Vista previa</p>
            <h3 className="text-lg font-bold text-primary truncate">{title}</h3>
          </div>
          <div className="flex items-center gap-2">
            {onDownload && (
              <button
                type="button"
                onClick={onDownload}
                className="px-4 py-2 rounded-xl border border-outline-variant/20 text-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors inline-flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                Descargar
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-outline-variant/20 text-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>

        <div className="flex-1 bg-[#e9edf4] p-4 md:p-6 overflow-hidden">
          <div className="w-full h-full bg-white rounded-2xl shadow-[0_12px_40px_rgba(15,23,42,0.14)] overflow-hidden">
            <iframe
              title={title}
              srcDoc={html}
              className="w-full h-full border-0"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
