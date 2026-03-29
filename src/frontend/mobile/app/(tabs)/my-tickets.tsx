import {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Animated,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import { router, usePathname } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import {
  getUserTickets,
  getMyRefundRequests,
  type Ticket,
  type RefundRequest,
} from "../_lib/api";
import { useAuth } from "../_context/AuthContext";

/** Matches events list: past once the scheduled date/time has passed */
function isEventPast(eventDateStr: string): boolean {
  return new Date(eventDateStr).getTime() < Date.now();
}

function isUpcomingEvent(eventDateStr: string): boolean {
  return !isEventPast(eventDateStr);
}

export default function MyTickets() {
  const { user, status } = useAuth();
  const pathname = usePathname();
  const { width: windowWidth } = useWindowDimensions();
  const pagerRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const pageRef = useRef(0);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [approvedRefunds, setApprovedRefunds] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [trackW, setTrackW] = useState(0);

  const { upcomingTickets, pastTickets } = useMemo(() => {
    const upcoming = tickets.filter((t) => isUpcomingEvent(t.eventDate));
    const past = tickets.filter((t) => !isUpcomingEvent(t.eventDate));
    return { upcomingTickets: upcoming, pastTickets: past };
  }, [tickets]);

  const loadAll = useCallback(async () => {
    if (!user) return;
    try {
      const [ticketData, refundData] = await Promise.all([
        getUserTickets(user.id),
        getMyRefundRequests(),
      ]);
      setTickets(ticketData);
      setApprovedRefunds(refundData.filter((r) => r.status === "approved"));
    } catch (err) {
      console.error("Failed to load tickets:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    void loadAll();
  }, [user, pathname, loadAll]);

  /** Always start on Current when returning to this screen (e.g. back from ticket detail). */
  const resetToCurrentTab = useCallback(() => {
    pageRef.current = 0;
    setPage(0);
    scrollX.setValue(0);
    requestAnimationFrame(() => {
      pagerRef.current?.scrollTo({ x: 0, animated: false });
    });
  }, [scrollX]);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      resetToCurrentTab();
    }, [user, resetToCurrentTab]),
  );

  /** After the full-screen load, the horizontal pager remounts — force offset + bubble to Current. */
  const prevLoading = useRef(loading);
  useLayoutEffect(() => {
    if (prevLoading.current && !loading && user) {
      scrollX.setValue(0);
      requestAnimationFrame(() => {
        pagerRef.current?.scrollTo({ x: 0, animated: false });
      });
    }
    prevLoading.current = loading;
  }, [loading, user, scrollX]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatPrice = (price: number) => {
    if (price === 0) return "Free Event";
    return `$${(price / 100).toFixed(2)}`;
  };

  const formatShort = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const TRACK_PADDING = 6;
  const TRACK_GAP = 8;
  const bubbleW =
    trackW > 0
      ? (trackW - TRACK_PADDING * 2 - TRACK_GAP) / 2
      : 0;

  const bubbleTranslate = scrollX.interpolate({
    inputRange: [0, windowWidth],
    outputRange: [0, bubbleW + TRACK_GAP],
    extrapolate: "clamp",
  });

  const goToPage = (p: number) => {
    pageRef.current = p;
    setPage(p);
    const x = p * windowWidth;
    requestAnimationFrame(() => {
      pagerRef.current?.scrollTo({ x, animated: true });
    });
  };

  const onPagerScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const p = Math.round(x / windowWidth);
    const next = p === 1 ? 1 : 0;
    pageRef.current = next;
    setPage(next);
  };

  const onPagerScroll = useMemo(
    () =>
      Animated.event(
        [{ nativeEvent: { contentOffset: { x: scrollX } } }],
        {
          useNativeDriver: false,
          listener: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
            const x = e.nativeEvent.contentOffset.x;
            const next = x >= windowWidth / 2 ? 1 : 0;
            if (pageRef.current !== next) {
              pageRef.current = next;
              setPage(next);
            }
          },
        },
      ),
    [scrollX, windowWidth],
  );

  const renderTicketCard = (ticket: Ticket, variant: "upcoming" | "past") => (
    <Pressable
      key={ticket.ticketId}
      onPress={() =>
        router.push({
          pathname: "/ticket-detail",
          params: { ticketId: ticket.ticketId },
        })
      }
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden active:bg-gray-50 mb-3"
    >
      <View className="flex-row">
        <View className="w-28 bg-gray-100">
          {ticket.eventImageUrl ? (
            <Image
              source={{ uri: ticket.eventImageUrl }}
              className="w-full h-48"
              resizeMode="cover"
              style={{ minHeight: variant === "past" ? 120 : 190 }}
            />
          ) : (
            <View
              className="w-full items-center justify-center"
              style={{ minHeight: variant === "past" ? 120 : 120 }}
            >
              <Text className="text-2xl">🖼️</Text>
            </View>
          )}
        </View>

        <View className="flex-1 p-4">
          <View className="flex-row flex-wrap gap-2 mb-2">
            {variant === "past" && (
              <View className="bg-gray-200 px-3 py-1.5 rounded-lg">
                <Text className="text-xs font-bold text-gray-700">Past</Text>
              </View>
            )}
            {ticket.checkedIn && (
              <View className="bg-green-100 px-3 py-1.5 rounded-lg">
                <Text className="text-xs font-bold text-green-800">
                  ✓ Checked In
                </Text>
              </View>
            )}
            {ticket.refundRequest &&
              ticket.refundRequest.status === "pending" && (
                <View className="bg-yellow-100 px-3 py-1.5 rounded-lg">
                  <Text className="text-xs font-bold text-yellow-800">
                    ⏳ Refund Pending
                  </Text>
                </View>
              )}
          </View>

          <View className="flex-row items-start justify-between mb-2">
            <View className="flex-1">
              <Text className="text-base font-bold text-gray-900">
                {ticket.eventName}
              </Text>
              <Text className="text-maroon text-sm font-semibold mt-1">
                {variant === "past" ? "View summary →" : "View details →"}
              </Text>
            </View>
          </View>

          <View className="gap-1">
            <View className="flex-row items-center gap-1.5">
              <Text className="text-xs">📅</Text>
              <Text className="text-sm text-gray-600">
                {formatDate(ticket.eventDate)}
              </Text>
            </View>
            {ticket.eventLocation && (
              <View className="flex-row items-center gap-1.5">
                <Text className="text-xs">📍</Text>
                <Text className="text-sm text-gray-600">
                  {ticket.eventLocation}
                </Text>
              </View>
            )}
            <View className="flex-row items-center gap-1.5">
              <Text className="text-xs">💰</Text>
              <Text className="text-sm text-gray-600">
                {formatPrice(ticket.eventPrice)}
              </Text>
            </View>
          </View>

          {(ticket.tableSeat || ticket.busSeat) && (
            <View className="flex-row gap-2 mt-3 pt-3 border-t border-gray-100">
              {ticket.tableSeat && (
                <View className="flex-row items-center gap-1 px-2.5 py-1 bg-gray-100 rounded-full">
                  <Text className="text-xs">💺</Text>
                  <Text className="text-xs font-medium text-gray-600">
                    {ticket.tableSeat}
                  </Text>
                </View>
              )}
              {ticket.busSeat && (
                <View className="flex-row items-center gap-1 px-2.5 py-1 bg-gray-100 rounded-full">
                  <Text className="text-xs">🚌</Text>
                  <Text className="text-xs font-medium text-gray-600">
                    {ticket.busSeat}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );

  if (status === "loading" || loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F5F5F7]">
        <ActivityIndicator size="large" color="#7A1F3E" />
      </View>
    );
  }

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F5F5F7] px-6">
        <Text className="text-gray-500 text-base text-center">
          Please sign in to view your tickets.
        </Text>
      </View>
    );
  }

  const pastCount = pastTickets.length + approvedRefunds.length;

  const pageContentPad = { paddingHorizontal: 16, paddingBottom: 32 };

  return (
    <View className="flex-1 bg-[#F5F5F7]">
      <View className="px-4 pt-6 pb-2">
        <Text className="text-2xl font-bold text-gray-900">My Tickets</Text>
        <Text className="text-gray-500 mt-1">
          Swipe or tap to switch upcoming and history
        </Text>
      </View>

      <View className="px-4 pb-3 w-full">
        <View
          style={styles.tabTrack}
          onLayout={(e) => setTrackW(e.nativeEvent.layout.width)}
        >
          {bubbleW > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.slidingBubble,
                {
                  width: bubbleW,
                  transform: [{ translateX: bubbleTranslate }],
                },
              ]}
            />
          ) : null}
          {/* Explicit flex columns so both tabs span left/right (Pressable + flex is unreliable) */}
          <View style={styles.tabColumn}>
            <Pressable
              onPress={() => goToPage(0)}
              accessibilityRole="tab"
              accessibilityState={{ selected: page === 0 }}
              style={({ pressed }) => [
                styles.tabCell,
                pressed && styles.tabPressed,
              ]}
            >
              <Text
                style={[
                  styles.tabTitle,
                  page === 0 ? styles.tabTitleOn : styles.tabTitleOff,
                ]}
              >
                Current
              </Text>
              <Text
                style={[
                  styles.tabSub,
                  page === 0 ? styles.tabSubOn : styles.tabSubOff,
                ]}
              >
                {upcomingTickets.length} upcoming
              </Text>
            </Pressable>
          </View>
          <View style={[styles.tabColumn, styles.tabColumnRight]}>
            <Pressable
              onPress={() => goToPage(1)}
              accessibilityRole="tab"
              accessibilityState={{ selected: page === 1 }}
              style={({ pressed }) => [
                styles.tabCell,
                pressed && styles.tabPressed,
              ]}
            >
              <Text
                style={[
                  styles.tabTitle,
                  page === 1 ? styles.tabTitleOn : styles.tabTitleOff,
                ]}
              >
                Past & refunded
              </Text>
              <Text
                style={[
                  styles.tabSub,
                  page === 1 ? styles.tabSubOn : styles.tabSubOff,
                ]}
              >
                {pastCount} total
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      <Animated.ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled
        decelerationRate="fast"
        onScroll={onPagerScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={onPagerScrollEnd}
        keyboardShouldPersistTaps="handled"
        style={styles.pager}
      >
        <View style={{ width: windowWidth, flex: 1 }}>
          <ScrollView
            nestedScrollEnabled
            contentContainerStyle={pageContentPad}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            keyboardShouldPersistTaps="handled"
          >
            <Text className="text-sm text-gray-500 mb-3">Active tickets.</Text>
            {upcomingTickets.length === 0 ? (
              <View className="bg-white rounded-2xl border border-gray-100 p-8">
                <Text className="text-sm text-gray-500 text-center leading-5">
                  No upcoming tickets. Browse events to sign up, or swipe to
                  Past & refunded for older activity.
                </Text>
              </View>
            ) : (
              <View>
                {upcomingTickets.map((t) => renderTicketCard(t, "upcoming"))}
              </View>
            )}
          </ScrollView>
        </View>

        <View style={{ width: windowWidth, flex: 1 }}>
          <ScrollView
            nestedScrollEnabled
            contentContainerStyle={pageContentPad}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            keyboardShouldPersistTaps="handled"
          >
            <Text className="text-sm text-gray-500 mb-3">
              Past events and approved refunds.
            </Text>
            {pastTickets.length === 0 && approvedRefunds.length === 0 ? (
              <View className="bg-white rounded-2xl border border-gray-100 p-8">
                <Text className="text-sm text-gray-500 text-center leading-5">
                  Nothing here yet. Past events and refunds show up after the
                  event date or when a refund is approved.
                </Text>
              </View>
            ) : (
              <View>
                {pastTickets.map((t) => renderTicketCard(t, "past"))}
                {approvedRefunds.map((refund) => {
                  const cents = refund.amountPaidCents;
                  const hasPayment =
                    cents != null && typeof cents === "number" && cents > 0;
                  return (
                    <View
                      key={`refund-${refund.id}`}
                      className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-3"
                    >
                      <View className="flex-row items-start justify-between mb-2">
                        <View className="flex-1">
                          <Text className="text-base font-bold text-gray-900 mb-1">
                            {refund.eventName ?? "Event"}
                          </Text>
                        </View>
                        <View className="bg-emerald-100 px-2 py-1 rounded-lg">
                          <Text className="text-xs font-bold text-emerald-800">
                            Refunded
                          </Text>
                        </View>
                      </View>

                      <View className="gap-1.5">
                        {refund.eventDate ? (
                          <View className="flex-row items-center gap-1.5">
                            <Text className="text-xs">📅</Text>
                            <Text className="text-sm text-gray-600">
                              Event {formatDate(refund.eventDate)}
                            </Text>
                          </View>
                        ) : null}
                        <View className="flex-row items-center gap-1.5">
                          <Text className="text-xs">💵</Text>
                          <Text className="text-sm text-gray-700 font-medium">
                            {hasPayment
                              ? `Refunded ${formatPrice(cents)}`
                              : "No payment — free ticket"}
                          </Text>
                        </View>
                        <View className="flex-row items-center gap-1.5">
                          <Text className="text-xs">📋</Text>
                          <Text className="text-xs text-gray-500">
                            Requested {formatShort(refund.createdAt)}
                            {refund.processedAt
                              ? ` · Approved ${formatShort(refund.processedAt)}`
                              : ""}
                          </Text>
                        </View>
                      </View>

                      {refund.reason ? (
                        <View className="mt-3 bg-gray-50 rounded-lg p-3">
                          <Text className="text-xs text-gray-500 mb-1">
                            Your reason
                          </Text>
                          <Text className="text-sm text-gray-700">
                            {refund.reason}
                          </Text>
                        </View>
                      ) : null}

                      {refund.adminResponse ? (
                        <View
                          className={`bg-gray-50 rounded-lg p-3 ${refund.reason ? "mt-2" : "mt-3"}`}
                        >
                          <Text className="text-xs text-gray-500 mb-1">
                            Note from admin
                          </Text>
                          <Text className="text-sm text-gray-700">
                            {refund.adminResponse}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  pager: {
    flex: 1,
  },
  tabTrack: {
    flexDirection: "row",
    position: "relative",
    width: "100%",
    alignSelf: "stretch",
    padding: 6,
    borderRadius: 16,
    backgroundColor: "#E2E5EA",
  },
  tabColumn: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    zIndex: 1,
  },
  tabColumnRight: {
    marginLeft: 8,
  },
  slidingBubble: {
    position: "absolute",
    left: 6,
    top: 6,
    bottom: 6,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  tabCell: {
    flex: 1,
    alignSelf: "stretch",
    minHeight: 72,
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  tabPressed: {
    opacity: 0.9,
  },
  tabTitle: {
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  tabTitleOn: {
    color: "#7A1F3E",
  },
  tabTitleOff: {
    color: "#475569",
  },
  tabSub: {
    fontSize: 12,
    marginTop: 3,
    textAlign: "center",
  },
  tabSubOn: {
    color: "rgba(122, 31, 62, 0.75)",
  },
  tabSubOff: {
    color: "#64748B",
  },
});
