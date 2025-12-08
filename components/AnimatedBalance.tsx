import React, { useEffect, useRef, useState } from "react";
import { Animated, Text } from "react-native";
import { MotiText } from "moti";

type AnimatedBalanceProps = {
  animatedValue: Animated.Value;
};

export default function AnimatedBalance({ animatedValue }: AnimatedBalanceProps) {
  const [val, setVal] = useState(0);
  const listenerRef = useRef<string | number | null>(null);

  useEffect(() => {
    listenerRef.current = animatedValue.addListener(({ value }) => {
      setVal(Number(value));
    });

    return () => {
      if (listenerRef.current !== null) {
        try {
          animatedValue.removeListener(listenerRef.current as string);
        } catch {
          try {
            (animatedValue as any).removeAllListeners();
          } catch {}
        }
      }
    };
  }, [animatedValue]);

  return (
    <MotiText
      from={{ opacity: 0, translateY: 8 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ duration: 360 }}
      style={{ fontSize: 32, fontWeight: "bold", color: "#fff" }} // Inline style
    >
      {val.toFixed(4)} <Text style={{ fontSize: 18 }}>VAD</Text>
    </MotiText>
  );
}
