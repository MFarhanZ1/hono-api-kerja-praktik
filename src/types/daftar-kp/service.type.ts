import { CommonResponse } from "../global.type";
import {
  $Enums,
  instansi,
  jenis_instansi,
  LOG,
  option,
  pendaftaran_kp,
} from "../../generated/prisma";
import {
  GetAllDataInstansiRepository,
  getTahunAjaran,
  RepositoryDetailPendaftaranKPMahasiswa,
  RepositoryPendaftaranKPMahasiswaInterface,
  RepositoryRiwayatPendaftaranKPInterface,
} from "./repository.type";

export interface ServiceStatistikPendaftaran extends CommonResponse {
  data: {
    pendaftarPerTahunAjaran: {
      _count: number;
      id_tahun_ajaran: number | null;
    }[];
    pendaftarPerAngkatan: {
      [key: string]: number;
    };
  };
}

export interface CreatePermohonanPendaftaranKPInterface {
  email: string;
  tanggalMulai: Date;
  idInstansi: string;
  tujuanSuratInstansi: string;
  judul_kp?: string;
  kelas_kp?: string;
}

export interface ServiceDataDosenInterface extends CommonResponse {
  data: {
    nip: string;
    nama: string;
  }[];
}

export interface CreatePermohonanPendaftaranInstansiInterface {
  email: string;
  namaInstansi: string;
  alamatInstansi: string;
  jenisInstansi: jenis_instansi;
  profilSingkat?: string;
  longitude: number;
  latitude: number;
  radius?: number;
  namaPenanggungJawabInstansi: string;
  telpPenanggungJawabInstansi: string;
}

export interface GetRiwayatPendaftaranKP extends CommonResponse {
  data: RepositoryRiwayatPendaftaranKPInterface[] | null;
}

export interface GetBerkasMahasiswa extends CommonResponse {
  data: {
    suratPengantar: pendaftaran_kp[] | null;
    suratBalasan: pendaftaran_kp[] | null;
    idPengajuanDosenPembimbing: pendaftaran_kp[] | null;
    suratPenunjukkanDosenPembimbing: pendaftaran_kp[] | null;
    suratPerpanjanganKP: pendaftaran_kp[] | null;
  };
}

export interface GetPendaftaranKPTerbaru extends CommonResponse {
  data: pendaftaran_kp | null;
}

export interface GetAllDataInstansi extends CommonResponse {
  data: GetAllDataInstansiRepository[];
}

export interface ServicePendaftaranKPMahasiswa extends CommonResponse {
  data: RepositoryPendaftaranKPMahasiswaInterface[];
}

export interface ServiceDetailPendaftaranKPMahasiswa extends CommonResponse {
  data: RepositoryDetailPendaftaranKPMahasiswa | null;
}

export interface ServiceDetailInstansi extends CommonResponse {
  data: instansi | null;
}

export interface ServiceTanggalDaftarKP extends CommonResponse {
  data: option | null;
}

export interface ServiceUpdateInstansiKP extends CommonResponse {
  data: instansi | null;
}

export interface ServiceLOGPendaftaranKPById extends CommonResponse {
  data: LOG[];
}

export interface PutMahasiswaParamsInterface {
  id: string;
  nip_pembimbing?: string | null;
  status?: "Gagal" | "Baru" | "Lanjut";
  kelas_kp: string;
  tujuan_surat_instansi: string;
  link_surat_penolakan_instansi: string;
  link_surat_pengantar: string;
  link_surat_balasan: string;
  link_surat_penunjukkan_dospem: string;
  link_surat_perpanjangan_kp: string;
  id_surat_pengajuan_dospem: string;
  status_link_surat_penolakan_instansi:
    | "Ditolak"
    | "Divalidasi"
    | "Terkirim"
    | null;
  status_link_surat_pengantar: "Ditolak" | "Divalidasi" | "Terkirim" | null;
  status_link_surat_balasan: "Ditolak" | "Divalidasi" | "Terkirim" | null;
  status_link_surat_penunjukkan_dospem:
    | "Ditolak"
    | "Divalidasi"
    | "Terkirim"
    | null;
  status_link_surat_perpanjangan_kp:
    | "Ditolak"
    | "Divalidasi"
    | "Terkirim"
    | null;
  status_id_surat_pengajuan_dospem:
    | "Ditolak"
    | "Divalidasi"
    | "Terkirim"
    | null;
  catatan_link_surat_penolakan_instansi: string;
  catatan_link_surat_pengantar: string;
  catatan_link_surat_balasan: string;
  catatan_link_surat_penunjukkan_dospem: string;
  catatan_link_surat_perpanjangan_kp: string;
  catatan_id_surat_pengajuan_dospem: string;
  catatan_penolakan: string;
  level_akses: number;
  judul_kp: string;
  alasan_lanjut_kp: string;
  id_instansi?: string | null;
  tanggal_mulai?: string | null;
  tanggal_selesai?: string | null;
}

export interface getTahunAjaranService extends CommonResponse {
  data: getTahunAjaran[];
}
