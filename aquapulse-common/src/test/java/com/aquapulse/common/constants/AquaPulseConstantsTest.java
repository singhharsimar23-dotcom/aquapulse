package com.aquapulse.common.constants;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Constructor;
import java.lang.reflect.InvocationTargetException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AquaPulseConstantsTest {

    @Test
    @DisplayName("Hard Invariant 1: DIGNITY_FLOOR_M3 must be exactly 5.0 m3")
    void testHardInvariant1DignityFloor() {
        assertThat(AquaPulseConstants.DIGNITY_FLOOR_M3).isEqualTo(5.0);
    }

    @Test
    @DisplayName("Utility class cannot be instantiated via reflection")
    void testUtilityClassNonInstantiable() throws NoSuchMethodException {
        Constructor<AquaPulseConstants> constructor = AquaPulseConstants.class.getDeclaredConstructor();
        constructor.setAccessible(true);
        assertThatThrownBy(constructor::newInstance)
                .isInstanceOf(InvocationTargetException.class)
                .hasCauseInstanceOf(UnsupportedOperationException.class);
    }

    @Test
    @DisplayName("Domain algorithmic constants match specification")
    void testDomainConstants() {
        assertThat(AquaPulseConstants.DEFAULT_KARMA_ALPHA).isEqualTo(0.35);
        assertThat(AquaPulseConstants.INITIAL_FARMER_KARMA).isEqualTo(10.0);
        assertThat(AquaPulseConstants.ESS_MIN).isEqualTo(150.0);
        assertThat(AquaPulseConstants.STUDENT_T_NU).isEqualTo(4.0);
        assertThat(AquaPulseConstants.SIGMA_OBS).isEqualTo(0.5);
        assertThat(AquaPulseConstants.ACSY_ALPHA).isEqualTo(0.10);
        assertThat(AquaPulseConstants.ACSY_ETA).isEqualTo(0.30);
        assertThat(AquaPulseConstants.KAPPA_MIN).isEqualTo(-1.5);
        assertThat(AquaPulseConstants.KAPPA_MAX).isEqualTo(3.0);
        assertThat(AquaPulseConstants.DEFAULT_KAPPA).isEqualTo(1.0);
        assertThat(AquaPulseConstants.MERKLE_LEAF_PREFIX).isEqualTo((byte) 0x00);
        assertThat(AquaPulseConstants.MERKLE_NODE_PREFIX).isEqualTo((byte) 0x01);
        assertThat(AquaPulseConstants.NUMERIC_GROUNDING_TOLERANCE).isEqualTo(0.05);
    }
}
