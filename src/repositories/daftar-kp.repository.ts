import prisma from "../infrastructures/db.infrastructure";
import {
  RepositoryPendaftaranInstansiInterface,
  RepositoryPendaftaranKPMahasiswaInterface,
  RepositoryRiwayatPendaftaranKPInterface,
  RepositoryDetailPendaftaranKPMahasiswa,
  GetAllDataInstansiRepository,
  PutMahasiswaParamsInterface,
  dataLamaPutBerkasMahasiswa,
  getTahunAjaran,
  RepositoryUpdatePendaftaranKPInterface,
  RepositoryCreatePendaftaranKPInterface,
} from "../types/daftar-kp/repository.type";
import { APIError } from "../utils/api-error.util";
import {
  dokumen_pendaftaran_kp,
  instansi,
  jenis_instansi,
  log_pendaftaran_kp,
  option,
  pendaftaran_kp,
  status_instansi,
} from "../generated/prisma";
import {
  IsPendaftaranKPClosed,
  IsPendaftaranKPLanjutClosed,
} from "../validators/batas-waktu-pendaftaran..validator";
import { blackListInstansi } from "../validators/instansi-blacklist.validator";
import CryptoHelper from "../helpers/crypto.helper";
import transporter from "../infrastructures/mail.infrastructure";
import TahunAjaranHelper from "../helpers/tahun-ajaran.helper";

export default class DaftarKPRepository {
  public static async createPembimbingInstansi(
    id_instansi: string,
    dataInput: {
      nama: string;
      no_hp: string;
      email_pembimbing_instansi: string;
      jabatan: string;
    }
  ) {
    const verificationLink = `${
      process.env.PEMBIMBING_INSTANSI_URL
    }${CryptoHelper.generateEncryptedIDByPayload(
      JSON.stringify({
        email_pembimbing_instansi: dataInput.email_pembimbing_instansi,
      })
    )}`;
    await transporter.sendMail({
      from: `"Dashboard TIF UIN SUSKA" <cert.alisi@gmail.com>`,
      to: dataInput.email_pembimbing_instansi,
      subject: "Verification Code",
      html: `
        <html>
            <head>
                <style>
                    .email-container {
                        width: 100%;
                        padding: 20px;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        background-color: #f9f9f9;
                    }
                    .email-card {
                        width: 100%;
                        background-color: #fff;
                        padding: 20px;
                        border-radius: 10px;
                        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                        font-family: Arial, sans-serif;
                    }
                    .email-header {
                        font-size: 20px;
                        font-weight: bold;
                        margin-bottom: 20px;
                        text-align: center;
                    }
                    .email-body {
                        font-size: 16px;
                        line-height: 1.5;
                        margin-bottom: 30px;
                    }
                    .email-button {
                        display: inline-block;
                        padding: 10px 20px;
                        font-size: 16px;
                        color: #ffffff;
                        background-color: #4CAF50;
                        text-align: center;
                        text-decoration: none;
                        border-radius: 5px;
                        transition: background-color 0.3s ease;
                    }
                    .email-button:hover {
                        background-color: #298040;
                    }
                    .email-footer {
                        font-size: 14px;
                        color: #555;
                        text-align: center;
                        margin-top: 20px;
                    }
                </style>
            </head>
            <body>
                <div class="email-container">
                    <div class="email-card">
                        <div class="email-header">
                            📧 Link Pembimbing Instansi 📧
                        </div>

                        <div class="email-body">
                            <h4><i>Halo Sobat TIF UIN Suska Riau,</i><span> 😁😉</span></h4>
                            <p>Terima kasih sebelumnya telah menggunakan layanan Dashboard TIF. Silakan klik tombol di bawah ini ya untuk mereset password akun anda: 👇</p>
                            <p style="text-align: center;">
                                <a style="color: #ffffff; text-decoration: none" href="${verificationLink}" class="email-button">Login ke Dashboard TIF</a>
                            </p>
                            <p>Jika Anda tidak meminta email ini, abaikan saja. 😊</p>
                        </div>
                        <div class="email-footer">
                            Hormat kami,<br/>Tim Riau-DevOps, Aliansi Siber USR, & Inristek 2025
                        </div>
                    </div>
                </div>
            </body>
        </html>
        `,
    });

    return await prisma.pembimbing_instansi.create({
      data: {
        nama: dataInput.nama,
        email: dataInput.email_pembimbing_instansi,
        no_hp: dataInput.no_hp,
        jabatan: dataInput.jabatan,
        id_instansi,
      },
    });
  }

  public static async getPembimbingInstansi(id_instansi: string) {
    return await prisma.pembimbing_instansi.findMany({
      where: {
        id_instansi,
        status: "Aktif",
      },
    });
  }

  public static async postLOGPPencetakanSuratPengantar(id: string) {
    DaftarKPRepository.createLOGPendaftaranKPById(
      id,
      "Berkas surat pengantar telah dicetak oleh bagian umum",
      new Date(),
      999
    );
  }

  public static async getStatistikPendaftaran() {
    const pendaftarPerTahunAjaran = await prisma.pendaftaran_kp.groupBy({
      by: ["id_tahun_ajaran"],
      _count: true,
    });
    const allPendaftarKP = await prisma.pendaftaran_kp.findMany({
      where: {
        status: "Baru",
      },
    });
    const pendaftarPerAngkatan = {} as any;
    let initialYear = new Date().getFullYear() % 100;
    for (let i = initialYear; i > initialYear - 6; i--) {
      pendaftarPerAngkatan[`${i}`] = allPendaftarKP.filter(
        (item) => item.nim?.slice(1, 3) === `${i}`
      ).length;
    }

    return { pendaftarPerTahunAjaran, pendaftarPerAngkatan };
  }

  public static async getDataDosen() {
    return await prisma.dosen.findMany({});
  }

  public static async patchBerkasDaftarKP(
    dataKPTerbaru: pendaftaran_kp,
    data: string,
    nomorBerkas: number,
    tanggalMulai?: string,
    tanggalSelesai?: string,
    email_pembimbing_instansi?: string
  ) {
    let namaBerkas = "Surat Penolakan Instansi";
    let final_level_akses = dataKPTerbaru.level_akses;
    if (dataKPTerbaru.level_akses === 1 && nomorBerkas === 1) {
      namaBerkas = "Surat Pengantar Kerja Praktik";
      final_level_akses = 2;
    } else if (dataKPTerbaru.level_akses === 3 && nomorBerkas === 2) {
      namaBerkas = "Surat Balasan Kerja Praktik";
      final_level_akses = 4;
    } else if (dataKPTerbaru.level_akses === 5 && nomorBerkas === 3) {
      namaBerkas = "ID Pengajuan Dosen Pembimbing";
      final_level_akses = 6;
    } else if (dataKPTerbaru.level_akses === 7 && nomorBerkas === 4) {
      namaBerkas = "Surat Penunjukkan Dosen Pembimbing";
      final_level_akses = 8;
    } else if (dataKPTerbaru.level_akses === 9 && nomorBerkas === 5) {
      namaBerkas = "Surat Perpanjangan Kerja Praktik";
      final_level_akses = 10;
    }
    await prisma.pendaftaran_kp.update({
      where: {
        id: dataKPTerbaru.id,
      },
      data: {
        email_pembimbing_instansi,
        tanggal_mulai:
          (nomorBerkas === 2 && tanggalMulai) || dataKPTerbaru.tanggal_mulai,
        tanggal_selesai:
          (nomorBerkas === 2 && tanggalSelesai) ||
          dataKPTerbaru.tanggal_selesai,
        catatan_penolakan: null,
        level_akses: final_level_akses,
        dokumen_pendaftaran_kp: {
          update: {
            where: {
              idKriteria_idPendaftaranKP: {
                idKriteria: nomorBerkas,
                idPendaftaranKP: dataKPTerbaru.id,
              },
            },
            data: {
              data,
              status: "Terkirim",
            },
          },
        },
      },
    });

    await DaftarKPRepository.createLOGPendaftaranKPById(
      dataKPTerbaru.id,
      `[SUKSES] Berhasil mengajukan berkas ${namaBerkas} dengan link : ${
        data || ""
      }`,
      new Date(),
      1
    );
  }

