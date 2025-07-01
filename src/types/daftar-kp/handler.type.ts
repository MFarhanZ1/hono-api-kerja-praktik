export interface PutMahasiswaParamsInterface {
  id: string;
  status?: "Gagal" | "Baru" | "Lanjut";
  nip_pembimbing?: string | null;
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

export interface PutDataInstansiInterface {
  id: string;
  status: "Aktif" | "Pending" | "Tidak_Aktif";
  profil_singkat: string;
  nama: string;
  alamat: string;
  longitude: number;
  latitude: number;
  radius: number;
  jenis: "Pemerintahan" | "Swasta" | "UMKM" | "Pendidikan";
  nama_pj: string;
  no_hp_pj: string;
}

export interface PatchBerkasMahasiswaInterface {
  id: string;
  nomorBerkas: number;
  status: "Divalidasi" | "Ditolak";
  catatan?: string;
}
