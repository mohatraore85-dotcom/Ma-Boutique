import React, { useState } from 'react'
import { X } from 'lucide-react'

export const C = {
  ink: "#241B12", bg: "#F8F3E6", surface: "#FFFFFF", line: "#E7DCC0",
  indigo: "#2B3A67", indigoD: "#1C2747", ochre: "#B8752E", rust: "#A5432D",
  green: "#3F6B41", mustard: "#C6900F", momo: "#2E7D6B", faint: "#8A7B5E",
  orange: "#FF6600",
}

export const ACCENTS = [
  { id: "indigo", hex: "#2B3A67", label: "Indigo" },
  { id: "banco", hex: "#8B5A2B", label: "Banco" },
  { id: "foret", hex: "#2F5233", label: "Forêt" },
  { id: "vin", hex: "#5C2A3D", label: "Vin" },
  { id: "nuit", hex: "#1C2747", label: "Nuit" },
]
export const LOGO_EMOJIS = ["🏪", "🛍️", "🧺", "🥭", "🐐", "👕", "🧴", "📦"]

export const FCFA = (n) => Math.round(n).toLocaleString("fr-FR").replace(/,/g, " ") + " FCFA"
export const uid = () => Math.random().toString(36).slice(2, 10)

export function BogolanStrip({ height = 10 }) {
  return (
    <svg width="100%" height={height} viewBox="0 0 200 10" preserveAspectRatio="none" style={{ display: "block" }}>
      <defs>
        <pattern id="bogolan" width="20" height="10" patternUnits="userSpaceOnUse">
          <rect width="20" height="10" fill={C.bg} />
          <polygon points="0,10 5,0 10,10" fill={C.ochre} />
          <polygon points="10,10 15,0 20,10" fill={C.indigo} />
        </pattern>
      </defs>
      <rect width="200" height="10" fill="url(#bogolan)" />
    </svg>
  )
}

export function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600;700;800&family=Caveat:wght@600;700&display=swap');
      body { font-family: 'Inter', sans-serif; background: ${C.bg}; }
      button:focus-visible, input:focus-visible { outline: 3px solid ${C.mustard}; outline-offset: 1px; }
    `}</style>
  )
}

export function BigButton({ children, onClick, color = C.indigo, style, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? C.line : color, color: disabled ? C.faint : "#fff",
        border: "none", borderRadius: 14, padding: "16px 20px", fontSize: 17, fontWeight: 700,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%",
        cursor: disabled ? "not-allowed" : "pointer", boxShadow: disabled ? "none" : "0 4px 0 rgba(0,0,0,0.15)",
        ...style,
      }}
      onMouseDown={(e) => { if (!disabled) e.currentTarget.style.transform = "translateY(3px)" }}
      onMouseUp={(e) => { e.currentTarget.style.transform = "translateY(0)" }}
    >
      {children}
    </button>
  )
}

export function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(36,27,18,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.bg, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto", borderRadius: "22px 22px 0 0", padding: "18px 18px 28px", boxShadow: "0 -8px 30px rgba(0,0,0,0.25)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700, color: C.ink, margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: C.line, border: "none", borderRadius: 999, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <X size={18} color={C.ink} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: C.faint, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</label>
      {children}
    </div>
  )
}

export const inputStyle = { width: "100%", padding: "13px 14px", fontSize: 16, borderRadius: 10, border: `2px solid ${C.line}`, background: "#fff", color: C.ink, boxSizing: "border-box", fontFamily: "'Inter', sans-serif" }

export function Card({ children, style }) {
  return <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 16, padding: 16, marginBottom: 14, ...style }}>{children}</div>
}

export const linkBtn = { background: "none", border: "none", color: C.indigo, fontWeight: 700, cursor: "pointer", padding: 0, fontSize: 13 }
export const stepBtn = { width: 40, height: 40, borderRadius: 10, border: `2px solid ${C.line}`, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.ink, flexShrink: 0 }
export const ghostBtn = { flex: 1, background: "#fff", border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 0", fontWeight: 700, color: C.ink, cursor: "pointer" }
export const textDangerBtn = { width: "100%", background: "none", border: "none", color: C.rust, fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", padding: "8px 0" }

export function productProfitSummary(productId, sales) {
  let received = 0, pending = 0
  sales.filter((s) => s.productId === productId).forEach((s) => {
    const f = s.total > 0 ? Math.min(1, (s.paidAmount || 0) / s.total) : 1
    received += s.profit * f; pending += s.profit * (1 - f)
  })
  return { received, pending }
}
export function allTimeProfitTotals(sales) {
  let received = 0, pending = 0
  sales.forEach((s) => {
    const f = s.total > 0 ? Math.min(1, (s.paidAmount || 0) / s.total) : 1
    received += s.profit * f; pending += s.profit * (1 - f)
  })
  return { received, pending }
}
