import { Resend } from "resend";

export async function POST() {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const data = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: "yorikarin1101@icloud.com",
      subject: "テストメール",
      html: "<p>テスト送信成功🔥</p>",
    });

    return Response.json(data);
  } catch (error) {
    return new Response(JSON.stringify(error), { status: 500 });
  }
}