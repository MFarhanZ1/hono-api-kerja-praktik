import { pendaftaran_kp } from "../generated/prisma";
import DaftarKPRepository from "../repositories/daftar-kp.repository";
import MahasiswaRepository from "../repositories/mahasiswa.repository";
import {
  CreatePermohonanPendaftaranKPInterface,
  CreatePermohonanPendaftaranInstansiInterface,
  GetRiwayatPendaftaranKP,
  GetBerkasMahasiswa,
  GetPendaftaranKPTerbaru,
  ServicePendaftaranKPMahasiswa,
  ServiceDetailPendaftaranKPMahasiswa,
  GetAllDataInstansi,
  ServiceDetailInstansi,
  ServiceTanggalDaftarKP,
  ServiceUpdateInstansiKP,
  ServiceLOGPendaftaranKPById,
  ServiceDataDosenInterface,
  PutMahasiswaParamsInterface,
  getTahunAjaranService,
  ServiceStatistikPendaftaran,
  PembimbingInstansiInterface,
} from "../types/daftar-kp/service.type";
import { CommonResponse } from "../types/global.type";
import { APIError } from "../utils/api-error.util";
import { IsPendaftaranKPClosed } from "../validators/batas-waktu-pendaftaran..validator";
import { cekKPTerbaruMahasiswa } from "../validators/cek-kp-terbaru-mahasiswa";
import { cekTerdaftarTahunAjaran } from "../validators/cek-terdaftar-tahun-ajaran.validator";
import { blackListInstansi } from "../validators/instansi-blacklist.validator";

export default class DaftarKPService {
  public static async createPembimbingInstansi(dataInput: {
    nama: string;
    no_hp: string;
    email: string;
    email_pembimbing_instansi: string;
    jabatan: string;
  }): Promise<CommonResponse> {
    const dataMhs = await MahasiswaRepository.findByEmail({
      email: dataInput.email,
    });

    if (!dataMhs) {
      throw new APIError("Data mahasiswa tidak ditemukan", 404);
    }

    const dataKP = await DaftarKPRepository.getKPTerbaruMahasiswa(dataMhs.nim);

    if (!dataKP) {
      throw new APIError("Data kerja praktik mahasiswa tidak ditemukan", 404);
    }

    if (!dataKP.id_instansi) {
      throw new APIError("ID Instansi kosong");
    }

    await DaftarKPRepository.createPembimbingInstansi(
      dataKP.id_instansi,
      dataInput
    );

    return {
      response: true,
      message: "Berhasil menambahkan data pembimbing instansi",
    };
  }

  public static async getPembimbingInstansi(
    email: string
  ): Promise<PembimbingInstansiInterface> {
    const dataMhs = await MahasiswaRepository.findByEmail({ email });

    if (!dataMhs) {
      throw new APIError("Data mahasiswa tidak ditemukan");
    }

    const dataKP = await DaftarKPRepository.getKPTerbaruMahasiswa(dataMhs.nim);

    if (!dataKP?.id_instansi) {
      throw new APIError("id instansi tidak ditemukan");
    }

    const data = await DaftarKPRepository.getPembimbingInstansi(
      dataKP.id_instansi
    );
    return {
      response: true,
      message: "Berhasil mendapatkan data pembimbing instansi",
      data,
    };
  }

  public static async postLOGPPencetakanSuratPengantar(
    id: string
  ): Promise<CommonResponse> {
    await DaftarKPRepository.postLOGPPencetakanSuratPengantar(id);

    return {
      response: true,
      message: "LOG pencetakan berkas surat pengantar berhasil dibuat",
    };
  }

  public static async getStatistikPendaftaran(): Promise<ServiceStatistikPendaftaran> {
    const data = await DaftarKPRepository.getStatistikPendaftaran();
    return {
      response: true,
      message: "Berhasil mendapatkan statistik pendaftaran",
      data,
    };
  }

  public static async getDataDosen(): Promise<ServiceDataDosenInterface> {
    const data = await DaftarKPRepository.getDataDosen();
    return {
      response: true,
      message: "Berhasil mendapatkan data dosen",
      data,
    };
  }

