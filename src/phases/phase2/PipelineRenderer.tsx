// src/phases/phase2/PipelineRenderer.tsx

import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { useAsciiFrame } from '../../engine/AsciiAnimator';

export const PipelineRenderer: React.FC = () => {
  const units = useGameStore(state => state.automationUnits);
  const flow = useAsciiFrame('pipeline_flow');

  // Find counts of units
  const scraper = units.find(u => u.id === 'scraper')?.count || 0;
  const compiler = units.find(u => u.id === 'compiler')?.count || 0;
  const daemon = units.find(u => u.id === 'daemon')?.count || 0;
  const buffer = units.find(u => u.id === 'buffer')?.count || 0;
  const reaper = units.find(u => u.id === 'reaper')?.count || 0;
  const lattice = units.find(u => u.id === 'lattice')?.count || 0;

  // Let's create an animated ASCII canvas.
  // We can write it inside a <pre> element.
  return (
    <div className="pipeline-renderer" style={{ fontFamily: 'Share Tech Mono, monospace', color: 'var(--terminal-green)' }}>
      <div style={{ marginBottom: '8px', borderBottom: '1px dashed var(--terminal-green)', paddingBottom: '4px', fontWeight: 'bold' }}>
        PIPELINE VIEW — SECTOR ALPHA
      </div>
      <pre style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.2', background: 'rgba(0,5,0,0.4)', padding: '10px', overflowX: 'auto' }}>
{`
  [ANTENNA] ${scraper > 0 ? flow : '─────'} [SCRAPER] ${compiler > 0 ? flow : '─────'} [COMPILER]
     ~           (x${scraper})          ~→╢Logic╟         (x${compiler})  ╢Logic╟→╢Foam╟
     
  [CONDUIT] ${daemon > 0 ? flow : '─────'} [DAEMON]  ${reaper > 0 ? flow : '─────'} [REAPER]   ${lattice > 0 ? flow : '─────'} [LATTICE] ────► OUT
     W           (x${daemon})          W→╢Foam╟         (x${reaper})   ╢Logic╟   (x${lattice})   Void Echoes

  [STABILIZATION LAYER]
  [BUFFER] (x${buffer}) ${buffer > 0 ? '◀───[Waste Heat recycling active]' : '─────────────────────────────────'}
`}
      </pre>
      <div style={{ marginTop: '10px', fontSize: '0.8rem', opacity: 0.8 }}>
        <strong>LEGEND:</strong> ~ = Static Noise &middot; W = Watts &middot; ╢ ╟ = Data node processing
      </div>
    </div>
  );
};
export default PipelineRenderer;
