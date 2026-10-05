import { describe, it, expect } from 'vitest';
import {
  leaf,
  leafSync,
  root,
  rootSync,
  toHex,
  generateProof,
  verifyProof,
  verifyProofSync,
  cloneAndTamper,
} from '../src/merkle.js';

describe('Merkle Single-Bit & Proof Tests', () => {
  it('any single-bit change in any leaf field changes the root', async () => {
    const baseFields = ['F-A', 'zone-a', '2026-W10', '25.103448'];
    const leaves = [
      leafSync(baseFields),
      leafSync(['F-B', 'zone-a', '2026-W10', '26.896552']),
      leafSync(['F-C', 'zone-a', '2026-W10', '17.931034']),
      leafSync(['F-D', 'zone-a', '2026-W10', '34.068966']),
    ];

    const baseRoot = toHex(rootSync(leaves));

    // Flip each bit in each character of each field
    for (let fieldIdx = 0; fieldIdx < baseFields.length; fieldIdx++) {
      const originalField = baseFields[fieldIdx];
      for (let charIdx = 0; charIdx < originalField.length; charIdx++) {
        const charCode = originalField.charCodeAt(charIdx);
        for (let bit = 0; bit < 8; bit++) {
          const flippedCode = charCode ^ (1 << bit);
          const modifiedField =
            originalField.substring(0, charIdx) +
            String.fromCharCode(flippedCode) +
            originalField.substring(charIdx + 1);

          const modifiedFields = [...baseFields];
          modifiedFields[fieldIdx] = modifiedField;

          const modifiedLeaf = leafSync(modifiedFields);
          const modifiedLeaves = [modifiedLeaf, leaves[1], leaves[2], leaves[3]];
          const modifiedRoot = toHex(rootSync(modifiedLeaves));

          expect(modifiedRoot).not.toBe(baseRoot);
        }
      }
    }
  });

  it('generates and verifies Merkle inclusion proofs (async WebCrypto + sync)', async () => {
    const leaves = [
      leafSync(['F-A', 'zone-a', '2026-W10', '25.103448']),
      leafSync(['F-B', 'zone-a', '2026-W10', '26.896552']),
      leafSync(['F-C', 'zone-a', '2026-W10', '17.931034']),
      leafSync(['F-D', 'zone-a', '2026-W10', '34.068966']),
    ];

    for (let i = 0; i < leaves.length; i++) {
      const proof = generateProof(leaves, i);
      const okSync = verifyProofSync(proof);
      expect(okSync).toBe(true);

      const okAsync = await verifyProof(proof);
      expect(okAsync).toBe(true);

      // Corrupt proof sibling -> fails
      const corruptedProof = {
        ...proof,
        steps: proof.steps.map((s, idx) =>
          idx === 0 ? { ...s, sibling: '0'.repeat(64) } : s
        ),
      };
      expect(verifyProofSync(corruptedProof)).toBe(false);
      expect(await verifyProof(corruptedProof)).toBe(false);
    }
  });

  it('simulates tamper on clone with byte difference', () => {
    const leaves = [
      leafSync(['F-A', 'zone-a', '2026-W10', '25.103448']),
      leafSync(['F-B', 'zone-a', '2026-W10', '26.896552']),
      leafSync(['F-C', 'zone-a', '2026-W10', '17.931034']),
      leafSync(['F-D', 'zone-a', '2026-W10', '34.068966']),
    ];

    const result = cloneAndTamper(leaves, 2, ['F-C', 'zone-a', '2026-W10', '27.931034']);
    expect(result.originalRoot).not.toBe(result.tamperedRoot);
    expect(result.byteDiffCount).toBeGreaterThan(0);
    // Original leaves unmodified
    expect(toHex(rootSync(leaves))).toBe(result.originalRoot);
  });
});