  public static async patchBerkasDaftarKP(
    email: string,
    data: string,
    nomorBerkas: number,
    tanggalMulai?: string,
    tanggalSelesai?: string,
    email_pembimbing_instansi?: string
  ): Promise<CommonResponse> {
    const dataMhs = await MahasiswaRepository.findByEmail({ email });

    if (!dataMhs) {
      throw new APIError("Data mahasiswa tidak ditemukan", 404);
    }

    const dataKP = await DaftarKPRepository.getKPTerbaruMahasiswa(dataMhs.nim);

    if (!dataKP) {
      throw new APIError("Data KP Mahasiswa tidak ditemukan", 404);
    }

    if (nomorBerkas < 0 || nomorBerkas > 5) {
      throw new APIError("Nomor berkas tidak kosong", 400);
    }

    if (
      (dataKP.level_akses < 1 && nomorBerkas === 1) ||
      (dataKP.level_akses < 3 && nomorBerkas === 2) ||
      (dataKP.level_akses < 5 && nomorBerkas === 3) ||
      (dataKP.level_akses < 7 && nomorBerkas === 4) ||
      (dataKP.level_akses < 9 && nomorBerkas === 5)
    ) {
      throw new APIError(
        "Anda mungkin tidak memiliki hak akses untuk mengunggah berkas terkait"
      );
    }

    await DaftarKPRepository.patchBerkasDaftarKP(
      dataKP,
      data,
      nomorBerkas,
      tanggalMulai,
      tanggalSelesai,
      email_pembimbing_instansi
    );

    return {
      response: true,
      message: "Berhasil mengunggah berkas daftar kerja praktik",
    };
  }

  public static async updatePermohonanPendaftaranKP({
    email,
    tanggalMulai,
    idInstansi,
    tujuanSuratInstansi,
    judul_kp,
    kelas_kp,
  }: CreatePermohonanPendaftaranKPInterface): Promise<CommonResponse> {
    const dataMhs = await MahasiswaRepository.findByEmail({ email });

    if (!dataMhs || !dataMhs.nim) {
      throw new APIError("Data mahasiswa tidak ditemukan", 404);
    }

    const dataKPMahasiswa = await cekKPTerbaruMahasiswa(dataMhs.nim);

    if (!dataKPMahasiswa) {
      throw new APIError("Data KP mahasiswa tidak ditemukan");
    }

    const isPendaftaranKPClosed = await IsPendaftaranKPClosed();

    if (isPendaftaranKPClosed) {
      throw new APIError("Tanggal Pendaftaran KP Sudah ditutup", 403);
    }

    const isAlreadyRegistered = await cekTerdaftarTahunAjaran(dataMhs.nim);

    if (!isAlreadyRegistered) {
      throw new APIError(
        "Anda belum terdaftar dalam kerja praktik pada tahun ajaran ini"
      );
    }

    const blackListInstansiID = await blackListInstansi(dataMhs.nim);

    if (blackListInstansiID.find((id) => id === idInstansi)) {
      throw new APIError("Instansi termasuk ke dalam daftar blacklist");
    }

    await DaftarKPRepository.updatePermohonanPendaftaranKP({
      dataKPMahasiswa,
      nim: dataMhs.nim,
      tanggalMulai,
      idInstansi,
      tujuanSuratInstansi,
      judul_kp,
      kelas_kp,
    });

    return {
      response: true,
      message: "Pendaftaran KP anda berhasil!",
    };
  }

  public static async getLOGKPendaftaranKPById(
    idKP: string
  ): Promise<ServiceLOGPendaftaranKPById> {
    const data = await DaftarKPRepository.getLOGByIdPendaftaranKP(idKP);

    return {
      response: true,
      message: "Berhasil mendapatkan data log pendaftaran KP",
      data,
    };
  }

  public static async patchTanggalDaftarKP(
    tanggalMulaiDaftarKP: string,
    tanggalTerakhirDaftarKP: string,
    type: "Regular" | "Lanjut"
  ) {
    const data = await DaftarKPRepository.patchTanggalDaftarKP(
      tanggalMulaiDaftarKP,
      tanggalTerakhirDaftarKP,
      type
    );

    return {
      response: true,
      message: "Berhasil mengupdate tanggal daftar KP",
      data,
    };
  }