  public static async updatePermohonanPendaftaranKP({
    dataKPMahasiswa,
    nim,
    idInstansi,
    tujuanSuratInstansi,
    tanggalMulai,
    judul_kp,
    kelas_kp,
  }: RepositoryUpdatePendaftaranKPInterface): Promise<void> {
    if (dataKPMahasiswa.level_akses === 0) {
      await prisma.pendaftaran_kp.update({
        where: {
          id: dataKPMahasiswa.id,
        },
        data: {
          nim,
          tanggal_pengajuan: new Date(),
          tanggal_mulai: tanggalMulai,
          id_instansi: idInstansi,
          tujuan_surat_instansi: tujuanSuratInstansi,
          id_tahun_ajaran: TahunAjaranHelper.findSekarang(),
          judul_kp,
          level_akses: 1,
          kelas_kp,
        },
      });

      await DaftarKPRepository.createLOGPendaftaranKPById(
        dataKPMahasiswa.id,
        `[SUKSES] Berhasil mengubah instansi kerja praktik dengan ID Instansi ${
          idInstansi || ""
        }`,
        new Date(),
        1
      );
    } else if (dataKPMahasiswa.level_akses > 0) {
      await prisma.pendaftaran_kp.update({
        where: {
          id: dataKPMahasiswa.id,
        },
        data: {
          judul_kp,
          kelas_kp,
        },
      });

      await DaftarKPRepository.createLOGPendaftaranKPById(
        dataKPMahasiswa.id,
        `[SUKSES] Berhasil mengubah data kerja praktik`,
        new Date(),
        1
      );
    }
  }

  public static async patchTanggalDaftarKP(
    tanggalMulaiDaftarKP: string,
    tanggalTerakhirDaftarKP: string,
    type: "Regular" | "Lanjut"
  ) {
    if (type === "Regular") {
      const tanggalKP = await prisma.option.findUnique({
        where: {
          id: 999,
        },
      });

      if (!tanggalKP) {
        await prisma.option.create({
          data: {
            id: 999,
            tanggal_mulai_pendaftaran_kp: tanggalMulaiDaftarKP,
            tanggal_akhir_pendaftaran_kp: tanggalTerakhirDaftarKP,
          },
        });
      }

      await prisma.option.update({
        where: {
          id: 999,
        },
        data: {
          tanggal_mulai_pendaftaran_kp: tanggalMulaiDaftarKP,
          tanggal_akhir_pendaftaran_kp: tanggalTerakhirDaftarKP,
        },
      });

      // TIMEOUT UNTUK 6 BULAN
      // step 1-8 tidak langsung gagal
      // ASUMSI TANGGAL PENDAFTARAN 5 BULAN

      const recurse = (time: number) => {
        if (time > 2147483640) {
          setTimeout(function () {
            recurse(time - 2147483640);
          }, 2147483640);
        } else {
          const pointer = setTimeout(async function () {
            // kalau tanggal pendaftaran diubah 10 kali, berarti ada 10 fungsi yang berjalan [1]
            const tanggalDaftarKP =
              await DaftarKPRepository.getTanggalDaftarKP();
            if (
              tanggalDaftarKP &&
              tanggalDaftarKP.tanggal_akhir_pendaftaran_kp
            ) {
              const checkTime =
                tanggalDaftarKP.tanggal_akhir_pendaftaran_kp.getTime() -
                new Date().getTime();
              if (checkTime >= 0) {
                clearTimeout(pointer); // solusi masalah [1] ?
                // recurse(checkTime);
              } else {
                const manyDataKP =
                  await prisma.pendaftaran_kp.updateManyAndReturn({
                    where: {
                      status: "Baru",
                    },
                    data: {
                      status: "Gagal",
                    },
                  });
                for await (const dataKP of manyDataKP) {
                  await DaftarKPRepository.createLOGPendaftaranKPById(
                    dataKP.id,
                    "Pendaftaran kerja praktik gagal karena sudah melewati batas waktu",
                    new Date(),
                    2
                  );
                }
              }
            }
          }, time);
        }
      };

      const recurseByDay = (time: number) => {
        if (time > 86400000) {
          setTimeout(function () {
            recurse(time - 86400000);
          }, 86400000);
        } else {
          const pointer = setTimeout(async function () {
            // kalau tanggal pendaftaran diubah 10 kali, berarti ada 10 fungsi yang berjalan [1]
            const tanggalDaftarKP =
              await DaftarKPRepository.getTanggalDaftarKP();
            if (
              tanggalDaftarKP &&
              tanggalDaftarKP.tanggal_mulai_pendaftaran_kp
            ) {
              const checkTime =
                tanggalDaftarKP.tanggal_mulai_pendaftaran_kp.getTime() -
                new Date().getTime();
              if (checkTime > 0) {
                clearTimeout(pointer); // solusi masalah [1] ?
                // recurse(checkTime);
              } else {
                const tenggatWaktu =
                  new Date(tanggalTerakhirDaftarKP).getTime() + 15778800000;

                recurse(tenggatWaktu);
              }
            }
          }, time);
        }
      };

      const tanggalSaatIni = new Date().getTime();
      const tanggalMulai = new Date(tanggalMulaiDaftarKP).getTime();

      recurseByDay(tanggalMulai - tanggalSaatIni);
    } else if (type === "Lanjut") {
      const tanggalKP = await prisma.option.findUnique({
        where: {
          id: 999,
        },
      });

      if (!tanggalKP) {
        await prisma.option.create({
          data: {
            id: 999,
            tanggal_mulai_pendaftaran_kp_lanjut: tanggalMulaiDaftarKP,
            tanggal_akhir_pendaftaran_kp_lanjut: tanggalTerakhirDaftarKP,
          },
        });
      }

      await prisma.option.update({
        where: {
          id: 999,
        },
        data: {
          tanggal_mulai_pendaftaran_kp_lanjut: tanggalMulaiDaftarKP,
          tanggal_akhir_pendaftaran_kp_lanjut: tanggalTerakhirDaftarKP,
        },
      });

      // TIMEOUT UNTUK 6 BULAN

      // ASUMSI TANGGAL PENDAFTARAN 5 BULAN

      const recurse = (time: number) => {
        if (time > 2147483640) {
          setTimeout(function () {
            recurse(time - 2147483640);
          }, 2147483640);
        } else {
          setTimeout(async function () {
            const tanggalDaftarKP =
              await DaftarKPRepository.getTanggalDaftarKP();
            if (
              tanggalDaftarKP &&
              tanggalDaftarKP.tanggal_akhir_pendaftaran_kp_lanjut
            ) {
              const checkTime =
                tanggalDaftarKP.tanggal_akhir_pendaftaran_kp_lanjut.getTime() -
                new Date().getTime();
              if (checkTime >= 0) {
                recurse(checkTime);
              } else {
                const manyDataKP =
                  await prisma.pendaftaran_kp.updateManyAndReturn({
                    where: {
                      status: "Lanjut",
                    },
                    data: {
                      status: "Gagal",
                    },
                  });
                for await (const dataKP of manyDataKP) {
                  await DaftarKPRepository.createLOGPendaftaranKPById(
                    dataKP.id,
                    "[Gagal] Pendaftaran kerja praktik gagal karena sudah melewati batas waktu",
                    new Date(),
                    2
                  );
                }
              }
            }
          }, time);
        }
      };

      const recurseByDay = (time: number) => {
        if (time > 86400000) {
          setTimeout(function () {
            recurse(time - 86400000);
          }, 86400000);
        } else {
          const pointer = setTimeout(async function () {
            // kalau tanggal pendaftaran diubah 10 kali, berarti ada 10 fungsi yang berjalan [1]
            const tanggalDaftarKP =
              await DaftarKPRepository.getTanggalDaftarKP();
            if (
              tanggalDaftarKP &&
              tanggalDaftarKP.tanggal_mulai_pendaftaran_kp_lanjut
            ) {
              const checkTime =
                tanggalDaftarKP.tanggal_mulai_pendaftaran_kp_lanjut.getTime() -
                new Date().getTime();
              if (checkTime > 0) {
                clearTimeout(pointer); // solusi masalah [1] ?
                // recurse(checkTime);
              } else {
                const tenggatWaktu =
                  new Date(tanggalTerakhirDaftarKP).getTime() + 15778800000;

                recurse(tenggatWaktu);
              }
            }
          }, time);
        }
      };

      const tanggalSaatIni = new Date().getTime();
      const tanggalMulai = new Date(tanggalMulaiDaftarKP).getTime();

      recurseByDay(tanggalMulai - tanggalSaatIni);
    }
  }

