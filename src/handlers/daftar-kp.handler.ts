import { Context } from "hono";
import DaftarKPService from "../services/daftar-kp.service";
import { APIError } from "../utils/api-error.util";
import {
  PatchBerkasMahasiswaInterface,
  PutDataInstansiInterface,
  PutMahasiswaParamsInterface,
} from "../types/daftar-kp/handler.type";

export default class DaftarKPHandler {
  public static async createPembimbingInstansi(c: Context) {
    const { email } = c.get("user");
    const { nama, no_hp, email_pembimbing_instansi, jabatan } =
      await c.req.json();

    return c.json(
      await DaftarKPService.createPembimbingInstansi({
        nama,
        no_hp,
        email,
        email_pembimbing_instansi,
        jabatan,
      })
    );
  }

  public static async getPembimbingInstansi(c: Context) {
    const { email } = c.get("user");

    return c.json(await DaftarKPService.getPembimbingInstansi(email));
  }

  public static async postLOGPPencetakanSuratPengantar(c: Context) {
    const { id } = await c.req.json();

    if (!id) {
      throw new APIError("ID pendaftaran kerja praktik tidak diisi", 400);
    }

    return c.json(
      await DaftarKPService.postLOGPPencetakanSuratPengantar(id),
      201
    );
  }

  public static async getStatistikPendaftaran(c: Context) {
    return c.json(await DaftarKPService.getStatistikPendaftaran());
  }

  public static async getDataDosen(c: Context) {
    return c.json(await DaftarKPService.getDataDosen());
  }

  public static async patchBerkasDaftarKP(c: Context) {
    const { email } = c.get("user");
    const {
      data,
      nomorBerkas,
      tanggalMulai,
      tanggalSelesai,
      email_pembimbing_instansi,
    } = await c.req.json();

    if (!email) {
      throw new APIError("Data email tidak ditemukan", 400);
    } else if (!data) {
      throw new APIError("Link surat tidak diisi", 400);
    } else if (!nomorBerkas && nomorBerkas !== 0) {
      throw new APIError("Nomor berkas tidak diisi", 400);
    }
    return c.json(
      await DaftarKPService.patchBerkasDaftarKP(
        email,
        data,
        nomorBerkas,
        tanggalMulai,
        tanggalSelesai,
        email_pembimbing_instansi
      )
    );
  }

  public static async patchBerkasMahasiswa(c: Context) {
    const { id } = c.req.param();
    const { nomorBerkas, status, catatan, nipDospem } =
      (await c.req.json()) as PatchBerkasMahasiswaInterface;
    if (!id) {
      throw new APIError("ID pendaftaran KP tidak ditemukan");
    }

    if (!nomorBerkas && nomorBerkas !== 0) {
      throw new APIError("Nomor Berkas Kosong");
    }

    if (!status || (status !== "Divalidasi" && status !== "Ditolak")) {
      throw new APIError(
        "Status Berkas Kosong atau tidak sesuai dengan format"
      );
    }

    return c.json(
      await DaftarKPService.patchBerkasMahasiswa(
        id,
        nomorBerkas,
        status,
        catatan,
        nipDospem
      )
    );
  }

  public static async patchTanggalDaftarKP(c: Context) {
    const { tanggalMulai, tanggalTerakhir, type } = await c.req.json();
    return c.json(
      await DaftarKPService.patchTanggalDaftarKP(
        tanggalMulai,
        tanggalTerakhir,
        type
      )
    );
  }

  public static async getTanggalDaftarKP(c: Context) {
    return c.json(await DaftarKPService.getTanggalDaftarKP());
  }

  public static async getLOGKPendaftaranKPById(c: Context) {
    const idKP = c.req.param("idKP");

    if (!idKP) {
      throw new APIError("Gagal mendapatkan data LOG Pendaftaran KP");
    }

    return c.json(await DaftarKPService.getLOGKPendaftaranKPById(idKP));
  }

