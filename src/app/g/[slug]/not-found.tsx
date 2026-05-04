export default function GalleryNotFound() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-full bg-gray-900 flex items-center justify-center mx-auto mb-6">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Gallery not found</h1>
        <p className="text-gray-400 text-sm leading-relaxed">
          This gallery link doesn&apos;t exist, may have expired, or hasn&apos;t been published yet.
          Please contact your photographer for the correct link.
        </p>
      </div>
    </div>
  )
}
