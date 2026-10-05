import { test, expect } from '@playwright/test';

test.describe('DOM Provenance Enforcement (§8.6)', () => {
  const PROVENANCE_EVAL_FN = () => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const violations: { text: string; tag: string; classes: string }[] = [];
    const digitRegex = /[0-9]/;
    const validKinds = new Set(['LIVE', 'REPLAY', 'SYNTH', 'ASSUMPTION', 'USER']);
    const validReasons = new Set(['date', 'version', 'axis-tick', 'scene-id', 'hash', 'map-control', 'id']);

    let node: Node | null;
    while ((node = walker.nextNode())) {
      const text = node.textContent?.trim() || '';
      if (!digitRegex.test(text)) continue;

      let curr = node.parentElement;
      let isGuarded = false;

      while (curr) {
        // Exclude script, style, SVG defs, and maplibre controls if tagged
        const tag = curr.tagName.toLowerCase();
        if (tag === 'script' || tag === 'style') {
          isGuarded = true;
          break;
        }

        const prov = curr.getAttribute('data-prov');
        if (prov && validKinds.has(prov)) {
          isGuarded = true;
          break;
        }

        const exempt = curr.getAttribute('data-prov-exempt');
        if (exempt && validReasons.has(exempt)) {
          isGuarded = true;
          break;
        }

        // MapLibre internal control attribution
        if (curr.classList?.contains('maplibregl-ctrl') || curr.classList?.contains('maplibregl-ctrl-attrib')) {
          isGuarded = true;
          break;
        }

        curr = curr.parentElement;
      }

      if (!isGuarded) {
        violations.push({
          text,
          tag: node.parentElement?.tagName || 'UNKNOWN',
          classes: node.parentElement?.className || '',
        });
      }
    }
    return violations;
  };

  test('every DOM text node with a digit must have data-prov or reasoned data-prov-exempt', async ({
    page,
  }) => {
    await page.goto('/?lite=1');
    await page.waitForSelector('.alloc-table');

    const violations = await page.evaluate(PROVENANCE_EVAL_FN);
    expect(violations).toEqual([]);
  });

  test('negative variant: fails immediately if an unexempted hardcoded number is injected', async ({
    page,
  }) => {
    await page.goto('/?lite=1');
    await page.waitForSelector('.alloc-table');

    // Inject an unprovenanced, unexempted number into the DOM
    await page.evaluate(() => {
      const badDiv = document.createElement('div');
      badDiv.id = 'injected-bad-number';
      badDiv.textContent = 'Unprovenanced leakage: 999.99';
      document.body.appendChild(badDiv);
    });

    const violations = await page.evaluate(PROVENANCE_EVAL_FN);
    expect(violations.length).toBeGreaterThan(0);
    expect(violations.some((v) => v.text.includes('999.99'))).toBe(true);
  });
});
