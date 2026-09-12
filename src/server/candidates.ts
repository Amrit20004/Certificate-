import { prisma } from "@/lib/prisma";

export async function deleteCandidate(id: string) {
  const candidate = await prisma.candidate.findUnique({
    where: { id },
    include: { certificates: { select: { id: true } } },
  });

  if (!candidate) {
    throw new Error("Candidate not found");
  }

  const certIds = candidate.certificates.map((c) => c.id);

  return await prisma.$transaction(async (tx) => {
    if (certIds.length > 0) {
      await tx.auditLog.deleteMany({
        where: { certificateId: { in: certIds } },
      });
      await tx.certificate.deleteMany({
        where: { id: { in: certIds } },
      });
    }

    return await tx.candidate.delete({
      where: { id },
    });
  });
}