  public static async getTanggalDaftarKP(): Promise<ServiceTanggalDaftarKP> {
    const data = await DaftarKPRepository.getTanggalDaftarKP();

    if (!data) {
      throw new APIError("Gagal mendapatkan tanggal daftar KP", 500);
    }

    return {
      response: true,
      message: "Berhasil mendapatkan tanggal Daftar KP",
      data,
    };
  }

  public static async getDataDetailInstansi(
    idInstansi: string
  ): Promise<ServiceDetailInstansi> {
    const data = await DaftarKPRepository.getDataDetailInstansi(idInstansi);
    if (!data) {
      throw new APIError("Data instansi tidak ditemukan", 404);
    }

    return {
      response: true,
      message: "Data instansi berhasil didapatkan",
      data,
    };
  }

  public static async getDataKPDetailMahasiswa(
    idKP: string
  ): Promise<ServiceDetailPendaftaranKPMahasiswa> {
    const data = await DaftarKPRepository.getPendaftaranKPById(idKP);

    if (!data) {
      throw new APIError("Data pendaftaran KP mahasiswa tidak ditemukan");
    }

    const dataKP = await DaftarKPRepository.getDataKPDetailMahasiswa(data);

    return {
      response: true,
      message: "Data lengkap pendaftaran KP mahasiswa berhasil didapatkan",
      data: dataKP,
    };
  }

  public static async getDataKPMahasiswaBagianUmum(): Promise<ServicePendaftaranKPMahasiswa> {
    const data = await DaftarKPRepository.getDataKPMahasiswaBagianUmum();

    return {
      response: true,
      message: "Data KP Mahasiswa berhasil didapatkan!",
      data,
    };
  }

  public static async getDataKPMahasiswa(): Promise<ServicePendaftaranKPMahasiswa> {
    const data = await DaftarKPRepository.getDataKPMahasiswa();

    return {
      response: true,
      message: "Data KP Mahasiswa berhasil didapatkan!",
      data,
    };
  }

  public static async deleteDataInstansi(id: string): Promise<CommonResponse> {
    const dataInstansi = await DaftarKPRepository.findInstansiById(id);

    if (!dataInstansi) {
      throw new APIError("Data instansi tidak ditemukan", 404);
    }

    await DaftarKPRepository.deleteDataInstansi(dataInstansi.id);

    return {
      response: true,
      message: "Data instansi berhasil dihapus",
    };
  }

  public static async patchBerkasMahasiswa(
    id: string,
    nomorBerkas: number,
    status: "Divalidasi" | "Ditolak",
    catatan?: string,
    nipDospem?: string
  ): Promise<CommonResponse> {
    const dataKP = await DaftarKPRepository.getPendaftaranKPById(id);

    if (!dataKP) {
      throw new APIError("Data pendaftaran kerja praktik tidak ditemukan");
    }

    if (nomorBerkas < 0 || nomorBerkas > 5) {
      throw new APIError("Nomor berkas tidak valid");
    }

    if (!nipDospem && nomorBerkas === 2) {
      throw new APIError("Dosen pembimbing wajib dipilih");
    }

    await DaftarKPRepository.patchBerkasMahasiswa(
      dataKP,
      nomorBerkas,
      status,
      catatan,
      nipDospem
    );

    return {
      response: true,
      message: "Berkas mahasiswa berhasil diperbarui",
    };
  }

  public static async patchDataInstansi(
    id: string,
    status?: string
  ): Promise<ServiceUpdateInstansiKP> {
    const dataInstansi = await DaftarKPRepository.findInstansiById(id);

    if (!dataInstansi) {
      throw new APIError("Data instansi tidak ditemukan", 404);
    }

    const result = await DaftarKPRepository.patchDataInstansi(
      dataInstansi.id,
      status
    );

    return {
      response: true,
      message: "Data instansi berhasil disimpan",
      data: result,
    };
  }

