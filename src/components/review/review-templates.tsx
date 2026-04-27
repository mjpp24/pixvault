// Shared review template components — used by the review showcase page and the notification bell preview modal

export interface TemplateProps {
  photo: string
  clientName: string
  rating: number
  reviewText: string
  bizName: string
  brandColor: string
  width: number
  height: number
}

export function Stars({ rating, size = 20, color = '#f59e0b' }: { rating: number; size?: number; color?: string }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} width={size} height={size} viewBox="0 0 24 24"
          fill={s <= rating ? color : 'none'} stroke={color} strokeWidth={1.5}>
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
        </svg>
      ))}
    </div>
  )
}

// ── T1: Purple-to-pink gradient, photo right, text left ─────────────────────
export function T1({ photo, clientName, rating, reviewText, bizName, width, height }: TemplateProps) {
  return (
    <div style={{ width, height, position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)', fontFamily: 'Georgia, serif', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 40 }}>
      <div style={{ color: 'white' }}>
        <p style={{ fontSize: 13, letterSpacing: 4, opacity: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>Customer</p>
        <p style={{ fontSize: 38, fontStyle: 'italic', lineHeight: 1.1, fontWeight: 700 }}>Review</p>
      </div>
      {photo && <img src={photo} alt="" style={{ position: 'absolute', right: 0, top: 0, width: '55%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />}
      <div style={{ position: 'absolute', right: 0, top: 0, width: '55%', height: '100%', background: 'linear-gradient(to right, rgba(124,58,237,0.95) 0%, rgba(124,58,237,0.2) 60%, transparent 100%)' }} />
      <div style={{ color: 'white', maxWidth: '52%', zIndex: 2 }}>
        <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{clientName}</p>
        <Stars rating={rating} size={16} color="#fde68a" />
        <p style={{ fontSize: 13, opacity: 0.9, marginTop: 10, lineHeight: 1.6 }}>{reviewText}</p>
      </div>
      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', zIndex: 2 }}>{bizName}</p>
    </div>
  )
}

// ── T2: White, phone mockup left, testimonial card right ────────────────────
export function T2({ photo, clientName, rating, reviewText, bizName, width, height }: TemplateProps) {
  return (
    <div style={{ width, height, background: '#fff', display: 'flex', alignItems: 'center', gap: 0, fontFamily: 'system-ui, sans-serif', overflow: 'hidden' }}>
      <div style={{ width: '45%', height: '100%', flexShrink: 0, position: 'relative' }}>
        <div style={{ width: 180, height: 360, background: '#111', borderRadius: 28, margin: '20px auto', overflow: 'hidden', border: '8px solid #111', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', position: 'relative' }}>
          {photo
            ? <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
            : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#667eea,#764ba2)' }} />
          }
        </div>
      </div>
      <div style={{ flex: 1, padding: '0 32px 0 0' }}>
        <p style={{ fontSize: 28, fontStyle: 'italic', color: '#1a1a1a', fontFamily: 'Georgia, serif', marginBottom: 16 }}>Testimonial</p>
        <div style={{ background: '#f9f9f9', borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <p style={{ fontWeight: 700, fontSize: 14, color: '#1a1a1a', marginBottom: 8 }}>{clientName}</p>
          <p style={{ fontSize: 12, color: '#555', lineHeight: 1.7, marginBottom: 12 }}>{reviewText}</p>
          <Stars rating={rating} size={14} color="#f59e0b" />
        </div>
        <p style={{ fontSize: 10, letterSpacing: 3, color: '#999', textTransform: 'uppercase' }}>{bizName}</p>
      </div>
    </div>
  )
}

// ── T3: Dark editorial, full-bleed photo, centred text ──────────────────────
export function T3({ photo, clientName, rating, reviewText, bizName, width, height }: TemplateProps) {
  return (
    <div style={{ width, height, position: 'relative', overflow: 'hidden', fontFamily: 'Georgia, serif' }}>
      {photo
        ? <img src={photo} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.35)' }} />
        : <div style={{ position: 'absolute', inset: 0, background: '#111' }} />
      }
      <div style={{ position: 'relative', zIndex: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 50px' }}>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 40, lineHeight: 1, marginBottom: 10 }}>"</p>
        <p style={{ color: 'white', fontSize: 22, fontStyle: 'italic', lineHeight: 1.5, fontWeight: 300, marginBottom: 28 }}>{reviewText || 'Amazing experience, highly recommend!'}</p>
        <Stars rating={rating} size={18} color="#f59e0b" />
        <div style={{ marginTop: 28, borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: 20 }}>
          <p style={{ color: 'white', fontWeight: 700, fontSize: 18 }}>{clientName}</p>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', marginTop: 4 }}>{bizName}</p>
        </div>
      </div>
    </div>
  )
}

// ── T4: Light beige, centered phone mockup, brand-colour stars ───────────────
export function T4({ photo, clientName, rating, reviewText, bizName, brandColor, width, height }: TemplateProps) {
  return (
    <div style={{ width, height, background: '#fdf8f4', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: 40, fontFamily: 'system-ui, sans-serif', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: brandColor + '18' }} />
      <div style={{ position: 'absolute', bottom: -60, left: -40, width: 200, height: 200, borderRadius: '50%', background: brandColor + '12' }} />
      <div style={{ width: 140, height: 280, borderRadius: 24, overflow: 'hidden', border: '6px solid #111', boxShadow: '0 16px 48px rgba(0,0,0,0.2)', marginBottom: 24, flexShrink: 0 }}>
        {photo
          ? <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
          : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#667eea,#764ba2)' }} />
        }
      </div>
      <Stars rating={rating} size={18} color={brandColor} />
      <p style={{ fontWeight: 700, fontSize: 16, color: '#1a1a1a', marginTop: 12, marginBottom: 8 }}>{clientName}</p>
      <p style={{ fontSize: 13, color: '#555', textAlign: 'center', lineHeight: 1.7, maxWidth: 260 }}>{reviewText}</p>
      <p style={{ marginTop: 20, fontSize: 10, letterSpacing: 3, color: '#aaa', textTransform: 'uppercase' }}>{bizName}</p>
    </div>
  )
}

// ── T5: Dark navy, photo top half, branded pill badge ───────────────────────
export function T5({ photo, clientName, rating, reviewText, bizName, brandColor, width, height }: TemplateProps) {
  return (
    <div style={{ width, height, background: '#1a1a2e', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ flex: 1, position: 'relative' }}>
        {photo
          ? <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', opacity: 0.6 }} />
          : <div style={{ width: '100%', height: '100%', background: '#2a2a4e' }} />
        }
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%', background: 'linear-gradient(to top, #1a1a2e, transparent)' }} />
      </div>
      <div style={{ padding: '24px 32px 32px', background: '#1a1a2e' }}>
        <div style={{ display: 'inline-block', background: brandColor, borderRadius: 20, padding: '4px 14px', marginBottom: 14 }}>
          <p style={{ color: 'white', fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>Client Review</p>
        </div>
        <Stars rating={rating} size={16} color="#f59e0b" />
        <p style={{ color: 'white', fontSize: 15, lineHeight: 1.7, margin: '12px 0 16px', fontStyle: 'italic' }}>"{reviewText}"</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>{clientName}</p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase' }}>{bizName}</p>
        </div>
      </div>
    </div>
  )
}

// ── T6: Warm cream / brown, "Customer Testimonial" serif heading ─────────────
export function T6({ photo, clientName, rating, reviewText, bizName, brandColor, width, height }: TemplateProps) {
  return (
    <div style={{ width, height, background: '#e8e0d8', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 36, fontFamily: 'Georgia, serif', overflow: 'hidden', position: 'relative' }}>
      <div>
        <p style={{ fontSize: 32, fontStyle: 'italic', color: '#3d2b1f', marginBottom: 6 }}>Customer</p>
        <p style={{ fontSize: 48, fontStyle: 'italic', fontWeight: 700, color: '#3d2b1f', lineHeight: 1 }}>Testimonial</p>
      </div>
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        <div style={{ width: 100, height: 140, borderRadius: 12, overflow: 'hidden', flexShrink: 0, boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
          {photo
            ? <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
            : <div style={{ width: '100%', height: '100%', background: '#c5a98a' }} />
          }
        </div>
        <div style={{ flex: 1 }}>
          <Stars rating={rating} size={16} color={brandColor} />
          <p style={{ fontWeight: 700, fontSize: 15, color: '#3d2b1f', margin: '8px 0 6px', fontFamily: 'system-ui, sans-serif' }}>{clientName}</p>
          <p style={{ fontSize: 12, color: '#7a6050', lineHeight: 1.7, fontFamily: 'system-ui, sans-serif' }}>{reviewText}</p>
        </div>
      </div>
      <p style={{ fontSize: 10, letterSpacing: 4, color: '#a08070', textTransform: 'uppercase', fontFamily: 'system-ui, sans-serif' }}>{bizName}</p>
    </div>
  )
}

// ── T7: Pink "Phone Mockup" with blobs (bell preview default) ───────────────
export function T7({ photo, clientName, rating, reviewText, width, height }: TemplateProps) {
  return (
    <div style={{ width, height, background: '#fde8d8', borderRadius: 0, position: 'relative', overflow: 'hidden', fontFamily: 'system-ui' }}>
      <div style={{ position: 'absolute', top: -40, left: -30, width: 160, height: 160, borderRadius: '50%', background: '#ff6b9d' }} />
      <div style={{ position: 'absolute', top: -20, right: -40, width: 130, height: 130, borderRadius: '50%', background: '#ff6b9d' }} />
      <div style={{ position: 'absolute', bottom: -20, left: -10, width: 80, height: 80, borderRadius: '50%', background: '#ffd93d' }} />
      <p style={{ position: 'absolute', top: 28, left: 0, right: 0, textAlign: 'center', color: 'white', fontSize: Math.round(height * 0.056), fontWeight: 800, fontStyle: 'italic', zIndex: 2, letterSpacing: -0.5 }}>Testimonial</p>
      <svg style={{ position: 'absolute', top: 65, left: 16, zIndex: 2 }} width="70" height="18" viewBox="0 0 70 18">
        <path d="M4 14 Q14 2 24 14 Q34 26 44 14 Q54 2 66 14" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" />
      </svg>
      <div style={{ position: 'absolute', right: 14, top: 55, width: Math.round(width * 0.43), height: Math.round(height * 0.59), background: '#111', borderRadius: 24, overflow: 'hidden', border: '7px solid #1a1a1a', boxShadow: '0 20px 50px rgba(0,0,0,0.35)', zIndex: 2 }}>
        {photo
          ? <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
          : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#667eea,#764ba2)' }} />
        }
      </div>
      <div style={{ position: 'absolute', left: 14, bottom: Math.round(height * 0.1), width: Math.round(width * 0.5), background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(12px)', borderRadius: 16, padding: '14px', zIndex: 3 }}>
        <p style={{ color: '#ff6b9d', fontWeight: 800, fontSize: Math.round(height * 0.04), marginBottom: 4 }}>{clientName}</p>
        <p style={{ color: '#666', fontSize: Math.round(height * 0.024), lineHeight: 1.5 }}>{reviewText || 'Amazing experience!'}</p>
        <div style={{ marginTop: 8 }}><Stars rating={rating} size={Math.round(height * 0.026)} /></div>
      </div>
    </div>
  )
}

export const TEMPLATES = [
  { id: 1, name: 'Purple Gradient',  Component: T1, w: 480, h: 480 },
  { id: 2, name: 'Phone Mockup',     Component: T2, w: 480, h: 320 },
  { id: 3, name: 'Dark Editorial',   Component: T3, w: 480, h: 480 },
  { id: 4, name: 'Clean & Minimal',  Component: T4, w: 380, h: 540 },
  { id: 5, name: 'Night Mode',       Component: T5, w: 380, h: 540 },
  { id: 6, name: 'Warm Classic',     Component: T6, w: 480, h: 380 },
  { id: 7, name: 'Pink Testimonial', Component: T7, w: 380, h: 460 },
]