  public static async getTanggalDaftarKP(): Promise<option | null> {
    return await prisma.option.findUnique({
      where: {
        id: 999,
      },
    });
  }

  public static async getDataDetailInstansi(
    idInstansi: string
  ): Promise<instansi | null> {
    return await prisma.instansi.findUnique({
      where: {
        id: idInstansi,
      },
    });
  }

  public static async getDataKPDetailMahasiswa(
    data: pendaftaran_kp
  ): Promise<RepositoryDetailPendaftaranKPMahasiswa | null> {
    return await prisma.pendaftaran_kp.findUnique({
      where: {
        id: data.id,
      },
      include: {
        dokumen_pendaftaran_kp: {
          orderBy: {
            idKriteria: "asc",
          },
        },
        mahasiswa: true,
        dosen_pembimbing: true,
        instansi: {
          include: {
            pembimbing_instansi: {
              where: {
                email: data.email_pembimbing_instansi || "",
              },
            },
          },
        },
      },
    });
  }

  public static async getDataKPMahasiswaBagianUmum(): Promise<
    RepositoryPendaftaranKPMahasiswaInterface[]
  > {
    return await prisma.pendaftaran_kp.findMany({
      where: {
        log_pendaftaran_kp: {
          none: {
            status: 999,
          },
        },
      },
      include: {
        mahasiswa: true,
        instansi: true,
      },
    });
  }

  public static async getDataKPMahasiswa(): Promise<
    RepositoryPendaftaranKPMahasiswaInterface[]
  > {
    return await prisma.pendaftaran_kp.findMany({
      select: {
        id: true,
        tanggal_mulai: true,
        status: true,
        id_tahun_ajaran: true,
        level_akses: true,
        mahasiswa: {
          select: {
            nama: true,
            nim: true,
          },
        },
      },
    });
  }

  public static async getLOGByIdPendaftaranKP(
    idKP: string
  ): Promise<log_pendaftaran_kp[]> {
    return await prisma.log_pendaftaran_kp.findMany({
      where: {
        pendaftaran_kp_id: idKP,
      },
    });
  }

  public static async createLOGPendaftaranKPById(
    idKP: string,
    message: string,
    tanggal: Date,
    status: number
  ) {
    return await prisma.log_pendaftaran_kp.create({
      data: {
        pendaftaran_kp_id: idKP,
        message,
        tanggal,
        status,
      },
    });
  }