  public static async getDataKPDetailMahasiswa(c: Context) {
    const idKP = c.req.param("id");

    if (!idKP) {
      throw new APIError("Gagal mendapatkan data detail kp mahasiswa");
    }

    return c.json(await DaftarKPService.getDataKPDetailMahasiswa(idKP));
  }

  public static async getDataKPMahasiswa(c: Context) {
    return c.json(await DaftarKPService.getDataKPMahasiswa());
  }

  public static async getDataKPMahasiswaBagianUmum(c: Context) {
    return c.json(await DaftarKPService.getDataKPMahasiswaBagianUmum());
  }

  public static async deleteDataInstansi(c: Context) {
    const id = c.req.param("id");

    if (!id) {
      throw new APIError("ID data instansi kosong");
    }

    return c.json(await DaftarKPService.deleteDataInstansi(id));
  }

  public static async patchDataInstansi(c: Context) {
    const { id } = c.req.param();
    const { status } = (await c.req.json()) as PutDataInstansiInterface;

    if (!id) {
      throw new APIError("ID data instansi kosong");
    } else if (
      status !== "Aktif" &&
      status !== "Pending" &&
      status !== "Tidak_Aktif" &&
      status !== ""
    ) {
      throw new APIError("Status instansi tidak valid");
    }

    return c.json(await DaftarKPService.patchDataInstansi(id, status));
  }

  public static async createInstansi(c: Context) {
    const {
      status,
      profil_singkat,
      nama,
      alamat,
      longitude,
      latitude,
      radius,
      jenis,
      nama_pj,
      no_hp_pj,
    } = await c.req.json();

    if (
      !status ||
      !nama ||
      !longitude ||
      !latitude ||
      !radius ||
      !jenis ||
      !nama_pj ||
      !no_hp_pj
    ) {
      throw new APIError("Format data instansi tidak valid", 400);
    }

    if (
      status !== "Aktif" &&
      status !== "Pending" &&
      status !== "Tidak_Aktif" &&
      status !== ""
    ) {
      throw new APIError("Status instansi tidak valid");
    }

    if (
      jenis &&
      jenis !== "Pendidikan" &&
      jenis !== "UMKM" &&
      jenis !== "Swasta" &&
      jenis !== "Pemerintahan"
    ) {
      throw new APIError("Harus memasukkan jenis instansi yang valid");
    }

    return c.json(
      await DaftarKPService.createInstansi({
        longitude,
        latitude,
        radius,
        status,
        profil_singkat,
        nama,
        alamat,
        jenis,
        nama_pj,
        no_hp_pj,
      }),
      201
    );
  }

  public static async editDataInstansi(c: Context) {
    const { id } = c.req.param();
    const {
      status,
      profil_singkat,
      nama,
      alamat,
      longitude,
      latitude,
      radius,
      jenis,
      nama_pj,
      no_hp_pj,
    } = (await c.req.json()) as PutDataInstansiInterface;

    if (!id) {
      throw new APIError("ID data instansi kosong");
    } else if (
      status !== "Aktif" &&
      status !== "Pending" &&
      status !== "Tidak_Aktif" &&
      status !== ""
    ) {
      throw new APIError("Status instansi tidak valid");
    }

    return c.json(
      await DaftarKPService.editDataInstansi(
        id,
        status,
        profil_singkat,
        nama,
        alamat,
        longitude,
        latitude,
        radius,
        jenis,
        nama_pj,
        no_hp_pj
      )
    );
  }

  public static async getDataDetailInstansi(c: Context) {
    const id = c.req.param("id");

    if (!id) {
      throw new Error("ID instansi kosong");
    }

    return c.json(await DaftarKPService.getDataDetailInstansi(id));
  }

  public static async getAllDataInstansi(c: Context) {
    return c.json(await DaftarKPService.getAllDataInstansi());
  }

  public static async getKPTerbaruMahasiswa(c: Context) {
    const { email } = c.get("user");

    if (!email) {
      throw new APIError("Email tidak ditemukan");
    }

    return c.json(await DaftarKPService.getKPTerbaruMahasiswa(email));
  }

