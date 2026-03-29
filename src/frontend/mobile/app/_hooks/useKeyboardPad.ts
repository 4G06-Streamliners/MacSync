import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

/**
 * Bottom padding when the keyboard is open (native keyboard height).
 * Keeps bottom sheets pinned to the keyboard instead of overlapping the focused field.
 */
export function useKeyboardPad(): number {
  const [pad, setPad] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        setPad(e.endCoordinates.height);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setPad(0)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return pad;
}
