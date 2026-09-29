import React, { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const T = {
  en: { title:'AquaPulse — Guaranteed Water Ledger', lang:'हिंदी', stress:'Zone Stress', pool:'Weekly Pool', verified:'Verified Total', mstar:'Safe-Yield Cap (m*)', farmer:'Farmer', acres:'Acres', rep:'Reported h', elec:'Elec h', trust:'Trust', verH:'Verified h', alloc:'Alloc h', note:'Zone-A worked example — synthetic world [M] = measured by stress harness' },
  hi: { title:'एक्वापल्स — प्रमाणित जल बहीखाता', lang:'English', stress:'ज़ोन तनाव', pool:'साप्ताहिक पूल', verified:'सत्यापित कुल', mstar:'सुरक्षित-उपज सीमा', farmer:'किसान', acres:'एकड़', rep:'रिपोर्ट घं', elec:'बिजली घं', trust:'विश्वास', verH:'सत्यापित घं', alloc:'आवंटन घं', note:'Zone-A कार्यकारी उदाहरण — सिंथेटिक दुनिया' }
}

const FARMERS = [
  { id:'A', acres:7,   rep:28, elec:28, trust:1.000, ver:28.0, alloc:28.0 },
  { id:'B', acres:7.5, rep:30, elec:30, trust:1.000, ver:30.0, alloc:30.0 },
  { id:'C', acres:5,   rep:20, elec:50, trust:0.400, ver:38.0, alloc:26.0 },
  { id:'D', acres:9.5, rep:38, elec:36, trust:0.947, ver:28.8, alloc:20.0 },
]

const badgeClass = (p: number) => p > 100 ? 'over' : p >= 90 ? 'critical' : p > 70 ? 'semi' : 'safe'
const label = (p: number) => p > 100 ? 'Over-exploited' : p >= 90 ? 'Critical' : p > 70 ? 'Semi-Critical' : 'Safe'

export default function App() {
  const [lang, setLang] = useState<'en'|'hi'>('en')
  const tx = T[lang]
  const stress = 96.0, pool = 104.0, verified = 124.8, mstar = 0.80
  const chart = FARMERS.map(f => ({ name:`F${f.id}`, rep:f.rep, elec:f.elec, ver:f.ver, alloc:f.alloc }))

  return (
    <div className="app">
      <header>
        <h1>{tx.title}</h1>
        <button className="lang" onClick={() => setLang(lang==='en'?'hi':'en')}>{tx.lang}</button>
      </header>

      <div className="grid">
        <div className="card"><div className="label">{tx.stress}</div><div className="val">{stress}%</div><span className={`badge ${badgeClass(stress)}`}>{label(stress)}</span></div>
        <div className="card"><div className="label">{tx.pool}</div><div className="val">{pool} h</div></div>
        <div className="card"><div className="label">{tx.verified}</div><div className="val">{verified} h</div></div>
        <div className="card"><div className="label">{tx.mstar}</div><div className="val">{mstar}</div></div>
      </div>

      <div className="chart-box">
        <div className="label" style={{marginBottom:'1rem'}}>Hours per Farmer</div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chart}>
            <XAxis dataKey="name" stroke="#475569"/>
            <YAxis stroke="#475569"/>
            <Tooltip contentStyle={{background:'#1e293b',border:'1px solid #334155'}}/>
            <Bar dataKey="rep"   fill="#38bdf8" name="Reported"/>
            <Bar dataKey="elec"  fill="#818cf8" name="Elec-Implied"/>
            <Bar dataKey="ver"   fill="#34d399" name="Verified"/>
            <Bar dataKey="alloc" fill="#fb923c" name="Allocated"/>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="tbl">
        <table>
          <thead><tr>
            <th>{tx.farmer}</th><th>{tx.acres}</th><th>{tx.rep}</th>
            <th>{tx.elec}</th><th>{tx.trust}</th><th>{tx.verH}</th><th>{tx.alloc}</th>
          </tr></thead>
          <tbody>
            {FARMERS.map(f=>(
              <tr key={f.id}>
                <td className="bold">Farmer {f.id}</td>
                <td>{f.acres}</td><td>{f.rep}</td><td>{f.elec}</td>
                <td className={f.trust>=0.8?'green':'orange'}>{f.trust.toFixed(3)}</td>
                <td>{f.ver.toFixed(1)}</td>
                <td className="bold">{f.alloc.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="note">{tx.note}</p>
    </div>
  )
}
