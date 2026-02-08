import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Switch,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createEvent, type CreateEventPayload } from "./lib/api";

export default function CreateEventScreen() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const insets = useSafeAreaInsets();

  const [form, setForm] = useState({
    name: "",
    description: "",
    date: "",
    time: "",
    location: "",
    capacity: "",
    price: "",
    imageUrl: "",
    requiresTableSignup: false,
    requiresBusSignup: false,
    tableCount: "",
    seatsPerTable: "",
    busCount: "",
    busCapacity: "",
  });

  const set = (field: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    setSaving(true);

    try {
      if (!form.name || !form.date || !form.time || !form.capacity) {
        Alert.alert("Error", "Name, date, time, and capacity are required.");
        setSaving(false);
        return;
      }

      const dateStr = `${form.date}T${form.time}:00`;
      const payload: CreateEventPayload = {
        name: form.name,
        description: form.description || undefined,
        date: new Date(dateStr).toISOString(),
        location: form.location || undefined,
        capacity: parseInt(form.capacity),
        price: form.price ? Math.round(parseFloat(form.price)) : 0,
        imageUrl: form.imageUrl || undefined,
        requiresTableSignup: form.requiresTableSignup,
        requiresBusSignup: form.requiresBusSignup,
        tableCount: form.tableCount ? parseInt(form.tableCount) : undefined,
        seatsPerTable: form.seatsPerTable
          ? parseInt(form.seatsPerTable)
          : undefined,
        busCount: form.busCount ? parseInt(form.busCount) : undefined,
        busCapacity: form.busCapacity
          ? parseInt(form.busCapacity)
          : undefined,
      };

      await createEvent(payload);
      router.replace("/event-created");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to create event");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-[#F5F5F7]">
      {/* Header */}
      <View
        className="bg-white border-b border-gray-200 px-4 pb-4 flex-row items-center justify-between"
        style={{ paddingTop: Math.max(insets.top, 16) + 8 }}
      >
        <Pressable onPress={() => router.back()}>
          <Text className="text-base text-maroon font-medium">Cancel</Text>
        </Pressable>
        <Text className="text-lg font-bold text-gray-900">
          Create New Event
        </Text>
        <Pressable
          onPress={handleSubmit}
          disabled={saving}
          className="px-4 py-1.5 bg-maroon rounded-lg active:bg-maroon-dark disabled:opacity-50"
        >
          <Text className="text-sm font-semibold text-white">
            {saving ? "..." : "Save"}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 py-5 pb-10"
      >
        <View className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 gap-4">
          {/* Name */}
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1.5">
              Event Name <Text className="text-red-500">*</Text>
            </Text>
            <TextInput
              value={form.name}
              onChangeText={(v) => set("name", v)}
              placeholder="e.g. Annual Gala 2026"
              placeholderTextColor="#9CA3AF"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-900"
            />
          </View>

          {/* Description */}
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1.5">
              Description
            </Text>
            <TextInput
              value={form.description}
              onChangeText={(v) => set("description", v)}
              placeholder="Describe your event..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-900"
              style={{ textAlignVertical: "top", minHeight: 80 }}
            />
          </View>

          {/* Date & Time */}
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-700 mb-1.5">
                Date <Text className="text-red-500">*</Text>
              </Text>
              <TextInput
                value={form.date}
                onChangeText={(v) => set("date", v)}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9CA3AF"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-900"
              />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-700 mb-1.5">
                Time <Text className="text-red-500">*</Text>
              </Text>
              <TextInput
                value={form.time}
                onChangeText={(v) => set("time", v)}
                placeholder="HH:MM"
                placeholderTextColor="#9CA3AF"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-900"
              />
            </View>
          </View>

          {/* Location */}
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1.5">
              Location
            </Text>
            <TextInput
              value={form.location}
              onChangeText={(v) => set("location", v)}
              placeholder="e.g. Grand Ballroom"
              placeholderTextColor="#9CA3AF"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-900"
            />
          </View>

          {/* Capacity & Price */}
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-700 mb-1.5">
                Capacity <Text className="text-red-500">*</Text>
              </Text>
              <TextInput
                value={form.capacity}
                onChangeText={(v) => set("capacity", v)}
                placeholder="e.g. 100"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-900"
              />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-700 mb-1.5">
                Price ($)
              </Text>
              <TextInput
                value={form.price}
                onChangeText={(v) => set("price", v)}
                placeholder="0 (leave empty for free)"
                placeholderTextColor="#9CA3AF"
                keyboardType="decimal-pad"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-900"
              />
            </View>
          </View>

          {/* Image URL */}
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1.5">
              Image URL
            </Text>
            <TextInput
              value={form.imageUrl}
              onChangeText={(v) => set("imageUrl", v)}
              placeholder="https://example.com/image.jpg"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              keyboardType="url"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-900"
            />
          </View>

          {/* Table Signup */}
          <View className="border border-gray-200 rounded-xl p-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-medium text-gray-700">
                Requires Table Signup
              </Text>
              <Switch
                value={form.requiresTableSignup}
                onValueChange={(v) => set("requiresTableSignup", v)}
                trackColor={{ true: "#7A1F3E" }}
              />
            </View>
            {form.requiresTableSignup && (
              <View className="flex-row gap-3 mt-3">
                <View className="flex-1">
                  <Text className="text-xs text-gray-500 mb-1">
                    # of Tables
                  </Text>
                  <TextInput
                    value={form.tableCount}
                    onChangeText={(v) => set("tableCount", v)}
                    keyboardType="number-pad"
                    className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-gray-500 mb-1">
                    Seats/Table
                  </Text>
                  <TextInput
                    value={form.seatsPerTable}
                    onChangeText={(v) => set("seatsPerTable", v)}
                    keyboardType="number-pad"
                    className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900"
                  />
                </View>
              </View>
            )}
          </View>

          {/* Bus Signup */}
          <View className="border border-gray-200 rounded-xl p-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-medium text-gray-700">
                Requires Bus Signup
              </Text>
              <Switch
                value={form.requiresBusSignup}
                onValueChange={(v) => set("requiresBusSignup", v)}
                trackColor={{ true: "#7A1F3E" }}
              />
            </View>
            {form.requiresBusSignup && (
              <View className="flex-row gap-3 mt-3">
                <View className="flex-1">
                  <Text className="text-xs text-gray-500 mb-1">
                    # of Buses
                  </Text>
                  <TextInput
                    value={form.busCount}
                    onChangeText={(v) => set("busCount", v)}
                    keyboardType="number-pad"
                    className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-gray-500 mb-1">
                    Seats/Bus
                  </Text>
                  <TextInput
                    value={form.busCapacity}
                    onChangeText={(v) => set("busCapacity", v)}
                    keyboardType="number-pad"
                    className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900"
                  />
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