  public static async createInstansi({
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
  }: {
    longitude: number;
    latitude: number;
    radius: number;
    status: string;
    profil_singkat?: string;
    nama: string;
    alamat: string;
    jenis: string;
    nama_pj: string;
    no_hp_pj: string;
  }): Promise<CommonResponse> {
    await DaftarKPRepository.createInstansi({
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
    });

    return {
      response: true,
      message: "Instansi berhasil ditambahkan",
    };
  }

  public static async editDataInstansi(
    id: string,
    status?: string,
    profil_singkat?: string,
    nama?: string,
    alamat?: string,
    longitude?: number,
    latitude?: number,
    radius?: number,
    jenis?: string,
    nama_pj?: string,
    no_hp_pj?: string
  ): Promise<ServiceUpdateInstansiKP> {
    const dataInstansi = await DaftarKPRepository.findInstansiById(id);

    if (!dataInstansi) {
      throw new APIError("Data instansi tidak ditemukan", 404);
    }

    const result = await DaftarKPRepository.editDataInstansi(
      dataInstansi.id,
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
    );

    return {
      response: true,
      message: "Data instansi berhasil disimpan",
      data: result,
    };
  }

  public static async getAllDataInstansi(): Promise<GetAllDataInstansi> {
    const data = await DaftarKPRepository.getAllDataInstansi();

    return {
      response: true,
      message: "Data instansi berhasil didapatkan",
      data,
    };
  }

  public static async getKPTerbaruMahasiswa(
    email: string
  ): Promise<GetPendaftaranKPTerbaru> {
    const dataMhs = await MahasiswaRepository.findByEmail({ email });
    if (!dataMhs || !dataMhs.nim) {
      throw new APIError("Data mahasiswa tidak ditemukan", 404);
    }

    const data = await DaftarKPRepository.getKPTerbaruMahasiswa(dataMhs.nim);

    if (!data) {
      throw new APIError("Data kerja praktik mahasiswa tidak ditemukan", 404);
    }

    return {
      response: true,
      message: "Data KP mahasiswa saat ini berhasil didapatkan",
      data,
    };
  }

  public static async getTahunAjaran(): Promise<getTahunAjaranService> {
    const dataTahunAjaran = await DaftarKPRepository.getTahunAjaran();

    return {
      response: true,
      message: "Berhasil mendapatkan data tahun ajaran",
      data: dataTahunAjaran,
    };
  }

  public static async createPermohonanPendaftaranKP({
    email,
    tanggalMulai,
    idInstansi,
    tujuanSuratInstansi,
    judul_kp,
    kelas_kp,
  }: CreatePermohonanPendaftaranKPInterface): Promise<CommonResponse> {
    const dataMhs = await MahasiswaRepository.findByEmail({ email });

    if (!dataMhs || !dataMhs.nim) {
      throw new APIError("Data mahasiswa tidak ditemukan", 404);
    }

    const dataKPMahasiswa = await cekKPTerbaruMahasiswa(dataMhs.nim);

    if (dataKPMahasiswa && dataKPMahasiswa.level_akses > 0) {
      throw new APIError(
        "Mahasiswa sudah melakukan pendaftaran KP pada periode ini",
        404
      );
    }

    const dataInstansi = await DaftarKPRepository.findInstansiById(idInstansi);

    if (!dataInstansi) {
      throw new APIError("Data instansi tidak ditemukan");
    } else if (dataInstansi.status === "Pending") {
      throw new APIError("Instansi belum disetujui oleh koordinator KP");
    } else if (dataInstansi.status === "Tidak_Aktif") {
      throw new APIError("Instansi yang dipilih tidak aktif");
    }

    const isPendaftaranKPClosed = await IsPendaftaranKPClosed();

    if (isPendaftaranKPClosed) {
      throw new APIError("Tanggal Pendaftaran KP Sudah ditutup", 403);
    }

    const blackListInstansiID = await blackListInstansi(dataMhs.nim);

    if (blackListInstansiID.find((id) => id === idInstansi)) {
      throw new APIError("Instansi termasuk ke dalam daftar blacklist");
    }

    await DaftarKPRepository.createPermohonanKP({
      nim: dataMhs.nim,
      tanggalMulai,
      idInstansi,
      tujuanSuratInstansi,
      judul_kp,
      kelas_kp,
    });

    return {
      response: true,
      message: "Pendaftaran KP anda berhasil!",
    };
  }

