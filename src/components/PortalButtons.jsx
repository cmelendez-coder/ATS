export default function PortalButtons() {
  return (
    <>
      <style>{`
        @keyframes portalGlow {
          0%, 100% { box-shadow: 0 0 0px 0px rgba(109,179,58,0.0), 0 2px 8px rgba(0,0,0,0.12); opacity: 0.75; }
          50%       { box-shadow: 0 0 22px 6px rgba(109,179,58,0.55), 0 0 40px 14px rgba(109,179,58,0.2), 0 4px 16px rgba(0,0,0,0.2); opacity: 1; }
        }
        .portal-glow { animation: portalGlow 2.5s ease-in-out infinite; }
        .portal-glow:hover { animation: none; opacity: 1; box-shadow: 0 0 28px 8px rgba(109,179,58,0.7), 0 4px 20px rgba(0,0,0,0.25); transform: scale(1.04); }
      `}</style>
      <div className="flex gap-3 shrink-0">
        <a href="https://hr-everscalegroup.netlify.app" target="_blank" rel="noopener noreferrer"
          className="portal-glow flex items-center rounded-2xl border border-outline-variant/30 bg-white overflow-hidden px-4 py-2 transition-transform cursor-pointer">
          <img src="/portals/hr-portal.png" alt="HR Portal" className="h-16 w-auto object-contain" />
        </a>
        <a href="https://clients-everscalegroup.netlify.app/login" target="_blank" rel="noopener noreferrer"
          className="portal-glow flex items-center rounded-2xl border border-outline-variant/30 bg-white overflow-hidden px-4 py-2 transition-transform cursor-pointer">
          <img src="/portals/client-portal.png" alt="Client Portal" className="h-16 w-auto object-contain" />
        </a>
      </div>
    </>
  )
}
