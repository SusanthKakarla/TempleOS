import { NextRequest, NextResponse } from "next/server";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { createNotificationMedia } from "@/lib/db/notification-media";
import { uploadImage } from "@/lib/media/imagekit";
import { NOTIFICATION_MEDIA_CATEGORIES, type NotificationMediaCategory } from "@/types/db";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function isMediaCategory(value: string): value is NotificationMediaCategory {
  return (NOTIFICATION_MEDIA_CATEGORIES as readonly string[]).includes(value);
}

export async function POST(req: NextRequest) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;

  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  const category = formData.get("category");
  const title = formData.get("title");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (typeof category !== "string" || !isMediaCategory(category)) {
    return NextResponse.json({ error: "Invalid media category" }, { status: 400 });
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Only JPG, PNG, and WEBP images are supported" }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File must be 5MB or smaller" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadImage(buffer, `templeos/${session.tenantId}/${category}`, file.name);

    const media = await createNotificationMedia(session.tenantId, {
      category,
      title: typeof title === "string" && title.trim() ? title.trim() : null,
      storageKey: uploaded.fileId,
      imageUrl: uploaded.url,
      mimeType: file.type,
      width: uploaded.width,
      height: uploaded.height,
      fileSize: uploaded.bytes,
      createdBy: session.membershipId,
    });

    return NextResponse.json({ media }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message.includes("ImageKit credentials")) {
      return NextResponse.json({ error: "Image storage is not configured" }, { status: 503 });
    }
    throw err;
  }
}
