import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Switch,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getEvent,
  updateEvent,
  type CreateEventPayload,
} from "./_lib/api";
import {
  formatPickerDate,
  formatPickerTime,
  localDateToIsoUtc,
  startOfToday,
} from "./_lib/datetime";
import { EventDateTimeFields } from "./components/EventDateTimeFields";

export default function EditEventScreen() {
  const router = useRouter();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eventAt, setEventAt] = useState(() => new Date());
  const [eventEnded, setEventEnded] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
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

  useEffect(() => {
    if (!eventId) return;
    getEvent(+eventId)
      .then((ev) => {
        const at = new Date(ev.date);
        setEventAt(at);
        setEventEnded(at < new Date());
        setForm({
          name: ev.name,
          description: ev.description ?? "",
          location: ev.location ?? "",
          capacity: String(ev.capacity),
          price: ev.price === 0 ? "" : (ev.price / 100).toFixed(2),
          imageUrl: ev.imageUrl ?? "",
          requiresTableSignup: ev.requiresTableSignup,
          requiresBusSignup: ev.requiresBusSignup,
          tableCount: ev.tableCount != null ? String(ev.tableCount) : "",
          seatsPerTable:
            ev.seatsPerTable != null ? String(ev.seatsPerTable) : "",
          busCount: ev.busCount != null ? String(ev.busCount) : "",
          busCapacity: ev.busCapacity != null ? String(ev.busCapacity) : "",
        });
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load event"),
      )
      .finally(() => setLoading(false));
  }, [eventId]);

  const showAlert = (title: string, msg: string) => {
    if (Platform.OS === "web") {
      alert(`${title}: ${msg}`);
    } else {
      Alert.alert(title, msg);
    }
  };

  const handleSubmit = async () => {
    if (eventEnded) return;
    if (!form.name || !form.capacity) {
      showAlert("Error", "Name and capacity are required.");
      return;
    }

    setSaving(true);
    try {
      const priceDollars = form.price ? parseFloat(form.price) : 0;
      const payload: Partial<CreateEventPayload> = {
        name: form.name,
        description: form.description || undefined,
        date: localDateToIsoUtc(eventAt),
        location: form.location || undefined,
        capacity: parseInt(form.capacity),
        price: Math.round(priceDollars * 100),
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

      await updateEvent(+eventId, payload);
      showAlert("Success", "Event updated successfully.");
      goBackOrHome(router);
    } catch (err: any) {
      showAlert("Error", err.message || "Failed to update event");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#F5F5F7] items-center justify-center">
        <ActivityIndicator size="large" color="#7A1F3E" />
      </View>
    );
  }

  if (error) {
    return (
      <View
        className="flex-1 bg-[#F5F5F7] items-center justify-center px-6"
        style={{ paddingTop: insets.top }}
      >
        <View className="bg-white rounded-2xl p-6 border border-red-200">
          <Text className="text-red-800 font-semibold">
            Could not load event
          </Text>
          <Text className="text-sm text-red-600 mt-1">{error}</Text>
          <Pressable
            onPress={() => goBackOrHome(router)}
            className="mt-4 py-2.5 bg-maroon rounded-xl active:bg-maroon-dark"
          >
            <Text className="text-center text-sm font-semibold text-white">
              Go Back
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (eventEnded) {
    return (
      <View className="flex-1 bg-[#F5F5F7]">
        <View
          className="bg-white border-b border-gray-200 px-4 pb-4 flex-row items-center justify-between"
          style={{ paddingTop: Math.max(insets.top, 16) + 8 }}
        >
          <Pressable onPress={() => router.back()}>
            <Text className="text-base text-maroon font-medium">Back</Text>
          </Pressable>
          <Text className="text-lg font-bold text-gray-900">Event</Text>
          <View style={{ width: 56 }} />
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="px-4 py-5 pb-10"
        >
          <View className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
            <Text className="text-amber-900 text-sm font-medium">
              This event has ended. Editing is no longer available.
            </Text>
          </View>

          <View className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 gap-4">
            <View>
              <Text className="text-xs font-medium text-gray-500 mb-1">Name</Text>
              <Text className="text-base text-gray-900 font-semibold">
                {form.name}
              </Text>
            </View>
            {form.description ? (
              <View>
                <Text className="text-xs font-medium text-gray-500 mb-1">
                  Description
                </Text>
                <Text className="text-sm text-gray-800">{form.description}</Text>
              </View>
            ) : null}
            <View>
              <Text className="text-xs font-medium text-gray-500 mb-1">
                Date & time
              </Text>
              <Text className="text-sm text-gray-900">
                {formatPickerDate(eventAt)} · {formatPickerTime(eventAt)}
              </Text>
            </View>
            {form.location ? (
              <View>
                <Text className="text-xs font-medium text-gray-500 mb-1">
                  Location
                </Text>
                <Text className="text-sm text-gray-800">{form.location}</Text>
              </View>
            ) : null}
            <View className="flex-row gap-6">
              <View>
                <Text className="text-xs font-medium text-gray-500 mb-1">
                  Capacity
                </Text>
                <Text className="text-sm text-gray-900">{form.capacity}</Text>
              </View>
              <View>
                <Text className="text-xs font-medium text-gray-500 mb-1">
                  Price ($)
                </Text>
                <Text className="text-sm text-gray-900">
                  {form.price || "0"}
                </Text>
              </View>
            </View>
            {form.imageUrl ? (
              <View>
                <Text className="text-xs font-medium text-gray-500 mb-1">
                  Image URL
                </Text>
                <Text className="text-sm text-gray-800">{form.imageUrl}</Text>
              </View>
            ) : null}
            <View className="flex-row justify-between border-t border-gray-100 pt-3">
              <Text className="text-sm text-gray-600">Table signup</Text>
              <Text className="text-sm font-medium text-gray-900">
                {form.requiresTableSignup ? "Yes" : "No"}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-sm text-gray-600">Bus signup</Text>
              <Text className="text-sm font-medium text-gray-900">
                {form.requiresBusSignup ? "Yes" : "No"}
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F5F5F7]">
      {/* Header */}
      <View
        className="bg-white border-b border-gray-200 px-4 pb-4 flex-row items-center justify-between"
        style={{ paddingTop: Math.max(insets.top, 16) + 8 }}
      >
        <Pressable onPress={() => goBackOrHome(router)}>
          <Text className="text-base text-maroon font-medium">Cancel</Text>
        </Pressable>
        <Text className="text-lg font-bold text-gray-900">Edit Event</Text>
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
          <EventDateTimeFields
            value={eventAt}
            onChange={setEventAt}
            minimumDate={startOfToday()}
          />

          {/* Location */}
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1.5">
              Location <Text className="text-red-500">*</Text>
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
