import prisma from "../infrastructures/db.infrastructure";

export async function blackListInstansi(nim: string): Promise<string[]> {
  const dataKP = await prisma.pendaftaran_kp.findMany({
    where: {
      nim,
      AND: {
        status: "Gagal",
        OR: [
          {
            id_instansi: {
              not: null,
            },
          },
          {
            id_instansi: {
              not: undefined,
            },
          },
        ],
      },
    },
  });

  return dataKP.map((item) => item.id_instansi!);
}
