import MahasiswaHelper from "../helpers/mahasiswa.helper";
import prisma from "../infrastructures/db.infrastructure";
import DaftarKPRepository from "../repositories/daftar-kp.repository";

export async function cekTerdaftarTahunAjaran(): Promise<boolean> {
  const getTahunAjaran = await MahasiswaHelper.getTahunAjaran();

  const dataKP = await prisma.pendaftaran_kp.findFirst({
    where: {
      id_tahun_ajaran: getTahunAjaran,
    },
  });

  if (dataKP) {
    return true;
  }

  return false;
}
