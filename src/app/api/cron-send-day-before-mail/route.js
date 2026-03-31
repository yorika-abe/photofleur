import { supabase } from "@/lib/supabase";

export async function GET(req) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);

    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, "0");
    const dd = String(tomorrow.getDate()).padStart(2, "0");
    const tomorrowDate = `${yyyy}-${mm}-${dd}`;

    const { data: events, error: eventsError } = await supabase
      .from("events")
      .select("id")
      .eq("event_date", tomorrowDate);

    if (eventsError) {
      return Response.json(
        { error: "events取得失敗", detail: eventsError },
        { status: 500 }
      );
    }

    if (!events || events.length === 0) {
      return Response.json({
        success: true,
        message: "明日のイベントはありません",
        sentCount: 0,
      });
    }

    const eventIds = events.map((e) => e.id);

    const { data: entries, error: entriesError } = await supabase
      .from("event_entries")
      .select("id")
      .in("event_id", eventIds);

    if (entriesError) {
      return Response.json(
        { error: "event_entries取得失敗", detail: entriesError },
        { status: 500 }
      );
    }

    if (!entries || entries.length === 0) {
      return Response.json({
        success: true,
        message: "明日のevent_entriesはありません",
        sentCount: 0,
      });
    }

    const entryIds = entries.map((e) => e.id);

    const { data: slots, error: slotsError } = await supabase
      .from("booking_slots")
      .select("id")
      .in("event_entry_id", entryIds)
      .eq("is_reserved", true);

    if (slotsError) {
      return Response.json(
        { error: "booking_slots取得失敗", detail: slotsError },
        { status: 500 }
      );
    }

    if (!slots || slots.length === 0) {
      return Response.json({
        success: true,
        message: "明日の予約済みslotはありません",
        sentCount: 0,
      });
    }

    const slotIds = slots.map((s) => s.id);

    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select("slot_id, email")
      .in("slot_id", slotIds);

    if (bookingsError) {
      return Response.json(
        { error: "bookings取得失敗", detail: bookingsError },
        { status: 500 }
      );
    }

    if (!bookings || bookings.length === 0) {
      return Response.json({
        success: true,
        message: "送信対象bookingがありません",
        sentCount: 0,
      });
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL || "https://photofleur.vercel.app";

    const results = [];

    for (const booking of bookings) {
      try {
        const res = await fetch(`${baseUrl}/api/send-day-before-mail`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            slot_id: booking.slot_id,
            email: booking.email,
          }),
        });

        const text = await res.text();

        results.push({
          slot_id: booking.slot_id,
          email: booking.email,
          ok: res.ok,
          response: text,
        });
      } catch (error) {
        results.push({
          slot_id: booking.slot_id,
          email: booking.email,
          ok: false,
          response: String(error),
        });
      }
    }

    const sentCount = results.filter((r) => r.ok).length;

    return Response.json({
      success: true,
      message: "cron送信完了",
      sentCount,
      totalCount: results.length,
      results,
    });
  } catch (error) {
    return Response.json(
      { error: "cron送信失敗", detail: String(error) },
      { status: 500 }
    );
  }
}