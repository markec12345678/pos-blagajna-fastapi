export function BarChart({ data, height = 150, color = '#059669', label }: {
  data: { label: string; value: number }[]; height?: number; color?: string; label?: string
}) {
  const max = Math.max(...data.map(d => d.value), 1)
  const barW = Math.max(8, Math.min(40, Math.floor(300 / data.length) - 2))
  const totalW = data.length * (barW + 2)
  return (
    <div>
      {label && <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6, fontWeight: 600 }}>{label}</div>}
      <svg width="100%" viewBox={`0 0 ${Math.max(totalW, 100)} ${height + 24}`} style={{ overflow: 'visible' }}>
        {data.map((d, i) => {
          const barH = max > 0 ? (d.value / max) * height : 0
          const x = i * (barW + 2) + 2
          const y = height - barH
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={barH} rx={3} fill={color} opacity={0.85}>
                <title>{`${d.label}: ${d.value.toFixed(2)} €`}</title>
              </rect>
              {barH > 14 && (
                <text x={x + barW / 2} y={y + 12} textAnchor="middle" fill="white" fontSize={9} fontWeight={600}>
                  {d.value >= 1000 ? `${(d.value / 1000).toFixed(1)}k` : Math.round(d.value)}
                </text>
              )}
              {data.length <= 14 && (
                <text x={x + barW / 2} y={height + 14} textAnchor="middle" fill="#94a3b8" fontSize={8}>
                  {d.label}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export function LineChart({ data, height = 120, color = '#059669', label }: {
  data: { label: string; value: number }[]; height?: number; color?: string; label?: string
}) {
  const max = Math.max(...data.map(d => d.value), 1)
  const w = Math.max(200, data.length * 30)
  const step = data.length > 1 ? (w - 20) / (data.length - 1) : 0
  const pts = data.map((d, i) => {
    const x = 10 + i * step
    const y = 5 + (1 - d.value / max) * (height - 10)
    return `${x},${y}`
  })
  const areaPts = pts.join(' ') + ` ${10 + (data.length - 1) * step},${height} 10,${height}`
  return (
    <div>
      {label && <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6, fontWeight: 600 }}>{label}</div>}
      <svg width="100%" viewBox={`0 0 ${w} ${height + 20}`} style={{ overflow: 'visible' }}>
        <polygon points={areaPts} fill={color} opacity={0.1} />
        <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {data.map((d, i) => {
          const x = 10 + i * step
          const y = 5 + (1 - d.value / max) * (height - 10)
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={3} fill={color} stroke="white" strokeWidth={1.5}>
                <title>{`${d.label}: ${d.value.toFixed(2)} €`}</title>
              </circle>
              {data.length <= 12 && (
                <text x={x} y={height + 14} textAnchor="middle" fill="#94a3b8" fontSize={7}>
                  {d.label}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export function DonutChart({ data, size = 120, label }: {
  data: { label: string; value: number; color: string }[]; size?: number; label?: string
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1
  const r = size / 2 - 8
  const cx = size / 2
  const cy = size / 2
  let cum = 0
  const arcs = data.filter(d => d.value > 0).map(d => {
    const start = cum / total * Math.PI * 2 - Math.PI / 2
    cum += d.value
    const end = cum / total * Math.PI * 2 - Math.PI / 2
    const large = (end - start) > Math.PI ? 1 : 0
    const x1 = cx + r * Math.cos(start)
    const y1 = cy + r * Math.sin(start)
    const x2 = cx + r * Math.cos(end)
    const y2 = cy + r * Math.sin(end)
    return { ...d, path: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z` }
  })
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <svg width={size} height={size}>
        {arcs.map((a, i) => (
          <path key={i} d={a.path} fill={a.color} opacity={0.85}>
            <title>{`${a.label}: ${a.value} (${(a.value / total * 100).toFixed(0)}%)`}</title>
          </path>
        ))}
        <circle cx={cx} cy={cy} r={r * 0.55} fill="var(--surface)" />
        <text x={cx} y={cy - 4} textAnchor="middle" fill="var(--text)" fontSize={14} fontWeight={700}>{total}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill="var(--text2)" fontSize={8}>skupaj</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {data.filter(d => d.value > 0).map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color, flexShrink: 0 }} />
            <span style={{ color: 'var(--text2)' }}>{d.label}</span>
            <span style={{ fontWeight: 600 }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
