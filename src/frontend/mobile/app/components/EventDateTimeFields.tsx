import { useState, createElement } from "react";
import {
  View,
  Text,
  Pressable,
  Platform,
  Modal,
} from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import {
  formatPickerDate,
  formatPickerTime,
  dateToLocalDateStr,
  dateToLocalTimeStr,
  parseWebDatetimeLocal,
} from "../_lib/datetime";

type Props = {
  value: Date;
  onChange: (next: Date) => void;
  /** Earliest selectable calendar day (e.g. today for new events) */
  minimumDate?: Date;
  disabled?: boolean;
};

export function EventDateTimeFields({
  value,
  onChange,
  minimumDate,
  disabled,
}: Props) {
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);

  const mergeDate = (selected: Date) => {
    const next = new Date(value);
    next.setFullYear(
      selected.getFullYear(),
      selected.getMonth(),
      selected.getDate(),
    );
    onChange(next);
  };

  const mergeTime = (selected: Date) => {
    const next = new Date(value);
    next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
    onChange(next);
  };

  if (Platform.OS === "web") {
    const dtValue = `${dateToLocalDateStr(value)}T${dateToLocalTimeStr(value)}`;
    const minAttr = minimumDate
      ? `${dateToLocalDateStr(minimumDate)}T00:00`
      : undefined;
    return (
      <View>
        <Text className="text-sm font-medium text-gray-700 mb-1.5">
          Date & time <Text className="text-red-500">*</Text>
        </Text>
        {createElement("input", {
          type: "datetime-local",
          disabled,
          min: minAttr,
          value: dtValue,
          onChange: (e: { target: { value: string } }) => {
            const v = e.target.value;
            if (!v) return;
            const parsed = parseWebDatetimeLocal(v);
            if (parsed) onChange(parsed);
          },
          className: `w-full px-4 py-3 border border-gray-300 rounded-xl text-sm ${
            disabled ? "bg-gray-100 text-gray-500" : "bg-white text-gray-900"
          }`,
        } as Record<string, unknown>)}
      </View>
    );
  }

  const handleAndroidDateChange = (
    event: DateTimePickerEvent,
    selected?: Date,
  ) => {
    setShowDate(false);
    if (event.type === "dismissed") return;
    if (selected) mergeDate(selected);
  };

  const handleAndroidTimeChange = (
    event: DateTimePickerEvent,
    selected?: Date,
  ) => {
    setShowTime(false);
    if (event.type === "dismissed") return;
    if (selected) mergeTime(selected);
  };

  return (
    <View className="flex-row gap-3">
      <View className="flex-1">
        <Text className="text-sm font-medium text-gray-700 mb-1.5">
          Date <Text className="text-red-500">*</Text>
        </Text>
        <Pressable
          disabled={disabled}
          onPress={() => !disabled && setShowDate(true)}
          className={`w-full px-4 py-3 border border-gray-300 rounded-xl ${
            disabled ? "bg-gray-100" : "bg-white active:bg-gray-50"
          }`}
        >
          <Text
            className={`text-sm ${disabled ? "text-gray-500" : "text-gray-900"}`}
          >
            {formatPickerDate(value)}
          </Text>
        </Pressable>
        {Platform.OS === "ios" ? (
          <Modal
            visible={showDate}
            transparent
            animationType="fade"
            onRequestClose={() => setShowDate(false)}
          >
            <View className="flex-1 justify-end">
              <Pressable
                className="absolute inset-0 bg-black/40"
                onPress={() => setShowDate(false)}
              />
              <View className="bg-white rounded-t-3xl pt-2 pb-6">
                <DateTimePicker
                  value={value}
                  mode="date"
                  display="spinner"
                  minimumDate={minimumDate}
                  onChange={(_, d) => d && mergeDate(d)}
                />
                <Pressable
                  onPress={() => setShowDate(false)}
                  className="py-3 border-t border-gray-200"
                >
                  <Text className="text-center text-base font-semibold text-maroon">
                    Done
                  </Text>
                </Pressable>
              </View>
            </View>
          </Modal>
        ) : (
          showDate && (
            <DateTimePicker
              value={value}
              mode="date"
              display="default"
              minimumDate={minimumDate}
              onChange={handleAndroidDateChange}
            />
          )
        )}
      </View>

      <View className="flex-1">
        <Text className="text-sm font-medium text-gray-700 mb-1.5">
          Time <Text className="text-red-500">*</Text>
        </Text>
        <Pressable
          disabled={disabled}
          onPress={() => !disabled && setShowTime(true)}
          className={`w-full px-4 py-3 border border-gray-300 rounded-xl ${
            disabled ? "bg-gray-100" : "bg-white active:bg-gray-50"
          }`}
        >
          <Text
            className={`text-sm ${disabled ? "text-gray-500" : "text-gray-900"}`}
          >
            {formatPickerTime(value)}
          </Text>
        </Pressable>
        {Platform.OS === "ios" ? (
          <Modal
            visible={showTime}
            transparent
            animationType="fade"
            onRequestClose={() => setShowTime(false)}
          >
            <View className="flex-1 justify-end">
              <Pressable
                className="absolute inset-0 bg-black/40"
                onPress={() => setShowTime(false)}
              />
              <View className="bg-white rounded-t-3xl pt-2 pb-6">
                <DateTimePicker
                  value={value}
                  mode="time"
                  display="spinner"
                  is24Hour={false}
                  onChange={(_, d) => d && mergeTime(d)}
                />
                <Pressable
                  onPress={() => setShowTime(false)}
                  className="py-3 border-t border-gray-200"
                >
                  <Text className="text-center text-base font-semibold text-maroon">
                    Done
                  </Text>
                </Pressable>
              </View>
            </View>
          </Modal>
        ) : (
          showTime && (
            <DateTimePicker
              value={value}
              mode="time"
              display="default"
              is24Hour={false}
              onChange={handleAndroidTimeChange}
            />
          )
        )}
      </View>
    </View>
  );
}
