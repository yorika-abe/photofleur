export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get("secret");

    if (secret !== process.env.CRON_SECRET) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    return Response.json({
      success: true,
      message: "cron動作OK",
    });

  } catch (error) {
    return Response.json(
      { error: "cronエラー", detail: String(error) },
      { status: 500 }
    );
  }
}
