import { supabase } from "@/lib/supabase";

export async function POST(req) {
  try {
    const body = await req.json();
    const { slot_id, name, email } = body;

    if (!slot_id || !name || !email) {
      return new Response(
        JSON.stringify({ error: "slot_id, name, email is required" }),
        { status: 400 }
      );
    }

    // すでに予約済みか確認
    const { data: existingSlot, error: existingSlotError } = await supabase
      .from("booking_slots")
      .select("id, is_reserved")
      .eq("id", slot_id)
      .single();

    if (existingSlotError) {
      return new Response(JSON.stringify(existingSlotError), { status: 500 });
    }

    if (existingSlot?.is_reserved) {
      return new Response(
        JSON.stringify({ error: "この枠はすでに予約済みです" }),
        { status: 400 }
      );
    }

    // 予約保存
    const { error: bookingError } = await supabase.from("bookings").insert([
      {
        slot_id,
        name,
        email,
      },
    ]);

    if (bookingError) {
      return new Response(JSON.stringify(bookingError), { status: 500 });
    }

    // 枠を予約済みにする
    const { error: updateError } = await supabase
      .from("booking_slots")
      .update({ is_reserved: true })
      .eq("id", slot_id);

    if (updateError) {
      return new Response(JSON.stringify(updateError), { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500 }
    );
  }
}