package com.sismics.util;

import jakarta.json.JsonValue;
import org.junit.Test;

import static org.junit.Assert.assertEquals;

public class TestJsonUtil {
    @Test
    public void testNullableWithString() {
        // 测试传入 null 时的情况
        JsonValue result1 = JsonUtil.nullable((String) null);
        assertEquals(JsonValue.NULL, result1);

        // 测试传入非 null 字符串时的情况
        String testString = "test";
        JsonValue result2 = JsonUtil.nullable(testString);
        assertEquals(testString, result2.toString().replaceAll("^\"|\"$", ""));
    }

    @Test
    public void testNullableWithInteger() {
        // 测试传入 null 时的情况
        JsonValue result1 = JsonUtil.nullable((Integer) null);
        assertEquals(JsonValue.NULL, result1);

        // 测试传入非 null 整数时的情况
        Integer testInteger = 123;
        JsonValue result2 = JsonUtil.nullable(testInteger);
        assertEquals(testInteger.toString(), result2.toString());
    }

    @Test
    public void testNullableWithLong() {
        // 测试传入 null 时的情况
        JsonValue result1 = JsonUtil.nullable((Long) null);
        assertEquals(JsonValue.NULL, result1);

        // 测试传入非 null 长整数时的情况
        Long testLong = 123456789L;
        JsonValue result2 = JsonUtil.nullable(testLong);
        assertEquals(testLong.toString(), result2.toString());
    }
}