  public static async updatePermohonanPendaftaranKP(c: Context) {
    const { email } = c.get("user");

    const {
      tanggalMulai = new Date(),
      tujuanSuratInstansi,
      idInstansi,
      judul_kp,
      kelas_kp,
    } = await c.req.json();

    if (!email) {
      throw new APIError("Email tidak ditemukan");
    }

    return c.json(
      await DaftarKPService.updatePermohonanPendaftaranKP({
        email,
        tanggalMulai,
        tujuanSuratInstansi,
        idInstansi,
        judul_kp,
        kelas_kp,
      })
    );
  }

  public static async createPermohonanPendaftaranKP(c: Context) {
    const { email } = c.get("user");
    const {
      tanggalMulai = new Date(),
      tujuanSuratInstansi,
      idInstansi,
      judul_kp,
      kelas_kp,
    } = await c.req.json();

    try {
      if (!email) {
        throw new APIError("Email tidak ditemukan");
      } else if (
        !tanggalMulai ||
        !Date.parse(tanggalMulai) ||
        !tujuanSuratInstansi ||
        !idInstansi
      ) {
        throw new APIError("Data yang anda masukkan kurang lengkap!");
      }
    } catch (e) {
      throw new APIError("Terdapat sebuah kesalahan pada input");
    }

    return c.json(
      await DaftarKPService.createPermohonanPendaftaranKP({
        email,
        tanggalMulai,
        tujuanSuratInstansi,
        idInstansi,
        judul_kp,
        kelas_kp,
      }),
      201
    );
  }

  public static async getTahunAjaran(c: Context) {
    return c.json(await DaftarKPService.getTahunAjaran());
  }

  public static async getDataInstansi(c: Context) {
    const { email } = c.get("user");
    if (!email) {
      throw new APIError("Email mahasiswa tidak ditemukan");
    }
    return c.json(await DaftarKPService.getDataInstansi(email));
  }

  public static async createPermohonanPendaftaranInstansi(c: Context) {
    const { email } = c.get("user");

    const {
      namaInstansi,
      alamatInstansi,
      namaPenanggungJawabInstansi,
      telpPenanggungJawabInstansi,
      jenisInstansi,
      longitude,
      latitude,
      radius,
      profilSingkat,
    } = await c.req.json();

    if (!email) {
      throw new APIError("Data email tidak ditemukan", 400);
    } else if (
      !namaInstansi ||
      !alamatInstansi ||
      !namaPenanggungJawabInstansi ||
      !telpPenanggungJawabInstansi ||
      !jenisInstansi ||
      !longitude ||
      !latitude
    ) {
      throw new APIError("Data yang anda masukkan tidak lengkap", 400);
    }

    return c.json(
      await DaftarKPService.createPermohonanPendaftaranInstansi({
        email,
        namaInstansi,
        alamatInstansi,
        namaPenanggungJawabInstansi,
        telpPenanggungJawabInstansi,
        jenisInstansi,
        longitude,
        latitude,
        radius,
        profilSingkat,
      }),
      201
    );
  }

  public static async getBerkasMahasiswa(c: Context) {
    return c.json(await DaftarKPService.getBerkasMahasiswa());
  }