  public static async createPermohonanPendaftaranInstansi({
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
  }: CreatePermohonanPendaftaranInstansiInterface): Promise<CommonResponse> {
    const dataMhs = await MahasiswaRepository.findByEmail({ email });

    if (!dataMhs || !dataMhs.nim) {
      throw new APIError("Data mahasiswa tidak ditemukan", 404);
    }

    await DaftarKPRepository.createPermohonanInstansi({
      nim: dataMhs.nim,
      namaInstansi,
      alamatInstansi,
      namaPenanggungJawabInstansi,
      telpPenanggungJawabInstansi,
      jenisInstansi,
      longitude,
      latitude,
      radius,
      profilSingkat,
    });

    return {
      response: true,
      message: "Pendaftaran Instansi anda berhasil!",
    };
  }

  public static async getRiwayatPendaftaranKP(
    email: string
  ): Promise<GetRiwayatPendaftaranKP> {
    const dataMhs = await MahasiswaRepository.findByEmail({ email });

    if (!dataMhs || !dataMhs.nim) {
      throw new APIError("Data mahasiswa tidak ditemukan", 404);
    }

    const data = await DaftarKPRepository.getRiwayatPendaftaranKP(dataMhs.nim);

    return {
      response: true,
      message: "Riwayat KP anda berhasil didapatkan!",
      data,
    };
  }

  public static async getBerkasMahasiswa(): Promise<GetBerkasMahasiswa> {
    const data = {
      suratPengantar: [] as pendaftaran_kp[] | null,
      suratBalasan: [] as pendaftaran_kp[] | null,
      idPengajuanDosenPembimbing: [] as pendaftaran_kp[] | null,
      suratPenunjukkanDosenPembimbing: [] as pendaftaran_kp[] | null,
      suratPerpanjanganKP: [] as pendaftaran_kp[] | null,
    };

    data.suratPengantar =
      await DaftarKPRepository.getBerkasSuratPengantarMahasiswa();

    data.suratBalasan =
      await DaftarKPRepository.getBerkasSuratBalasanMahasiswa();

    data.idPengajuanDosenPembimbing =
      await DaftarKPRepository.getBerkasIdPengajuanDosenPembimbingMahasiswa();

    data.suratPenunjukkanDosenPembimbing =
      await DaftarKPRepository.getBerkasPenunjukkanDosenPembimbingMahasiswa();

    data.suratPerpanjanganKP =
      await DaftarKPRepository.getBerkasSuratPerpanjanganKPMahasiswa();

    return {
      response: true,
      message: "Berkas mahasiswa berhasil didapatkan",
      data,
    };
  }

  public static async getDataInstansi(email: string) {
    const dataMhs = await MahasiswaRepository.findByEmail({ email });

    if (!dataMhs) {
      throw new APIError("Data mahasiswa tidak ditemukan", 404);
    }

    const data = await DaftarKPRepository.getDataInstansi(dataMhs.nim);

    return {
      response: true,
      message: "Data instansi berhasil diambil",
      data,
    };
  }

  public static async putBerkasMahasiswa(
    dataBaru: PutMahasiswaParamsInterface
  ): Promise<CommonResponse> {
    const dataKP = await DaftarKPRepository.getPendaftaranKPById(dataBaru.id);

    if (!dataKP) {
      throw new APIError("Data pendaftaran kerja praktik tidak ditemukan");
    }

    if (dataKP.level_akses > 11 || dataKP.level_akses < 0) {
      throw new APIError("Level akses mahasiswa tidak memenuhi syarat");
    }

    await DaftarKPRepository.putBerkasMahasiswa(dataBaru, dataKP);
    return {
      response: true,
      message: "Berkas mahasiswa berhasil disetujui",
    };
  }
}