  public static async patchBerkasMahasiswa(
    dataKP: pendaftaran_kp & {
      dokumen_pendaftaran_kp: dokumen_pendaftaran_kp[];
    },
    nomorBerkas: number,
    status: "Divalidasi" | "Ditolak",
    catatan?: string,
    nipDospem?: string
  ) {
    if (status === "Divalidasi") {
      if (dataKP.dokumen_pendaftaran_kp[0].status === "Terkirim") {
        const dataLOG = await prisma.log_pendaftaran_kp.findFirst({
          where: {
            pendaftaran_kp_id: dataKP.id,
            status: 999,
          },
        });
        if (dataLOG) {
          await prisma.log_pendaftaran_kp.update({
            where: {
              id: dataLOG.id,
            },
            data: {
              status: 1,
            },
          });
        }
        await prisma.pendaftaran_kp.update({
          where: {
            id: dataKP.id,
          },
          data: {
            level_akses: 0,
            nip_pembimbing: nomorBerkas === 4 ? nipDospem : "",
            dokumen_pendaftaran_kp: {
              update: [
                {
                  where: {
                    idKriteria_idPendaftaranKP: {
                      idKriteria: 0,
                      idPendaftaranKP: dataKP.id,
                    },
                  },
                  data: {
                    status: "Divalidasi",
                    catatan,
                  },
                },
                {
                  where: {
                    idKriteria_idPendaftaranKP: {
                      idKriteria: 1,
                      idPendaftaranKP: dataKP.id,
                    },
                  },
                  data: {
                    data: undefined,
                    status: null,
                    catatan: null,
                  },
                },
                {
                  where: {
                    idKriteria_idPendaftaranKP: {
                      idKriteria: 2,
                      idPendaftaranKP: dataKP.id,
                    },
                  },
                  data: {
                    data: undefined,
                    status: null,
                    catatan: null,
                  },
                },
                {
                  where: {
                    idKriteria_idPendaftaranKP: {
                      idKriteria: 3,
                      idPendaftaranKP: dataKP.id,
                    },
                  },
                  data: {
                    data: undefined,
                    status: null,
                    catatan: null,
                  },
                },
                {
                  where: {
                    idKriteria_idPendaftaranKP: {
                      idKriteria: 4,
                      idPendaftaranKP: dataKP.id,
                    },
                  },
                  data: {
                    data: undefined,
                    status: null,
                    catatan: null,
                  },
                },
                {
                  where: {
                    idKriteria_idPendaftaranKP: {
                      idKriteria: 5,
                      idPendaftaranKP: dataKP.id,
                    },
                  },
                  data: {
                    data: undefined,
                    status: null,
                    catatan: null,
                  },
                },
              ],
            },
          },
        });
        return;
      }

      let namaBerkas = "Surat Penolakan Instansi";
      let final_level_akses = dataKP.level_akses;
      if (dataKP.level_akses / 2 === 1 && nomorBerkas === 1) {
        namaBerkas = "Surat Pengantar Kerja Praktik";
        final_level_akses = final_level_akses + 1;
        if (dataKP.dokumen_pendaftaran_kp[2].status === "Divalidasi") {
          final_level_akses = 5;
        } else if (dataKP.dokumen_pendaftaran_kp[2].status === "Terkirim") {
          final_level_akses = 4;
        }
        if (dataKP.dokumen_pendaftaran_kp[3].status === "Divalidasi") {
          final_level_akses = 7;
        } else if (dataKP.dokumen_pendaftaran_kp[3].status === "Terkirim") {
          final_level_akses = 6;
        }

        if (dataKP.dokumen_pendaftaran_kp[4].status === "Divalidasi") {
          final_level_akses = 9;
        } else if (dataKP.dokumen_pendaftaran_kp[4].status === "Terkirim") {
          final_level_akses = 8;
        }

        if (dataKP.dokumen_pendaftaran_kp[5].status === "Divalidasi") {
          final_level_akses = 11;
        } else if (dataKP.dokumen_pendaftaran_kp[5].status === "Terkirim") {
          final_level_akses = 10;
        }
      } else if (dataKP.level_akses / 2 === 2 && nomorBerkas === 2) {
        namaBerkas = "Surat Balasan Kerja Praktik";
        final_level_akses = final_level_akses + 1;
        if (dataKP.dokumen_pendaftaran_kp[3].status === "Divalidasi") {
          final_level_akses = 7;
        } else if (dataKP.dokumen_pendaftaran_kp[3].status === "Terkirim") {
          final_level_akses = 6;
        }

        if (dataKP.dokumen_pendaftaran_kp[4].status === "Divalidasi") {
          final_level_akses = 9;
        } else if (dataKP.dokumen_pendaftaran_kp[4].status === "Terkirim") {
          final_level_akses = 8;
        }

        if (dataKP.dokumen_pendaftaran_kp[5].status === "Divalidasi") {
          final_level_akses = 11;
        } else if (dataKP.dokumen_pendaftaran_kp[5].status === "Terkirim") {
          final_level_akses = 10;
        }
      } else if (dataKP.level_akses / 2 === 3 && nomorBerkas === 3) {
        namaBerkas = "ID Pengajuan Dosen Pembimbing";
        final_level_akses = final_level_akses + 1;
        if (dataKP.dokumen_pendaftaran_kp[4].status === "Divalidasi") {
          final_level_akses = 9;
        } else if (dataKP.dokumen_pendaftaran_kp[4].status === "Terkirim") {
          final_level_akses = 8;
        }

        if (dataKP.dokumen_pendaftaran_kp[5].status === "Divalidasi") {
          final_level_akses = 11;
        } else if (dataKP.dokumen_pendaftaran_kp[5].status === "Terkirim") {
          final_level_akses = 10;
        }
      } else if (dataKP.level_akses / 2 === 4 && nomorBerkas === 4) {
        namaBerkas = "Surat Penunjukkan Dosen Pembimbing";
        final_level_akses = final_level_akses + 1;
        if (dataKP.dokumen_pendaftaran_kp[5].status === "Divalidasi") {
          final_level_akses = 11;
        } else if (dataKP.dokumen_pendaftaran_kp[5].status === "Terkirim") {
          final_level_akses = 10;
        }
      } else if (dataKP.level_akses / 2 === 5 && nomorBerkas === 5) {
        namaBerkas = "Surat Perpanjangan Kerja Praktik";
        final_level_akses = final_level_akses + 1;
      }

      await prisma.pendaftaran_kp.update({
        where: {
          id: dataKP.id,
        },
        data: {
          nip_pembimbing: nipDospem,
          dokumen_pendaftaran_kp: {
            update: {
              where: {
                idKriteria_idPendaftaranKP: {
                  idKriteria: nomorBerkas,
                  idPendaftaranKP: dataKP.id,
                },
              },
              data: {
                status: "Divalidasi",
                catatan,
              },
            },
          },
          level_akses:
            dataKP.level_akses % 2 === 0
              ? final_level_akses
              : dataKP.level_akses,
        },
      });

      await DaftarKPRepository.createLOGPendaftaranKPById(
        dataKP.id,
        `[SUKSES] ${namaBerkas} dengan link ${dataKP.dokumen_pendaftaran_kp[nomorBerkas].data} mahasiswa telah divalidasi oleh Koordinator Kerja Praktik`,
        new Date(),
        1
      );
    } else if (status === "Ditolak") {
      let final_level_akses = dataKP.level_akses;
      if (dataKP.level_akses / 2 === 1 && nomorBerkas === 1) {
        final_level_akses = final_level_akses - 1;
      } else if (dataKP.level_akses / 2 === 2 && nomorBerkas === 2) {
        final_level_akses = final_level_akses - 1;
      } else if (dataKP.level_akses / 2 === 3 && nomorBerkas === 3) {
        final_level_akses = final_level_akses - 1;
      } else if (dataKP.level_akses / 2 === 4 && nomorBerkas === 4) {
        final_level_akses = final_level_akses - 1;
      } else if (dataKP.level_akses / 2 === 5 && nomorBerkas === 5) {
        final_level_akses = final_level_akses - 1;
      }
      const isClosed = await IsPendaftaranKPClosed();
      const isPendaftaranKPLanjutClosed = await IsPendaftaranKPLanjutClosed();
      if (isClosed) {
        await prisma.pendaftaran_kp.update({
          where: {
            id: dataKP.id,
          },
          data: {
            nip_pembimbing:
              nomorBerkas === 4 ? undefined : dataKP.nip_pembimbing,
            dokumen_pendaftaran_kp: {
              update: {
                where: {
                  idKriteria_idPendaftaranKP: {
                    idKriteria:
                      dataKP.dokumen_pendaftaran_kp[0].status === "Terkirim"
                        ? 0
                        : nomorBerkas,
                    idPendaftaranKP: dataKP.id,
                  },
                },
                data: {
                  catatan: catatan || "Link mungkin tidak valid",
                  status: "Ditolak",
                },
              },
            },
            status: "Gagal",
            level_akses: final_level_akses,
            catatan_penolakan: catatan,
          },
        });
      } else if (
        dataKP.level_akses / 2 === 5 &&
        nomorBerkas === 5 &&
        isPendaftaranKPLanjutClosed
      ) {
        await prisma.pendaftaran_kp.update({
          where: {
            id: dataKP.id,
          },
          data: {
            dokumen_pendaftaran_kp: {
              update: {
                where: {
                  idKriteria_idPendaftaranKP: {
                    idKriteria: 5,
                    idPendaftaranKP: dataKP.id,
                  },
                },
                data: {
                  catatan: catatan || "Link mungkin tidak valid",
                  status: "Ditolak",
                },
              },
            },
            status: "Gagal",
            level_akses: final_level_akses,
            catatan_penolakan: catatan,
          },
        });
      } else {
        await prisma.pendaftaran_kp.update({
          where: {
            id: dataKP.id,
          },
          data: {
            dokumen_pendaftaran_kp: {
              update: {
                where: {
                  idKriteria_idPendaftaranKP: {
                    idKriteria:
                      dataKP.dokumen_pendaftaran_kp[0].status === "Terkirim"
                        ? 0
                        : nomorBerkas,
                    idPendaftaranKP: dataKP.id,
                  },
                },
                data: {
                  catatan: catatan || "Link mungkin tidak valid",
                  status: "Ditolak",
                },
              },
            },
            level_akses: final_level_akses,
            catatan_penolakan: catatan,
          },
        });
      }

      await DaftarKPRepository.createLOGPendaftaranKPById(
        dataKP.id,
        `[BERKAS DITOLAK] Berkas dengan link ${dataKP.dokumen_pendaftaran_kp[nomorBerkas].data} mahasiswa ditolak. ${catatan}`,
        new Date(),
        2
      );

      if (isClosed) {
        await DaftarKPRepository.createLOGPendaftaranKPById(
          dataKP.id,
          "[GAGAL] Pendaftaran kerja praktik gagal karena sudah melewati batas waktu",
          new Date(),
          2
        );
      }
    }
  }

