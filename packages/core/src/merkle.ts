/**
 * §6.8 Merkle Ledger
 * - Canonical field encoding with 4-byte big-endian length prefix
 * - Numbers formatted as %.6f
 * - Leaf = SHA-256(0x00 || len(f1)||f1 || ...)
 * - Node = SHA-256(0x01 || left_32_raw || right_32_raw)
 * - Odd node promoted unchanged (never duplicate)
 * - WebCrypto SHA-256 with Node fallback
 */

// Pure JS SHA-256 implementation for synchronous operations and zero-dependency environments
function rightRotate(value: number, amount: number): number {
  return (value >>> amount) | (value << (32 - amount));
}

export function sha256Sync(data: Uint8Array): Uint8Array {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  let H0 = 0x6a09e667;
  let H1 = 0xbb67ae85;
  let H2 = 0x3c6ef372;
  let H3 = 0xa54ff53a;
  let H4 = 0x510e527f;
  let H5 = 0x9b05688c;
  let H6 = 0x1f83d9ab;
  let H7 = 0x5be0cd19;

  const dataLen = data.length;
  const bitLen = dataLen * 8;
  const padLen = (dataLen % 64 < 56 ? 56 : 120) - (dataLen % 64);
  const totalLen = dataLen + padLen + 8;
  const padded = new Uint8Array(totalLen);
  padded.set(data);
  padded[dataLen] = 0x80;

  const view = new DataView(padded.buffer);
  view.setUint32(totalLen - 4, bitLen >>> 0, false);
  view.setUint32(totalLen - 8, Math.floor(bitLen / 0x100000000), false);

  const W = new Uint32Array(64);

  for (let i = 0; i < totalLen; i += 64) {
    for (let t = 0; t < 16; t++) {
      W[t] = view.getUint32(i + t * 4, false);
    }
    for (let t = 16; t < 64; t++) {
      const s0 = rightRotate(W[t - 15], 7) ^ rightRotate(W[t - 15], 18) ^ (W[t - 15] >>> 3);
      const s1 = rightRotate(W[t - 2], 17) ^ rightRotate(W[t - 2], 19) ^ (W[t - 2] >>> 10);
      W[t] = (W[t - 16] + s0 + W[t - 7] + s1) >>> 0;
    }

    let a = H0;
    let b = H1;
    let c = H2;
    let d = H3;
    let e = H4;
    let f = H5;
    let g = H6;
    let h = H7;

    for (let t = 0; t < 64; t++) {
      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[t] + W[t]) >>> 0;
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    H0 = (H0 + a) >>> 0;
    H1 = (H1 + b) >>> 0;
    H2 = (H2 + c) >>> 0;
    H3 = (H3 + d) >>> 0;
    H4 = (H4 + e) >>> 0;
    H5 = (H5 + f) >>> 0;
    H6 = (H6 + g) >>> 0;
    H7 = (H7 + h) >>> 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, H0, false);
  outView.setUint32(4, H1, false);
  outView.setUint32(8, H2, false);
  outView.setUint32(12, H3, false);
  outView.setUint32(16, H4, false);
  outView.setUint32(20, H5, false);
  outView.setUint32(24, H6, false);
  outView.setUint32(28, H7, false);

  return out;
}

/**
 * SHA-256 with WebCrypto and fallback to Node crypto in tests.
 */
export async function sha256(data: Uint8Array): Promise<Uint8Array> {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
    const buf = await globalThis.crypto.subtle.digest('SHA-256', data as any);
    return new Uint8Array(buf);
  }
  try {
    const nodeCrypto = await import('node:crypto');
    return new Uint8Array(nodeCrypto.createHash('sha256').update(data).digest());
  } catch {
    return sha256Sync(data);
  }
}

export function toHex(buf: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < buf.length; i++) {
    hex += buf[i].toString(16).padStart(2, '0');
  }
  return hex;
}

export function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function fmt6(x: number): string {
  return x.toFixed(6);
}

/**
 * Encodes an array of canonical string fields per §6.8:
 * each field prefixed by a 4-byte big-endian length.
 */
