import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const f = createUploadthing();

export const ourFileRouter = {
  // Card attachments — images and documents up to 16MB.
  cardAttachment: f({
    image: { maxFileSize: "16MB", maxFileCount: 1 },
    pdf: { maxFileSize: "16MB", maxFileCount: 1 },
    "text/plain": { maxFileSize: "4MB", maxFileCount: 1 },
  })
    .input(z.object({ cardId: z.string().uuid() }))
    .middleware(async ({ input }) => {
      const session = await auth();
      if (!session?.user?.id) throw new UploadThingError("Unauthorized");

      const card = await db.card.findFirst({
        where: {
          id: input.cardId,
          list: { board: { workspaceId: session.user.workspaceId ?? "" } },
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!card) throw new UploadThingError("Card not found or access denied");

      return { userId: session.user.id, cardId: input.cardId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      await db.attachment.create({
        data: {
          cardId: metadata.cardId,
          name: file.name,
          url: file.ufsUrl,
          fileType: file.type,
          fileSize: file.size,
        },
      });
      return { uploadedBy: metadata.userId, url: file.ufsUrl };
    }),

  // User avatar — image only, max 4MB.
  userAvatar: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(async () => {
      const session = await auth();
      if (!session?.user?.id) throw new UploadThingError("Unauthorized");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      await db.user.update({ where: { id: metadata.userId }, data: { avatarUrl: file.ufsUrl } });
      return { url: file.ufsUrl };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