  public static async deleteDataInstansi(id: string): Promise<void> {
    // [Note] delete instansi akan menghapus semua row pendaftaran kp yang terkait dengan idnya

    await prisma.instansi.delete({
      where: {
        id,
      },
    });
  }

  public static async patchDataInstansi(
    id: string,
    status?: string
  ): Promise<instansi> {
    const data = await prisma.instansi.findUnique({
      where: {
        id,
      },
    });

    if (!data) {
      throw new APIError("Data instansi tidak ditemukan", 404);
    }

    if (
      status &&
      status !== "Aktif" &&
      status !== "Pending" &&
      status !== "Tidak_Aktif"
    ) {
      throw new APIError("Harus memasukkan status yang valid");
    }

    const result = await prisma.instansi.update({
      where: {
        id,
      },
      data: {
        status: (status === "" || status === undefined || status === null
          ? data.status
          : status) as "Aktif" | "Pending" | "Tidak_Aktif",
      },
    });

    return result;
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
  }): Promise<void> {
    await prisma.instansi.create({
      data: {
        longitude,
        latitude,
        radius,
        status: status as status_instansi,
        profil_singkat,
        nama,
        alamat,
        jenis: jenis as jenis_instansi,
        nama_pj,
        no_hp_pj,
      },
    });
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
  ): Promise<instansi> {
    const data = await prisma.instansi.findUnique({
      where: {
        id,
      },
    });

    if (!data) {
      throw new APIError("Data instansi tidak ditemukan", 404);
    }

    if (
      status &&
      status !== "Aktif" &&
      status !== "Pending" &&
      status !== "Tidak_Aktif"
    ) {
      throw new APIError("Harus memasukkan status yang valid");
    } else if (
      jenis &&
      jenis !== "Pendidikan" &&
      jenis !== "UMKM" &&
      jenis !== "Swasta" &&
      jenis !== "Pemerintahan"
    ) {
      throw new APIError("Harus memasukkan jenis instansi yang valid");
    }

    const result = await prisma.instansi.update({
      where: {
        id,
      },
      data: {
        status: (status === "" || status === undefined || status === null
          ? data.status
          : status) as "Aktif" | "Pending" | "Tidak_Aktif",
        profil_singkat:
          profil_singkat === "" ||
          profil_singkat === undefined ||
          profil_singkat === null
            ? data.profil_singkat
            : profil_singkat,
        longitude:
          longitude === undefined || longitude === null
            ? data.longitude
            : longitude,
        latitude:
          latitude === undefined || latitude === null
            ? data.latitude
            : latitude,
        radius: radius === undefined || radius === null ? data.radius : radius,
        nama:
          nama === "" || nama === undefined || nama === null ? data.nama : nama,
        alamat:
          alamat === "" || alamat === undefined || alamat === null
            ? data.alamat
            : alamat,
        jenis:
          jenis === "" || jenis === undefined || jenis === null
            ? data.jenis
            : (jenis as "UMKM" | "Pemerintahan" | "Pendidikan" | "Swasta"),
        nama_pj:
          nama_pj === "" || nama_pj === undefined || nama_pj === null
            ? data.nama_pj
            : nama_pj,
        no_hp_pj:
          no_hp_pj === "" || no_hp_pj === undefined || no_hp_pj === null
            ? data.no_hp_pj
            : no_hp_pj,
      },
    });

    return result;
  }

  public static async findInstansiById(id: string): Promise<instansi | null> {
    return await prisma.instansi.findUnique({
      where: {
        id,
      },
    });
  }

  public static async getAllDataInstansi(): Promise<
    GetAllDataInstansiRepository[]
  > {
    const data = await prisma.instansi.findMany({
      select: {
        id: true,
        nama: true,
        jenis: true,
        status: true,
      },
    });

    return data;
  }

  public static async getKPTerbaruMahasiswa(
    nim: string
  ): Promise<pendaftaran_kp | null> {
    const data = await prisma.pendaftaran_kp.findFirst({
      where: {
        nim,
        OR: [{ status: "Baru" }, { status: "Lanjut" }],
      },
      include: {
        dokumen_pendaftaran_kp: {
          orderBy: {
            idKriteria: "asc",
          },
        },
        mahasiswa: true,
        dosen_pembimbing: true,
        instansi: {
          include: {
            pembimbing_instansi: true,
          },
        },
      },
    });

    return data;
  }

  public static async getTahunAjaran() {
    const list_kode_tahun_ajaran = await prisma.pendaftaran_kp.findMany({
      select: {
        id_tahun_ajaran: true,
      },
      orderBy: {
        id_tahun_ajaran: "desc",
      },
      distinct: ["id_tahun_ajaran"],
    });

    return list_kode_tahun_ajaran.map((item) => ({
      kode: item.id_tahun_ajaran,
      nama: TahunAjaranHelper.parseStringNameByCode(item.id_tahun_ajaran),
    }));
  }

  public static async createPermohonanKP({
    nim,
    idInstansi,
    tujuanSuratInstansi,
    tanggalMulai,
    judul_kp,
    kelas_kp,
  }: RepositoryCreatePendaftaranKPInterface): Promise<void> {
    const data = await prisma.pendaftaran_kp.create({
      data: {
        nim,
        tanggal_pengajuan: new Date(),
        tanggal_mulai: tanggalMulai,
        id_instansi: idInstansi,
        tujuan_surat_instansi: tujuanSuratInstansi,
        id_tahun_ajaran: TahunAjaranHelper.findSekarang(),
        judul_kp,
        level_akses: 1,
        kelas_kp,
        dokumen_pendaftaran_kp: {
          createMany: {
            data: [
              { idKriteria: 0 },
              { idKriteria: 1 },
              { idKriteria: 2 },
              { idKriteria: 3 },
              { idKriteria: 4 },
              { idKriteria: 5 },
            ],
          },
        },
      },
    });

    await DaftarKPRepository.createLOGPendaftaranKPById(
      data.id,
      "[SUKSES] Berhasil melakukan Pendaftaran Kerja praktik",
      new Date(),
      1
    );
  }

  public static async createPermohonanInstansi({
    namaInstansi,
    alamatInstansi,
    namaPenanggungJawabInstansi,
    telpPenanggungJawabInstansi,
    jenisInstansi,
    longitude,
    latitude,
    radius,
    profilSingkat,
  }: RepositoryPendaftaranInstansiInterface): Promise<void> {
    await prisma.instansi.create({
      data: {
        nama: namaInstansi,
        alamat: alamatInstansi,
        longitude,
        latitude,
        radius,
        jenis: jenisInstansi,
        profil_singkat: profilSingkat,
        nama_pj: namaPenanggungJawabInstansi,
        no_hp_pj: telpPenanggungJawabInstansi,
      },
    });
  }

  public static async getRiwayatPendaftaranKP(
    nim: string
  ): Promise<RepositoryRiwayatPendaftaranKPInterface[] | null> {
    const data = await prisma.pendaftaran_kp.findMany({
      where: {
        nim,
      },
      select: {
        id: true,
        status: true,
        tanggal_mulai: true,
        level_akses: true,
        instansi: {
          select: {
            nama: true,
          },
        },
      },
    });

    return data;
  }

  public static async getDataInstansi(nim: string) {
    const blacklist = await blackListInstansi(nim);

    const data = await prisma.instansi.findMany({
      where: {
        status: "Aktif",
        AND: {
          id: {
            notIn: blacklist,
          },
        },
      },
    });

    return data;
  }

  // sementara pake surat + link dulu

  public static async getPendaftaranKPById(
    id: string
  ): Promise<
    | (pendaftaran_kp & { dokumen_pendaftaran_kp: dokumen_pendaftaran_kp[] })
    | null
  > {
    const dataKP = await prisma.pendaftaran_kp.findUnique({
      where: {
        id,
      },
      include: {
        dokumen_pendaftaran_kp: {
          orderBy: {
            idKriteria: "asc",
          },
        },
      },
    });

    return dataKP;
  }

  public static async putBerkasMahasiswa(
    dataBaru: PutMahasiswaParamsInterface,
    dataLama: dataLamaPutBerkasMahasiswa
  ) {
    if (
      (dataLama.dokumen_pendaftaran_kp[0].status !== "Divalidasi" &&
        dataBaru.status_link_surat_penolakan_instansi === "Divalidasi") ||
      (dataLama.level_akses !== 0 && dataBaru.level_akses === 0)
    ) {
      await prisma.pendaftaran_kp.update({
        where: {
          id: dataLama.id,
        },
        data: {
          status: dataBaru.status || dataLama.status,
          level_akses: 0,
          dokumen_pendaftaran_kp: {
            update: [
              {
                where: {
                  idKriteria_idPendaftaranKP: {
                    idKriteria: 0,
                    idPendaftaranKP: dataLama.id,
                  },
                },
                data: {
                  status:
                    dataBaru.status_link_surat_penolakan_instansi ===
                    "Divalidasi"
                      ? "Divalidasi"
                      : null,
                  catatan: dataBaru.catatan_link_surat_penolakan_instansi,
                },
              },
              {
                where: {
                  idKriteria_idPendaftaranKP: {
                    idKriteria: 1,
                    idPendaftaranKP: dataLama.id,
                  },
                },
                data: {
                  data: undefined,
                  status: null,
                  catatan: null,
                },
              },
              {
                where: {
                  idKriteria_idPendaftaranKP: {
                    idKriteria: 2,
                    idPendaftaranKP: dataLama.id,
                  },
                },
                data: {
                  data: undefined,
                  status: null,
                  catatan: null,
                },
              },
              {
                where: {
                  idKriteria_idPendaftaranKP: {
                    idKriteria: 3,
                    idPendaftaranKP: dataLama.id,
                  },
                },
                data: {
                  data: undefined,
                  status: null,
                  catatan: null,
                },
              },
              {
                where: {
                  idKriteria_idPendaftaranKP: {
                    idKriteria: 4,
                    idPendaftaranKP: dataLama.id,
                  },
                },
                data: {
                  data: undefined,
                  status: null,
                  catatan: null,
                },
              },
              {
                where: {
                  idKriteria_idPendaftaranKP: {
                    idKriteria: 5,
                    idPendaftaranKP: dataLama.id,
                  },
                },
                data: {
                  data: undefined,
                  status: null,
                  catatan: null,
                },
              },
            ],
          },
        },
      });
      return;
    }
    if (dataLama.level_akses % 2 === 0) {
      let final_level_akses = dataLama.level_akses;
      if (dataLama.level_akses === 0) final_level_akses = dataBaru.level_akses;
      if (dataLama.level_akses / 2 === 1) {
        final_level_akses = final_level_akses + 1;
        if (dataBaru.status_link_surat_balasan === "Divalidasi") {
          final_level_akses = 5;
        } else if (dataBaru.status_link_surat_balasan === "Terkirim") {
          final_level_akses = 4;
        }
        if (dataBaru.status_id_surat_pengajuan_dospem === "Divalidasi") {
          final_level_akses = 7;
        } else if (dataBaru.status_id_surat_pengajuan_dospem === "Terkirim") {
          final_level_akses = 6;
        }

        if (dataBaru.status_link_surat_penunjukkan_dospem === "Divalidasi") {
          final_level_akses = 9;
        } else if (
          dataBaru.status_link_surat_penunjukkan_dospem === "Terkirim"
        ) {
          final_level_akses = 8;
        }

        if (dataBaru.status_link_surat_perpanjangan_kp === "Divalidasi") {
          final_level_akses = 11;
        } else if (dataBaru.status_link_surat_perpanjangan_kp === "Terkirim") {
          final_level_akses = 10;
        }
      } else if (dataLama.level_akses / 2 === 2) {
        final_level_akses = final_level_akses + 1;
        if (dataBaru.status_id_surat_pengajuan_dospem === "Divalidasi") {
          final_level_akses = 7;
        } else if (dataBaru.status_id_surat_pengajuan_dospem === "Terkirim") {
          final_level_akses = 6;
        }

        if (dataBaru.status_link_surat_penunjukkan_dospem === "Divalidasi") {
          final_level_akses = 9;
        } else if (
          dataBaru.status_link_surat_penunjukkan_dospem === "Terkirim"
        ) {
          final_level_akses = 8;
        }

        if (dataBaru.status_link_surat_perpanjangan_kp === "Divalidasi") {
          final_level_akses = 11;
        } else if (dataBaru.status_link_surat_perpanjangan_kp === "Terkirim") {
          final_level_akses = 10;
        }
      } else if (dataLama.level_akses / 2 === 3) {
        final_level_akses = final_level_akses + 1;
        if (dataBaru.status_link_surat_penunjukkan_dospem === "Divalidasi") {
          final_level_akses = 9;
        } else if (
          dataBaru.status_link_surat_penunjukkan_dospem === "Terkirim"
        ) {
          final_level_akses = 8;
        }

        if (dataBaru.status_link_surat_perpanjangan_kp === "Divalidasi") {
          final_level_akses = 11;
        } else if (dataBaru.status_link_surat_perpanjangan_kp === "Terkirim") {
          final_level_akses = 10;
        }
      } else if (dataLama.level_akses / 2 === 4) {
        final_level_akses = final_level_akses + 1;
        if (dataBaru.status_link_surat_perpanjangan_kp === "Divalidasi") {
          final_level_akses = 11;
        } else if (dataBaru.status_link_surat_perpanjangan_kp === "Terkirim") {
          final_level_akses = 10;
        }
      } else if (dataLama.level_akses / 2 === 5) {
        final_level_akses = final_level_akses + 1;
      }
      await prisma.pendaftaran_kp.update({
        where: {
          id: dataLama.id,
        },
        data: {
          nip_pembimbing: dataBaru.nip_pembimbing || dataLama.nip_pembimbing,
          tanggal_mulai: dataBaru.tanggal_mulai
            ? dataBaru.tanggal_mulai
            : dataLama.level_akses === 8 &&
              dataBaru.status_link_surat_penunjukkan_dospem === "Divalidasi" &&
              new Date().getTime() > new Date(dataLama.tanggal_mulai).getTime()
            ? new Date()
            : dataLama.tanggal_mulai,
          tanggal_selesai: dataBaru.tanggal_selesai || dataLama.tanggal_selesai,
          status:
            final_level_akses === 11 || dataBaru.level_akses === 11
              ? "Lanjut"
              : dataBaru.status || dataLama.status,
          alasan_lanjut_kp:
            dataBaru.alasan_lanjut_kp || dataLama.alasan_lanjut_kp,
          id_instansi: dataBaru.id_instansi || dataLama.id_instansi,
          tujuan_surat_instansi:
            dataBaru.tujuan_surat_instansi || dataLama.tujuan_surat_instansi,
          judul_kp: dataBaru.judul_kp || dataLama.judul_kp,
          kelas_kp: dataBaru.kelas_kp || dataLama.kelas_kp,
          level_akses: dataBaru.level_akses || final_level_akses,
          dokumen_pendaftaran_kp: {
            update: [
              {
                where: {
                  idKriteria_idPendaftaranKP: {
                    idKriteria: 0,
                    idPendaftaranKP: dataLama.id,
                  },
                },
                data: {
                  data:
                    dataBaru.link_surat_penolakan_instansi ||
                    dataLama.dokumen_pendaftaran_kp[0].data,
                  status:
                    dataBaru.level_akses === 0
                      ? "Ditolak"
                      : dataBaru.status_link_surat_penolakan_instansi ||
                        dataLama.dokumen_pendaftaran_kp[0].status,
                  catatan: dataBaru.catatan_link_surat_penolakan_instansi,
                },
              },
              {
                where: {
                  idKriteria_idPendaftaranKP: {
                    idKriteria: 1,
                    idPendaftaranKP: dataLama.id,
                  },
                },
                data: {
                  data:
                    dataBaru.link_surat_pengantar ||
                    dataLama.dokumen_pendaftaran_kp[1].data,
                  status:
                    dataBaru.level_akses === 1
                      ? "Ditolak"
                      : dataBaru.status_link_surat_pengantar ||
                        dataLama.dokumen_pendaftaran_kp[1].status,
                  catatan: dataBaru.catatan_link_surat_pengantar,
                },
              },
              {
                where: {
                  idKriteria_idPendaftaranKP: {
                    idKriteria: 2,
                    idPendaftaranKP: dataLama.id,
                  },
                },
                data: {
                  data:
                    dataBaru.link_surat_balasan ||
                    dataLama.dokumen_pendaftaran_kp[2].data,
                  status:
                    dataBaru.level_akses === 3
                      ? "Ditolak"
                      : dataBaru.status_link_surat_balasan ||
                        dataLama.dokumen_pendaftaran_kp[2].status,
                  catatan: dataBaru.catatan_link_surat_balasan,
                },
              },
              {
                where: {
                  idKriteria_idPendaftaranKP: {
                    idKriteria: 3,
                    idPendaftaranKP: dataLama.id,
                  },
                },
                data: {
                  data:
                    dataBaru.id_surat_pengajuan_dospem ||
                    dataLama.dokumen_pendaftaran_kp[3].data,
                  status:
                    dataBaru.level_akses === 5
                      ? "Ditolak"
                      : dataBaru.status_id_surat_pengajuan_dospem ||
                        dataLama.dokumen_pendaftaran_kp[3].status,
                  catatan: dataBaru.catatan_id_surat_pengajuan_dospem,
                },
              },
              {
                where: {
                  idKriteria_idPendaftaranKP: {
                    idKriteria: 4,
                    idPendaftaranKP: dataLama.id,
                  },
                },
                data: {
                  data:
                    dataBaru.link_surat_penunjukkan_dospem ||
                    dataLama.dokumen_pendaftaran_kp[4].data,
                  status:
                    dataBaru.level_akses === 7
                      ? "Ditolak"
                      : dataBaru.status_link_surat_penunjukkan_dospem ||
                        dataLama.dokumen_pendaftaran_kp[4].status,
                  catatan: dataBaru.catatan_link_surat_penunjukkan_dospem,
                },
              },
              {
                where: {
                  idKriteria_idPendaftaranKP: {
                    idKriteria: 5,
                    idPendaftaranKP: dataLama.id,
                  },
                },
                data: {
                  data:
                    dataBaru.link_surat_perpanjangan_kp ||
                    dataLama.dokumen_pendaftaran_kp[5].data,
                  status:
                    dataBaru.level_akses === 9
                      ? "Ditolak"
                      : dataBaru.status_link_surat_perpanjangan_kp ||
                        dataLama.dokumen_pendaftaran_kp[5].status,
                  catatan: dataBaru.catatan_link_surat_perpanjangan_kp,
                },
              },
            ],
          },
        },
      });
    } else {
      let final_level_akses = dataLama.level_akses;
      if (dataLama.level_akses === 0) final_level_akses = dataBaru.level_akses;
      if (dataBaru.status_link_surat_pengantar === "Divalidasi") {
        final_level_akses = 3;
      } else if (dataBaru.status_link_surat_pengantar === "Ditolak") {
        final_level_akses = 1;
      } else if (dataBaru.status_link_surat_pengantar === "Terkirim") {
        final_level_akses = 2;
      }
      if (dataBaru.status_link_surat_balasan === "Divalidasi") {
        final_level_akses = 5;
      } else if (dataBaru.status_link_surat_balasan === "Terkirim") {
        final_level_akses = 4;
      } else if (dataBaru.status_link_surat_balasan === "Ditolak") {
        final_level_akses = 3;
      }
      if (dataBaru.status_id_surat_pengajuan_dospem === "Divalidasi") {
        final_level_akses = 7;
      } else if (dataBaru.status_id_surat_pengajuan_dospem === "Terkirim") {
        final_level_akses = 6;
      } else if (dataBaru.status_id_surat_pengajuan_dospem === "Ditolak") {
        final_level_akses = 5;
      }

      if (dataBaru.status_link_surat_penunjukkan_dospem === "Divalidasi") {
        final_level_akses = 9;
      } else if (dataBaru.status_link_surat_penunjukkan_dospem === "Terkirim") {
        final_level_akses = 8;
      } else if (dataBaru.status_link_surat_penunjukkan_dospem === "Ditolak") {
        final_level_akses = 7;
      }

      if (dataBaru.status_link_surat_perpanjangan_kp === "Divalidasi") {
        final_level_akses = 11;
      } else if (dataBaru.status_link_surat_perpanjangan_kp === "Terkirim") {
        final_level_akses = 10;
      } else if (dataBaru.status_link_surat_perpanjangan_kp === "Ditolak") {
        final_level_akses = 9;
      }

      if (dataLama.dokumen_pendaftaran_kp.length === 0) {
        console.log(
          "belum melalui proses create, harusnya jika melalui proses create, maka document akan dibuatkan"
        );
      }

      await prisma.pendaftaran_kp.update({
        where: {
          id: dataLama.id,
        },
        data: {
          nip_pembimbing: dataBaru.nip_pembimbing || dataLama.nip_pembimbing,
          tanggal_mulai: dataBaru.tanggal_mulai || dataLama.tanggal_mulai,
          tanggal_selesai: dataBaru.tanggal_mulai || dataLama.tanggal_selesai,
          status:
            final_level_akses === 11 || dataBaru.level_akses === 11
              ? "Lanjut"
              : dataBaru.status || dataLama.status,
          alasan_lanjut_kp:
            dataBaru.alasan_lanjut_kp || dataLama.alasan_lanjut_kp,
          id_instansi: dataBaru.id_instansi || dataLama.id_instansi,
          tujuan_surat_instansi:
            dataBaru.tujuan_surat_instansi || dataLama.tujuan_surat_instansi,
          judul_kp: dataBaru.judul_kp || dataLama.judul_kp,
          kelas_kp: dataBaru.kelas_kp || dataLama.kelas_kp,
          level_akses:
            dataBaru.level_akses % 2 === 1
              ? dataBaru.level_akses || final_level_akses
              : dataLama.level_akses,
          dokumen_pendaftaran_kp: {
            update: [
              {
                where: {
                  idKriteria_idPendaftaranKP: {
                    idKriteria: 0,
                    idPendaftaranKP: dataLama.id,
                  },
                },
                data: {
                  data:
                    dataBaru.link_surat_penolakan_instansi ||
                    dataLama.dokumen_pendaftaran_kp[0].data,
                  status:
                    dataBaru.level_akses === 0
                      ? "Ditolak"
                      : dataBaru.status_link_surat_penolakan_instansi ||
                        dataLama.dokumen_pendaftaran_kp[0].status,
                  catatan: dataBaru.catatan_link_surat_penolakan_instansi,
                },
              },
              {
                where: {
                  idKriteria_idPendaftaranKP: {
                    idKriteria: 1,
                    idPendaftaranKP: dataLama.id,
                  },
                },
                data: {
                  data:
                    dataBaru.link_surat_pengantar ||
                    dataLama.dokumen_pendaftaran_kp[1].data,
                  status:
                    dataBaru.level_akses === 1
                      ? "Ditolak"
                      : dataBaru.status_link_surat_pengantar ||
                        dataLama.dokumen_pendaftaran_kp[1].status,
                  catatan: dataBaru.catatan_link_surat_pengantar,
                },
              },
              {
                where: {
                  idKriteria_idPendaftaranKP: {
                    idKriteria: 2,
                    idPendaftaranKP: dataLama.id,
                  },
                },
                data: {
                  data:
                    dataBaru.link_surat_balasan ||
                    dataLama.dokumen_pendaftaran_kp[2].data,
                  status:
                    dataBaru.level_akses === 3
                      ? "Ditolak"
                      : dataBaru.status_link_surat_balasan ||
                        dataLama.dokumen_pendaftaran_kp[2].status,
                  catatan: dataBaru.catatan_link_surat_balasan,
                },
              },
              {
                where: {
                  idKriteria_idPendaftaranKP: {
                    idKriteria: 3,
                    idPendaftaranKP: dataLama.id,
                  },
                },
                data: {
                  data:
                    dataBaru.id_surat_pengajuan_dospem ||
                    dataLama.dokumen_pendaftaran_kp[3].data,
                  status:
                    dataBaru.level_akses === 5
                      ? "Ditolak"
                      : dataBaru.status_id_surat_pengajuan_dospem ||
                        dataLama.dokumen_pendaftaran_kp[3].status,
                  catatan: dataBaru.catatan_id_surat_pengajuan_dospem,
                },
              },
              {
                where: {
                  idKriteria_idPendaftaranKP: {
                    idKriteria: 4,
                    idPendaftaranKP: dataLama.id,
                  },
                },
                data: {
                  data:
                    dataBaru.link_surat_penunjukkan_dospem ||
                    dataLama.dokumen_pendaftaran_kp[4].data,
                  status:
                    dataBaru.level_akses === 7
                      ? "Ditolak"
                      : dataBaru.status_link_surat_penunjukkan_dospem ||
                        dataLama.dokumen_pendaftaran_kp[4].status,
                  catatan: dataBaru.catatan_link_surat_penunjukkan_dospem,
                },
              },
              {
                where: {
                  idKriteria_idPendaftaranKP: {
                    idKriteria: 5,
                    idPendaftaranKP: dataLama.id,
                  },
                },
                data: {
                  data:
                    dataBaru.link_surat_perpanjangan_kp ||
                    dataLama.dokumen_pendaftaran_kp[5].data,
                  status:
                    dataBaru.level_akses === 9
                      ? "Ditolak"
                      : dataBaru.status_link_surat_perpanjangan_kp ||
                        dataLama.dokumen_pendaftaran_kp[5].status,
                  catatan: dataBaru.catatan_link_surat_perpanjangan_kp,
                },
              },
            ],
          },
        },
      });

      if (dataLama.level_akses === 2) {
        await DaftarKPRepository.createLOGPendaftaranKPById(
          dataLama.id,
          `[BERKAS DITERIMA] Pengajuan link surat pengantar kerja praktik diterima dengan link ${
            dataBaru?.link_surat_pengantar || ""
          }`,
          new Date(),
          1
        );
      } else if (dataLama.level_akses === 4) {
        await DaftarKPRepository.createLOGPendaftaranKPById(
          dataLama.id,
          `[BERKAS DITERIMA] Pengajuan link surat balasan instansi diterima dengan link ${
            dataBaru?.link_surat_balasan || ""
          }`,
          new Date(),
          1
        );
      } else if (dataLama.level_akses === 6) {
        await DaftarKPRepository.createLOGPendaftaranKPById(
          dataLama.id,
          `[BERKAS DITERIMA] Pengajuan ID penunjukkan dosen pembimbing diterima dengan link ${
            dataBaru?.id_surat_pengajuan_dospem || ""
          }`,
          new Date(),
          1
        );
      } else if (dataLama.level_akses === 8) {
        await DaftarKPRepository.createLOGPendaftaranKPById(
          dataLama.id,
          `[BERKAS DITERIMA] Pengajuan link surat penunjukkan dosem pembimbing diterima dengan link ${
            dataBaru?.link_surat_penunjukkan_dospem || ""
          }`,
          new Date(),
          1
        );
      }
    }
  }

  // berkas KP harusnya
  public static async getBerkasSuratPengantarMahasiswa(): Promise<
    pendaftaran_kp[]
  > {
    const data = await prisma.pendaftaran_kp.findMany({
      where: {
        level_akses: 2,
      },
      include: {
        mahasiswa: true,
      },
    });

    return data;
  }

  public static async getBerkasSuratBalasanMahasiswa(): Promise<
    pendaftaran_kp[]
  > {
    const data = await prisma.pendaftaran_kp.findMany({
      where: {
        level_akses: 4,
      },
      include: {
        mahasiswa: true,
      },
    });

    return data;
  }

  public static async getBerkasIdPengajuanDosenPembimbingMahasiswa(): Promise<
    pendaftaran_kp[]
  > {
    const data = await prisma.pendaftaran_kp.findMany({
      where: {
        level_akses: 6,
      },
      include: {
        mahasiswa: true,
      },
    });

    return data;
  }

  public static async getBerkasPenunjukkanDosenPembimbingMahasiswa(): Promise<
    pendaftaran_kp[]
  > {
    const data = await prisma.pendaftaran_kp.findMany({
      where: {
        level_akses: 8,
      },
      include: {
        mahasiswa: true,
      },
    });

    return data;
  }

  public static async getBerkasSuratPerpanjanganKPMahasiswa(): Promise<
    pendaftaran_kp[]
  > {
    const data = await prisma.pendaftaran_kp.findMany({
      where: {
        level_akses: 10,
      },
      include: {
        mahasiswa: true,
      },
    });

    return data;
  }
}