export function encodeFields(fields: string[]): Uint8Array {
  const textEncoder = new TextEncoder();
  const encodedParts: Uint8Array[] = [];
  let totalLength = 0;

  for (const f of fields) {
    const b = textEncoder.encode(f);
    const part = new Uint8Array(4 + b.length);
    const dv = new DataView(part.buffer);
    dv.setUint32(0, b.length, false);
    part.set(b, 4);
    encodedParts.push(part);
    totalLength += part.length;
  }

  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of encodedParts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

/**
 * Computes leaf hash: SHA-256(0x00 || len(f1)||f1 || len(f2)||f2 || ...)
 */
export function leafSync(fields: string[]): Uint8Array {
  const enc = encodeFields(fields);
  const buf = new Uint8Array(1 + enc.length);
  buf[0] = 0x00;
  buf.set(enc, 1);
  return sha256Sync(buf);
}

export async function leaf(fields: string[]): Promise<Uint8Array> {
  const enc = encodeFields(fields);
  const buf = new Uint8Array(1 + enc.length);
  buf[0] = 0x00;
  buf.set(enc, 1);
  return sha256(buf);
}

/**
 * Computes internal node hash: SHA-256(0x01 || left_32 || right_32)
 */
export function nodeSync(left: Uint8Array, right: Uint8Array): Uint8Array {
  const buf = new Uint8Array(1 + 32 + 32);
  buf[0] = 0x01;
  buf.set(left, 1);
  buf.set(right, 33);
  return sha256Sync(buf);
}

export async function node(left: Uint8Array, right: Uint8Array): Promise<Uint8Array> {
  const buf = new Uint8Array(1 + 32 + 32);
  buf[0] = 0x01;
  buf.set(left, 1);
  buf.set(right, 33);
  return sha256(buf);
}

/**
 * Computes Merkle root from leaves.
 * Odd count rule: promote the unpaired node unchanged (never duplicate).
 */
export function rootSync(leaves: Uint8Array[]): Uint8Array {
  if (leaves.length === 0) throw new Error('empty leaves');
  let lv = [...leaves];
  while (lv.length > 1) {
    const nx: Uint8Array[] = [];
    for (let i = 0; i < lv.length - 1; i += 2) {
      nx.push(nodeSync(lv[i], lv[i + 1]));
    }
    if (lv.length % 2 === 1) {
      nx.push(lv[lv.length - 1]); // Promote odd node unchanged
    }
    lv = nx;
  }
  return lv[0];
}

export async function root(leaves: Uint8Array[]): Promise<Uint8Array> {
  if (leaves.length === 0) throw new Error('empty leaves');
  let lv = [...leaves];
  while (lv.length > 1) {
    const nx: Uint8Array[] = [];
    for (let i = 0; i < lv.length - 1; i += 2) {
      nx.push(await node(lv[i], lv[i + 1]));
    }
    if (lv.length % 2 === 1) {
      nx.push(lv[lv.length - 1]); // Promote odd node unchanged
    }
    lv = nx;
  }
  return lv[0];
}

/**
 * WRONG implementation duplicating odd leaves (used strictly for negative tests)
 */
export function rootDuplicateOddWrongSync(leaves: Uint8Array[]): Uint8Array {
  if (leaves.length === 0) throw new Error('empty leaves');
  let lv = [...leaves];
  while (lv.length > 1) {
    if (lv.length % 2 === 1) {
      lv.push(lv[lv.length - 1]);
    }
    const nx: Uint8Array[] = [];
    for (let i = 0; i < lv.length; i += 2) {
      nx.push(nodeSync(lv[i], lv[i + 1]));
    }
    lv = nx;
  }
  return lv[0];
}

export interface MerkleProofStep {
  sibling: string; // hex
  isRight: boolean; // true if sibling is right of current
}

export interface MerkleInclusionProof {
  leafIndex: number;
  leafHash: string; // hex
  rootHash: string; // hex
  steps: MerkleProofStep[];
}

/**
 * Generates an inclusion proof for leaf at `leafIndex`.
 */
export function generateProof(leaves: Uint8Array[], leafIndex: number): MerkleInclusionProof {
  if (leafIndex < 0 || leafIndex >= leaves.length) {
    throw new Error(`leafIndex ${leafIndex} out of bounds (0..${leaves.length - 1})`);
  }

  const steps: MerkleProofStep[] = [];
  let currentIndex = leafIndex;
  let currentLevel = [...leaves];

  while (currentLevel.length > 1) {
    const nextLevel: Uint8Array[] = [];
    const isOdd = currentLevel.length % 2 === 1;

    for (let i = 0; i < currentLevel.length; i += 2) {
      if (i + 1 < currentLevel.length) {
        // Paired nodes
        if (i === currentIndex) {
          // Current is left, sibling is right
          steps.push({
            sibling: toHex(currentLevel[i + 1]),
            isRight: true,
          });
        } else if (i + 1 === currentIndex) {
          // Current is right, sibling is left
          steps.push({
            sibling: toHex(currentLevel[i]),
            isRight: false,
          });
        }
        nextLevel.push(nodeSync(currentLevel[i], currentLevel[i + 1]));
      } else if (isOdd) {
        // Unpaired odd node promoted unchanged
        nextLevel.push(currentLevel[i]);
      }
    }

    currentIndex = Math.floor(currentIndex / 2);
    currentLevel = nextLevel;
  }

  return {
    leafIndex,
    leafHash: toHex(leaves[leafIndex]),
    rootHash: toHex(currentLevel[0]),
    steps,
  };
}

/**
 * Verifies an inclusion proof using WebCrypto or sha256Sync.
 */
export async function verifyProof(proof: MerkleInclusionProof): Promise<boolean> {
  let current = fromHex(proof.leafHash);
  for (const step of proof.steps) {
    const sibling = fromHex(step.sibling);
    if (step.isRight) {
      current = await node(current, sibling);
    } else {
      current = await node(sibling, current);
    }
  }
  return toHex(current) === proof.rootHash;
}

export function verifyProofSync(proof: MerkleInclusionProof): boolean {
  let current = fromHex(proof.leafHash);
  for (const step of proof.steps) {
    const sibling = fromHex(step.sibling);
    if (step.isRight) {
      current = nodeSync(current, sibling);
    } else {
      current = nodeSync(sibling, current);
    }
  }
  return toHex(current) === proof.rootHash;
}

/**
 * Simulates tamper on a clone of leaves with byte-level difference.
 */
export function cloneAndTamper(
  leaves: Uint8Array[],
  targetIndex: number,
  newFields: string[]
): { originalRoot: string; tamperedRoot: string; byteDiffCount: number } {
  const clone = leaves.map((l) => new Uint8Array(l));
  const tamperedLeaf = leafSync(newFields);

  const origLeaf = clone[targetIndex];
  let diffCount = 0;
  for (let i = 0; i < 32; i++) {
    if (origLeaf[i] !== tamperedLeaf[i]) diffCount++;
  }

  clone[targetIndex] = tamperedLeaf;

  const originalRoot = toHex(rootSync(leaves));
  const tamperedRoot = toHex(rootSync(clone));

  return {
    originalRoot,
    tamperedRoot,
    byteDiffCount: diffCount,
  };
}
