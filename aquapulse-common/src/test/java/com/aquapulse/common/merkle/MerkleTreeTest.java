package com.aquapulse.common.merkle;

import com.aquapulse.common.constants.AquaPulseConstants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Constructor;
import java.lang.reflect.InvocationTargetException;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MerkleTreeTest {

    @Test
    @DisplayName("Empty tree produces deterministic empty root")
    void testEmptyTree() {
        MerkleTree.MerkleResult result = MerkleTree.buildTree(List.of());
        assertThat(result.root()).isEqualTo(AquaPulseConstants.EMPTY_MERKLE_ROOT);
        assertThat(result.proofs()).isEmpty();
    }

    @Test
    @DisplayName("Single leaf tree produces root equal to leaf and empty proof")
    void testSingleLeaf() {
        String leaf = MerkleTree.hashLeaf("salt_0", "farmer_0:alloc=25.0");
        MerkleTree.MerkleResult result = MerkleTree.buildTree(List.of(leaf));

        assertThat(result.root()).isEqualTo(leaf);
        assertThat(result.proofs()).hasSize(1);
        assertThat(result.proofs().get(0)).isEmpty();
        assertThat(MerkleTree.verifyReceipt(result.root(), "salt_0", "farmer_0:alloc=25.0", result.proofs().get(0))).isTrue();
    }

    @Test
    @DisplayName("Two leaf tree verifies inclusion proofs on left and right siblings")
    void testTwoLeaves() {
        String s0 = "salt_0", v0 = "farmer_0:alloc=25.0";
        String s1 = "salt_1", v1 = "farmer_1:alloc=25.1";
        String l0 = MerkleTree.hashLeaf(s0, v0);
        String l1 = MerkleTree.hashLeaf(s1, v1);

        MerkleTree.MerkleResult result = MerkleTree.buildTree(List.of(l0, l1));
        String expectedRoot = MerkleTree.hashNode(l0, l1);

        assertThat(result.root()).isEqualTo(expectedRoot);
        assertThat(result.proofs()).hasSize(2);

        // Leaf 0 has sibling Leaf 1 on right
        assertThat(result.proofs().get(0)).containsExactly(new MerkleTree.ProofStep(l1, true));
        // Leaf 1 has sibling Leaf 0 on left
        assertThat(result.proofs().get(1)).containsExactly(new MerkleTree.ProofStep(l0, false));

        assertThat(MerkleTree.verifyReceipt(result.root(), s0, v0, result.proofs().get(0))).isTrue();
        assertThat(MerkleTree.verifyReceipt(result.root(), s1, v1, result.proofs().get(1))).isTrue();
    }

    @Test
    @DisplayName("Three leaves: odd leaf promotion promotes trailing leaf without duplication")
    void testThreeLeavesOddPromotion() {
        String l0 = MerkleTree.hashLeaf("s0", "v0");
        String l1 = MerkleTree.hashLeaf("s1", "v1");
        String l2 = MerkleTree.hashLeaf("s2", "v2");

        MerkleTree.MerkleResult result = MerkleTree.buildTree(List.of(l0, l1, l2));
        String p0 = MerkleTree.hashNode(l0, l1);
        String expectedRoot = MerkleTree.hashNode(p0, l2);

        assertThat(result.root()).isEqualTo(expectedRoot);
        assertThat(MerkleTree.verifyReceipt(result.root(), "s0", "v0", result.proofs().get(0))).isTrue();
        assertThat(MerkleTree.verifyReceipt(result.root(), "s1", "v1", result.proofs().get(1))).isTrue();
        assertThat(MerkleTree.verifyReceipt(result.root(), "s2", "v2", result.proofs().get(2))).isTrue();
    }

    @Test
    @DisplayName("Benchmark Suite: 200/200 honest proofs verify, 200/200 tampered proofs fail")
    void test200LeavesHonestAndTampered() {
        int n = 200;
        List<String> salts = new ArrayList<>(n);
        List<String> values = new ArrayList<>(n);
        List<String> leaves = new ArrayList<>(n);

        for (int i = 0; i < n; i++) {
            String salt = "salt_" + i;
            String val = "farmer_" + i + ":alloc=" + (25.0 + i * 0.1);
            salts.add(salt);
            values.add(val);
            leaves.add(MerkleTree.hashLeaf(salt, val));
        }

        MerkleTree.MerkleResult result = MerkleTree.buildTree(leaves);
        assertThat(result.root()).isNotNull().hasSize(64);
        assertThat(result.proofs()).hasSize(n);

        // 200/200 honest proofs verify
        int honestCount = 0;
        for (int i = 0; i < n; i++) {
            boolean ok = MerkleTree.verifyReceipt(result.root(), salts.get(i), values.get(i), result.proofs().get(i));
            if (ok) honestCount++;
        }
        assertThat(honestCount).isEqualTo(200);

        // 200/200 tampered values reject
        int tamperedRejectCount = 0;
        for (int i = 0; i < n; i++) {
            boolean ok = MerkleTree.verifyReceipt(result.root(), salts.get(i), values.get(i) + "_tampered", result.proofs().get(i));
            if (!ok) tamperedRejectCount++;
        }
        assertThat(tamperedRejectCount).isEqualTo(200);
    }

    @Test
    @DisplayName("MerkleTree cannot be instantiated")
    void testNonInstantiable() throws NoSuchMethodException {
        Constructor<MerkleTree> constructor = MerkleTree.class.getDeclaredConstructor();
        constructor.setAccessible(true);
        assertThatThrownBy(constructor::newInstance)
                .isInstanceOf(InvocationTargetException.class)
                .hasCauseInstanceOf(UnsupportedOperationException.class);
    }
}
