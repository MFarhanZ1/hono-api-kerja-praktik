import prisma from "../infrastructures/db.infrastructure";

export default class MahasiswaHelper {
  public static getSemesterByNIM(nim: string): number {
    const angkatan = nim.substring(1, 3);
    const tahunMasuk = 2000 + Number(angkatan);

    const tahunSekarang = new Date().getFullYear();
    const bulanSekarang = new Date().getMonth();

    let tahunLewat = tahunSekarang - tahunMasuk;
    let semester = tahunLewat * 2;

    if (bulanSekarang >= 7) {
      semester += 1;
    }
    return semester;
  }

  public static async getTahunAjaran(): Promise<number> {
    const date = new Date();
    let id = ((date.getFullYear() - 1) * 10000 + date.getFullYear()) * 10 + 1;

    if (date.getMonth() >= 7) {
      return date.getFullYear() * 10000 + (date.getFullYear() + 1) * 10 + 1;
    }
    const dataTahunAjaran = await prisma.tahun_ajaran.findUnique({
      where: {
        id,
      },
    });

    if (!dataTahunAjaran) {
      await prisma.tahun_ajaran.create({
        data: {
          id,
        },
      });
    }

    // kalau memang masih pakai table, berarti harus query find data pada tahun table ajaran, jika tidak ada maka prisma.create

    return id;
  }
}