  public static async putBerkasMahasiswa(c: Context) {
    const { id } = c.req.param();
    const {
      status,
      kelas_kp,
      tujuan_surat_instansi,
      link_surat_penolakan_instansi,
      link_surat_pengantar,
      link_surat_balasan,
      link_surat_penunjukkan_dospem,
      link_surat_perpanjangan_kp,
      id_surat_pengajuan_dospem,
      status_link_surat_penolakan_instansi,
      status_link_surat_pengantar,
      status_link_surat_balasan,
      status_link_surat_penunjukkan_dospem,
      status_link_surat_perpanjangan_kp,
      status_id_surat_pengajuan_dospem,
      catatan_link_surat_penolakan_instansi,
      catatan_link_surat_pengantar,
      catatan_link_surat_balasan,
      catatan_link_surat_penunjukkan_dospem,
      catatan_link_surat_perpanjangan_kp,
      catatan_id_surat_pengajuan_dospem,
      catatan_penolakan,
      level_akses,
      judul_kp,
      alasan_lanjut_kp,
      id_instansi,
      tanggal_mulai,
      tanggal_selesai,
      nip_pembimbing,
    } = (await c.req.json()) as PutMahasiswaParamsInterface;

    if (!id) {
      throw new APIError("ID pendaftaran KP tidak ditemukan");
    }

    if (
      (status_link_surat_penolakan_instansi !== null &&
        status_link_surat_penolakan_instansi !== undefined &&
        status_link_surat_penolakan_instansi !== "Divalidasi" &&
        status_link_surat_penolakan_instansi !== "Terkirim" &&
        status_link_surat_penolakan_instansi !== "Ditolak") ||
      (status_link_surat_pengantar !== null &&
        status_link_surat_pengantar !== undefined &&
        status_link_surat_pengantar !== "Divalidasi" &&
        status_link_surat_pengantar !== "Terkirim" &&
        status_link_surat_pengantar !== "Ditolak") ||
      (status_link_surat_balasan !== null &&
        status_link_surat_balasan !== undefined &&
        status_link_surat_balasan !== "Divalidasi" &&
        status_link_surat_balasan !== "Terkirim" &&
        status_link_surat_balasan !== "Ditolak") ||
      (status_id_surat_pengajuan_dospem !== null &&
        status_id_surat_pengajuan_dospem !== undefined &&
        status_id_surat_pengajuan_dospem !== "Divalidasi" &&
        status_id_surat_pengajuan_dospem !== "Terkirim" &&
        status_id_surat_pengajuan_dospem !== "Ditolak") ||
      (status_link_surat_penunjukkan_dospem !== null &&
        status_link_surat_penunjukkan_dospem !== undefined &&
        status_link_surat_penunjukkan_dospem !== "Divalidasi" &&
        status_link_surat_penunjukkan_dospem !== "Terkirim" &&
        status_link_surat_penunjukkan_dospem !== "Ditolak") ||
      (status_link_surat_perpanjangan_kp !== null &&
        status_link_surat_perpanjangan_kp !== undefined &&
        status_link_surat_perpanjangan_kp !== "Divalidasi" &&
        status_link_surat_perpanjangan_kp !== "Terkirim" &&
        status_link_surat_perpanjangan_kp !== "Ditolak")
    ) {
      throw new APIError(
        "Status validasi link berkas mahasiswa tidak sesuai dengan format"
      );
    }
    return c.json(
      await DaftarKPService.putBerkasMahasiswa({
        id,
        status,
        kelas_kp,
        tujuan_surat_instansi,
        link_surat_penolakan_instansi,
        link_surat_pengantar,
        link_surat_balasan,
        link_surat_penunjukkan_dospem,
        link_surat_perpanjangan_kp,
        id_surat_pengajuan_dospem,
        status_link_surat_penolakan_instansi,
        status_link_surat_pengantar,
        status_link_surat_balasan,
        status_link_surat_penunjukkan_dospem,
        status_link_surat_perpanjangan_kp,
        status_id_surat_pengajuan_dospem,
        catatan_link_surat_penolakan_instansi,
        catatan_link_surat_pengantar,
        catatan_link_surat_balasan,
        catatan_link_surat_penunjukkan_dospem,
        catatan_link_surat_perpanjangan_kp,
        catatan_id_surat_pengajuan_dospem,
        catatan_penolakan,
        level_akses,
        judul_kp,
        alasan_lanjut_kp,
        id_instansi,
        tanggal_mulai,
        tanggal_selesai,
        nip_pembimbing,
      })
    );
  }

  public static async getRiwayatPendaftaranKP(c: Context) {
    const { email } = c.get("user");

    if (!email) {
      throw new APIError("Data email kosong", 400);
    }

    return c.json(await DaftarKPService.getRiwayatPendaftaranKP(email));
  }
}
