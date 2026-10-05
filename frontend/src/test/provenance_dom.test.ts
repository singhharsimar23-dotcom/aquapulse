import { describe, it, expect } from 'vitest';

interface MockNode {
  text?: string;
  tag?: string;
  attributes?: Record<string, string>;
  children?: MockNode[];
}

function validateProvenanceTree(node: MockNode, parentGuarded = false): string[] {
  const violations: string[] = [];
  const validKinds = new Set(['LIVE', 'REPLAY', 'SYNTH', 'ASSUMPTION', 'USER']);
  const validReasons = new Set(['date', 'version', 'axis-tick', 'scene-id', 'hash', 'map-control', 'id']);

  let currentGuarded = parentGuarded;
  if (node.attributes) {
    const prov = node.attributes['data-prov'];
    if (prov && validKinds.has(prov)) {
      currentGuarded = true;
    }
    const exempt = node.attributes['data-prov-exempt'];
    if (exempt && validReasons.has(exempt)) {
      currentGuarded = true;
    }
  }

  if (node.text) {
    const text = node.text.trim();
    if (/[0-9]/.test(text) && !currentGuarded) {
      violations.push(text);
    }
  }

  if (node.children) {
    for (const child of node.children) {
      violations.push(...validateProvenanceTree(child, currentGuarded));
    }
  }

  return violations;
}

describe('Provenance Tree Validator Logic (§8.6)', () => {
  it('passes on properly wrapped data-prov and data-prov-exempt elements', () => {
    const tree: MockNode = {
      tag: 'div',
      children: [
        {
          tag: 'span',
          attributes: { 'data-prov': 'LIVE' },
          children: [{ text: '42.5' }, { text: ' m3' }],
        },
        {
          tag: 'span',
          attributes: { 'data-prov-exempt': 'date' },
          children: [{ text: '2026-10-05' }],
        },
        {
          tag: 'span',
          attributes: { 'data-prov-exempt': 'axis-tick' },
          children: [{ text: 'W10' }],
        },
        {
          tag: 'span',
          attributes: { 'data-prov': 'SYNTH' },
          children: [{ text: 'Farmer A: 28.0' }],
        },
      ],
    };

    const violations = validateProvenanceTree(tree);
    expect(violations).toEqual([]);
  });

  it('negative variant: detects and flags unprovenanced hardcoded digits', () => {
    const tree: MockNode = {
      tag: 'div',
      children: [
        {
          tag: 'span',
          attributes: { 'data-prov': 'LIVE' },
          children: [{ text: '42.5' }],
        },
        {
          tag: 'div',
          children: [{ text: 'Unchecked literal: 130.0' }],
        },
      ],
    };

    const violations = validateProvenanceTree(tree);
    expect(violations.length).toBeGreaterThan(0);
    expect(violations).toContain('Unchecked literal: 130.0');
  });

  it('negative variant: rejects invalid exemption reasons', () => {
    const tree: MockNode = {
      tag: 'div',
      children: [
        {
          tag: 'span',
          attributes: { 'data-prov-exempt': 'invalid-reason' },
          children: [{ text: '99.9' }],
        },
      ],
    };

    const violations = validateProvenanceTree(tree);
    expect(violations).toContain('99.9');
  });
});
