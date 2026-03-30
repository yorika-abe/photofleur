import { supabase } from "@/lib/supabase";

export async function POST(req) {
  const body = await req.json();

  const { slot_id, name, email } = body;

  const { error } = await supabase
    .from("bookings")
    .insert([
      {
        slot_id,
        name,
        email,
      },
    ]);

  if (error) {
    return new Response(JSON.stringify(error), { status: 500 });
  }

  return Response.json({ success: true });
}