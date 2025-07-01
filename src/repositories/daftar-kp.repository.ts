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
import MahasiswaHelper from "../helpers/mahasiswa.helper";
import { APIError } from "../utils/api-error.util";
import {
  Document,
  instansi,
  jenis_instansi,
  LOG,
  option,
  pendaftaran_kp,
  status_instansi,
} from "../generated/prisma";
import {
  IsPendaftaranKPClosed,
  IsPendaftaranKPLanjutClosed,
} from "../validators/batas-waktu-pendaftaran..validator";
import { blackListInstansi } from "../validators/instansi-blacklist.validator";

export default class DaftarKPRepository {
  public static postLOGPPencetakanSuratPengantar(id: string) {
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
    nipDospem?: string
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
        tanggal_mulai:
          dataKPTerbaru.level_akses === 3
            ? tanggalMulai
            : dataKPTerbaru.tanggal_mulai,
        tanggal_selesai:
          dataKPTerbaru.level_akses === 3
            ? tanggalSelesai
            : dataKPTerbaru.tanggal_selesai,
        nip_pembimbing:
          dataKPTerbaru.level_akses === 7
            ? nipDospem
            : dataKPTerbaru.nip_pembimbing,
        catatan_penolakan: null,
        level_akses: final_level_akses,
        document: {
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
      // const dataInstansi = await DaftarKPRepository.findInstansiById(
      //   idInstansi
      // );

      // if (!dataInstansi) {
      //   throw new APIError("Data instansi tidak ditemukan");
      // } else if (dataInstansi.status === "Pending") {
      //   throw new APIError("Instansi belum disetujui oleh koordinator KP");
      // } else if (dataInstansi.status === "Tidak_Aktif") {
      //   throw new APIError("Instansi yang dipilih tidak aktif");
      // }

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
          id_tahun_ajaran: await MahasiswaHelper.getTahunAjaran(),
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
    idKP: string
  ): Promise<RepositoryDetailPendaftaranKPMahasiswa | null> {
    return await prisma.pendaftaran_kp.findUnique({
      where: {
        id: idKP,
      },
      include: {
        document: {
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
  }

  public static async getDataKPMahasiswaBagianUmum(): Promise<
    RepositoryPendaftaranKPMahasiswaInterface[]
  > {
    return await prisma.pendaftaran_kp.findMany({
      where: {
        log: {
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

  public static async getLOGByIdPendaftaranKP(idKP: string): Promise<LOG[]> {
    return await prisma.lOG.findMany({
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
    return await prisma.lOG.create({
      data: {
        pendaftaran_kp_id: idKP,
        message,
        tanggal,
        status,
      },
    });
  }

  public static async patchBerkasMahasiswa(
    dataKP: pendaftaran_kp & { document: Document[] },
    nomorBerkas: number,
    status: "Divalidasi" | "Ditolak",
    catatan?: string
  ) {
    if (status === "Divalidasi") {
      if (dataKP.document[0].status === "Terkirim") {
        const dataLOG = await prisma.lOG.findFirst({
          where: {
            pendaftaran_kp_id: dataKP.id,
            status: 999,
          },
        });
        if (dataLOG) {
          await prisma.lOG.update({
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
            document: {
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
        if (dataKP.document[2].status === "Divalidasi") {
          final_level_akses = 5;
        } else if (dataKP.document[2].status === "Terkirim") {
          final_level_akses = 4;
        }
        if (dataKP.document[3].status === "Divalidasi") {
          final_level_akses = 7;
        } else if (dataKP.document[3].status === "Terkirim") {
          final_level_akses = 6;
        }

        if (dataKP.document[4].status === "Divalidasi") {
          final_level_akses = 9;
        } else if (dataKP.document[4].status === "Terkirim") {
          final_level_akses = 8;
        }

        if (dataKP.document[5].status === "Divalidasi") {
          final_level_akses = 11;
        } else if (dataKP.document[5].status === "Terkirim") {
          final_level_akses = 10;
        }
      } else if (dataKP.level_akses / 2 === 2 && nomorBerkas === 2) {
        namaBerkas = "Surat Balasan Kerja Praktik";
        final_level_akses = final_level_akses + 1;
        if (dataKP.document[3].status === "Divalidasi") {
          final_level_akses = 7;
        } else if (dataKP.document[3].status === "Terkirim") {
          final_level_akses = 6;
        }

        if (dataKP.document[4].status === "Divalidasi") {
          final_level_akses = 9;
        } else if (dataKP.document[4].status === "Terkirim") {
          final_level_akses = 8;
        }

        if (dataKP.document[5].status === "Divalidasi") {
          final_level_akses = 11;
        } else if (dataKP.document[5].status === "Terkirim") {
          final_level_akses = 10;
        }
      } else if (dataKP.level_akses / 2 === 3 && nomorBerkas === 3) {
        namaBerkas = "ID Pengajuan Dosen Pembimbing";
        final_level_akses = final_level_akses + 1;
        if (dataKP.document[4].status === "Divalidasi") {
          final_level_akses = 9;
        } else if (dataKP.document[4].status === "Terkirim") {
          final_level_akses = 8;
        }

        if (dataKP.document[5].status === "Divalidasi") {
          final_level_akses = 11;
        } else if (dataKP.document[5].status === "Terkirim") {
          final_level_akses = 10;
        }
      } else if (dataKP.level_akses / 2 === 4 && nomorBerkas === 4) {
        namaBerkas = "Surat Penunjukkan Dosen Pembimbing";
        final_level_akses = final_level_akses + 1;
        if (dataKP.document[5].status === "Divalidasi") {
          final_level_akses = 11;
        } else if (dataKP.document[5].status === "Terkirim") {
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
          tanggal_mulai:
            dataKP.level_akses === 8 &&
            new Date().getTime() > new Date(dataKP.tanggal_mulai).getTime()
              ? new Date()
              : dataKP.tanggal_mulai,
          document: {
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
        `[SUKSES] ${namaBerkas} dengan link ${dataKP.document[nomorBerkas].data} mahasiswa telah divalidasi oleh Koordinator Kerja Praktik`,
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
            tanggal_mulai: nomorBerkas === 2 ? undefined : dataKP.tanggal_mulai,
            tanggal_selesai:
              nomorBerkas === 2 ? undefined : dataKP.tanggal_selesai,
            document: {
              update: {
                where: {
                  idKriteria_idPendaftaranKP: {
                    idKriteria:
                      dataKP.document[0].status === "Terkirim"
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
            document: {
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
            document: {
              update: {
                where: {
                  idKriteria_idPendaftaranKP: {
                    idKriteria:
                      dataKP.document[0].status === "Terkirim"
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
        `[BERKAS DITOLAK] Berkas dengan link ${dataKP.document[nomorBerkas].data} mahasiswa ditolak. ${catatan}`,
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

      // else if (dataKP.level_akses === 10) {
      //   const isClosed = await IsPendaftaranKPLanjutClosed();
      //   if (isClosed) {
      //     await prisma.pendaftaran_kp.update({
      //       where: {
      //         id: dataKP.id,
      //       },
      //       data: {
      //         document: {
      //           update: {
      //             where: {
      //               idKriteria_idPendaftaranKP: {
      //                 idKriteria: 5,
      //                 idPendaftaranKP: dataKP.id,
      //               },
      //             },
      //             data: {
      //               status,
      //               catatan: catatan || "Link mungkin tidak valid",
      //             },
      //           },
      //         },
      //         status: "Gagal",
      //         // bagaimana kalau status kp tetap "baru", di front end kita cuma melihat catatan_penolakan saja, setelah diperbarui oleh mahasiswa, catatan_penolakan dikosongkan lagi
      //         level_akses: {
      //           decrement: 1,
      //         },
      //         catatan_penolakan: catatan,
      //       },
      //     });
      //   } else {
      //     await prisma.pendaftaran_kp.update({
      //       where: {
      //         id: dataKP.id,
      //       },
      //       data: {
      //         document: {
      //           update: {
      //             where: {
      //               idKriteria_idPendaftaranKP: {
      //                 idKriteria: 5,
      //                 idPendaftaranKP: dataKP.id,
      //               },
      //             },
      //             data: {
      //               status,
      //               catatan: catatan || "Link mungkin tidak valid",
      //             },
      //           },
      //         },
      //         // bagaimana kalau status kp tetap "baru", di front end kita cuma melihat catatan_penolakan saja, setelah diperbarui oleh mahasiswa, catatan_penolakan dikosongkan lagi
      //         level_akses: {
      //           decrement: 1,
      //         },
      //         catatan_penolakan: catatan,
      //       },
      //     });
      //   }

      //   await DaftarKPRepository.createLOGPendaftaranKPById(
      //     dataKP.id,
      //     `[BERKAS DITOLAK] ${catatan}`,
      //     new Date(),
      //     2
      //   );

      //   if (isClosed) {
      //     await DaftarKPRepository.createLOGPendaftaranKPById(
      //       dataKP.id,
      //       "[GAGAL] Pendaftaran kerja praktik gagal karena sudah melewati batas waktu",
      //       new Date(),
      //       2
      //     );
      //   }
      // }
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
        document: {
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

  public static async getTahunAjaran(): Promise<getTahunAjaran[]> {
    const dataTahunAjaran = await prisma.tahun_ajaran.findMany({});

    return dataTahunAjaran;
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
        id_tahun_ajaran: await MahasiswaHelper.getTahunAjaran(),
        judul_kp,
        level_akses: 1,
        kelas_kp,
        document: {
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

  public static async createPermomohonanInstansi({
    nim,
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
  ): Promise<(pendaftaran_kp & { document: Document[] }) | null> {
    const dataKP = await prisma.pendaftaran_kp.findUnique({
      where: {
        id,
      },
      include: {
        document: {
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
      (dataLama.document[0].status !== "Divalidasi" &&
        dataBaru.status_link_surat_penolakan_instansi === "Divalidasi") ||
      (dataLama.level_akses !== 0 && dataBaru.level_akses === 0)
    ) {
      const dataLOG = await prisma.lOG.findFirst({
        where: {
          pendaftaran_kp_id: dataLama.id,
          status: 999,
        },
      });
      if (dataLOG) {
        await prisma.lOG.update({
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
          id: dataLama.id,
        },
        data: {
          status: dataBaru.status || dataLama.status,
          level_akses: 0,
          document: {
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
          document: {
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
                    dataLama.document[0].data,
                  status:
                    dataBaru.level_akses === 0
                      ? "Ditolak"
                      : dataBaru.status_link_surat_penolakan_instansi ||
                        dataLama.document[0].status,
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
                    dataBaru.link_surat_pengantar || dataLama.document[1].data,
                  status:
                    dataBaru.level_akses === 1
                      ? "Ditolak"
                      : dataBaru.status_link_surat_pengantar ||
                        dataLama.document[1].status,
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
                    dataBaru.link_surat_balasan || dataLama.document[2].data,
                  status:
                    dataBaru.level_akses === 3
                      ? "Ditolak"
                      : dataBaru.status_link_surat_balasan ||
                        dataLama.document[2].status,
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
                    dataLama.document[3].data,
                  status:
                    dataBaru.level_akses === 5
                      ? "Ditolak"
                      : dataBaru.status_id_surat_pengajuan_dospem ||
                        dataLama.document[3].status,
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
                    dataLama.document[4].data,
                  status:
                    dataBaru.level_akses === 7
                      ? "Ditolak"
                      : dataBaru.status_link_surat_penunjukkan_dospem ||
                        dataLama.document[4].status,
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
                    dataLama.document[5].data,
                  status:
                    dataBaru.level_akses === 9
                      ? "Ditolak"
                      : dataBaru.status_link_surat_perpanjangan_kp ||
                        dataLama.document[5].status,
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

      if (dataLama.document.length === 0) {
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
          document: {
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
                    dataLama.document[0].data,
                  status:
                    dataBaru.level_akses === 0
                      ? "Ditolak"
                      : dataBaru.status_link_surat_penolakan_instansi ||
                        dataLama.document[0].status,
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
                    dataBaru.link_surat_pengantar || dataLama.document[1].data,
                  status:
                    dataBaru.level_akses === 1
                      ? "Ditolak"
                      : dataBaru.status_link_surat_pengantar ||
                        dataLama.document[1].status,
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
                    dataBaru.link_surat_balasan || dataLama.document[2].data,
                  status:
                    dataBaru.level_akses === 3
                      ? "Ditolak"
                      : dataBaru.status_link_surat_balasan ||
                        dataLama.document[2].status,
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
                    dataLama.document[3].data,
                  status:
                    dataBaru.level_akses === 5
                      ? "Ditolak"
                      : dataBaru.status_id_surat_pengajuan_dospem ||
                        dataLama.document[3].status,
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
                    dataLama.document[4].data,
                  status:
                    dataBaru.level_akses === 7
                      ? "Ditolak"
                      : dataBaru.status_link_surat_penunjukkan_dospem ||
                        dataLama.document[4].status,
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
                    dataLama.document[5].data,
                  status:
                    dataBaru.level_akses === 9
                      ? "Ditolak"
                      : dataBaru.status_link_surat_perpanjangan_kp ||
                        dataLama.document[5].status,
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
  // public static async putBerkasMahasiswa(
  //   dataBaru: any,
  //   dataLama: any,
  //   isEditing: boolean
  // ) {
  //   if (isEditing) {
  //     await prisma.pendaftaran_kp.update({
  //       where: {
  //         id: dataLama.id,
  //       },
  //       data: {
  //         alasan_lanjut_kp:
  //           dataBaru.alasan_lanjut_kp || dataLama.alasan_lanjut_kp,
  //         id_instansi: dataBaru.id_instansi || dataLama.id_instansi,
  //         tujuan_surat_instansi:
  //           dataBaru.tujuan_surat_instansi || dataLama.tujuan_surat_instansi,
  //         judul_kp: dataBaru.judul_kp || dataLama.judul_kp,
  //         kelas_kp: dataBaru.kelas_kp || dataLama.kelas_kp,
  //         status: dataBaru.status || dataLama.status,
  //         level_akses: dataBaru.level_akses || dataLama.level_akses,
  //         document: {
  //           update: [
  //             {
  //               where: {
  //                 idKriteria_idPendaftaranKP: {
  //                   idKriteria: 0,
  //                   idPendaftaranKP: dataLama.id,
  //                 },
  //               },
  //               data: {
  //                 data:
  //                   dataBaru.link_surat_penolakan_instansi ||
  //                   dataLama.document[0].data,

  //               },
  //             },
  //             {
  //               where: {
  //                 idKriteria_idPendaftaranKP: {
  //                   idKriteria: 1,
  //                   idPendaftaranKP: dataLama.id,
  //                 },
  //               },
  //               data: {
  //                 data:
  //                   dataBaru.link_surat_pengantar ||
  //                   dataLama.document[1].data,
  //               },
  //             },
  //             {
  //               where: {
  //                 idKriteria_idPendaftaranKP: {
  //                   idKriteria: 2,
  //                   idPendaftaranKP: dataLama.id,
  //                 },
  //               },
  //               data: {
  //                 data:
  //                   dataBaru.link_surat_balasan || dataLama.document[2].data,
  //               },
  //             },
  //             {
  //               where: {
  //                 idKriteria_idPendaftaranKP: {
  //                   idKriteria: 3,
  //                   idPendaftaranKP: dataLama.id,
  //                 },
  //               },
  //               data: {
  //                 data:
  //                   dataBaru.id_surat_pengajuan_dospem ||
  //                   dataLama.document[3].data,
  //               },
  //             },
  //             {
  //               where: {
  //                 idKriteria_idPendaftaranKP: {
  //                   idKriteria: 4,
  //                   idPendaftaranKP: dataLama.id,
  //                 },
  //               },
  //               data: {
  //                 data:
  //                   dataBaru.link_surat_penunjukkan_dospem ||
  //                   dataLama.document[4].data,
  //               },
  //             },
  //             {
  //               where: {
  //                 idKriteria_idPendaftaranKP: {
  //                   idKriteria: 5,
  //                   idPendaftaranKP: dataLama.id,
  //                 },
  //               },
  //               data: {
  //                 data:
  //                   dataBaru.link_surat_perpanjangan_kp ||
  //                   dataLama.document[5].data,
  //               },
  //             },
  //           ],
  //         },
  //       },
  //     });
  //   } else {
  //     if (dataLama.levelAkses === 10) {
  //       await prisma.pendaftaran_kp.update({
  //         where: {
  //           id: dataLama.id,
  //         },
  //         data: {
  //           alasan_lanjut_kp:
  //             dataBaru.alasan_lanjut_kp || dataLama.alasan_lanjut_kp,
  //           id_instansi: dataBaru.id_instansi || dataLama.id_instansi,
  //           tujuan_surat_instansi:
  //             dataBaru.tujuan_surat_instansi || dataLama.tujuan_surat_instansi,
  //           judul_kp: dataBaru.judul_kp || dataLama.judul_kp,
  //           kelas_kp: dataBaru.kelas_kp || dataLama.kelas_kp,
  //           document: {
  //             update: [
  //               {
  //                 where: {
  //                   idKriteria_idPendaftaranKP: {
  //                     idKriteria: 0,
  //                     idPendaftaranKP: dataLama.id,
  //                   },
  //                 },
  //                 data: {
  //                   data:
  //                     dataBaru.link_surat_penolakan_instansi ||
  //                     dataLama.document[0].data,
  //                 },
  //               },
  //               {
  //                 where: {
  //                   idKriteria_idPendaftaranKP: {
  //                     idKriteria: 1,
  //                     idPendaftaranKP: dataLama.id,
  //                   },
  //                 },
  //                 data: {
  //                   data:
  //                     dataBaru.link_surat_pengantar ||
  //                     dataLama.document[1].data,
  //                 },
  //               },
  //               {
  //                 where: {
  //                   idKriteria_idPendaftaranKP: {
  //                     idKriteria: 2,
  //                     idPendaftaranKP: dataLama.id,
  //                   },
  //                 },
  //                 data: {
  //                   data:
  //                     dataBaru.link_surat_balasan ||
  //                     dataLama.document[2].data,
  //                 },
  //               },
  //               {
  //                 where: {
  //                   idKriteria_idPendaftaranKP: {
  //                     idKriteria: 3,
  //                     idPendaftaranKP: dataLama.id,
  //                   },
  //                 },
  //                 data: {
  //                   data:
  //                     dataBaru.id_surat_pengajuan_dospem ||
  //                     dataLama.document[3].data,
  //                 },
  //               },
  //               {
  //                 where: {
  //                   idKriteria_idPendaftaranKP: {
  //                     idKriteria: 4,
  //                     idPendaftaranKP: dataLama.id,
  //                   },
  //                 },
  //                 data: {
  //                   data:
  //                     dataBaru.link_surat_penunjukkan_dospem ||
  //                     dataLama.document[4].data,
  //                 },
  //               },
  //               {
  //                 where: {
  //                   idKriteria_idPendaftaranKP: {
  //                     idKriteria: 5,
  //                     idPendaftaranKP: dataLama.id,
  //                   },
  //                 },
  //                 data: {
  //                   data:
  //                     dataBaru.link_surat_perpanjangan_kp ||
  //                     dataLama.document[5].data,
  //                 },
  //               },
  //             ],
  //           },
  //           status: dataBaru.status || "Lanjut",
  //           level_akses: dataBaru.level_akses || dataLama.level_akses + 1,
  //         },
  //       });

  //       // TIMEOUT UNTUK 6 BULAN

  //       const pointer = setTimeout(function () {
  //         const pointer1 = setTimeout(function () {
  //           const pointer2 = setTimeout(function () {
  //             const pointer3 = setTimeout(function () {
  //               const pointer4 = setTimeout(function () {
  //                 const pointer5 = setTimeout(function () {
  //                   const pointer6 = setTimeout(function () {
  //                     const pointer7 = setTimeout(async function () {
  //                       {
  //                         await prisma.pendaftaran_kp.update({
  //                           where: {
  //                             id: dataLama.id,
  //                             status: "Lanjut",
  //                           },
  //                           data: {
  //                             status: "Gagal",
  //                           },
  //                         });
  //                         clearTimeout(pointer7);
  //                       }
  //                     }, 518400000);
  //                     clearTimeout(pointer6);
  //                   }, 2147483640);
  //                   clearTimeout(pointer5);
  //                 }, 2147483640);
  //                 clearTimeout(pointer4);
  //               }, 2147483640);
  //               clearTimeout(pointer3);
  //             }, 2147483640);
  //             clearTimeout(pointer2);
  //           }, 2147483640);
  //           clearTimeout(pointer1);
  //         }, 2147483640);
  //         clearTimeout(pointer);
  //       }, 2147483640);

  //       await DaftarKPRepository.createLOGPendaftaranKPById(
  //         dataLama.id,
  //         `[BERKAS DITERIMA] Pengajuan link surat perpanjangan kerja praktik diterima`,
  //         new Date(),
  //         1
  //       );
  //       return;
  //     }

  //     const dataLama.document = await prisma.document.findMany({
  //       where: {
  //         idPendaftaranKP: dataLama.id,
  //       },
  //       orderBy: {
  //         idKriteria: "asc",
  //       },
  //     });

  //     if (dataLama.document.length === 0) {
  //       console.log(
  //         "belum melalui proses create, harusnya jika melalui proses create, maka document akan dibuatkan"
  //       );
  //     }

  //     await prisma.pendaftaran_kp.update({
  //       where: {
  //         id: dataLama.id,
  //       },
  //       data: {
  //         alasan_lanjut_kp:
  //           dataBaru.alasan_lanjut_kp || dataLama.alasan_lanjut_kp,
  //         id_instansi: dataBaru.id_instansi || dataLama.id_instansi,
  //         tujuan_surat_instansi:
  //           dataBaru.tujuan_surat_instansi || dataLama.tujuan_surat_instansi,
  //         judul_kp: dataBaru.judul_kp || dataLama.judul_kp,
  //         kelas_kp: dataBaru.kelas_kp || dataLama.kelas_kp,
  //         document: {
  //           update: [
  //             {
  //               where: {
  //                 idKriteria_idPendaftaranKP: {
  //                   idKriteria: 0,
  //                   idPendaftaranKP: dataLama.id,
  //                 },
  //               },
  //               data: {
  //                 data:
  //                   dataBaru.link_surat_penolakan_instansi ||
  //                   dataLama.document[0].data,
  //                 status:
  //                   dataLama.document[0].status === "Terkirim"
  //                     ? "Divalidasi"
  //                     : dataLama.document[0].status,
  //               },
  //             },
  //             {
  //               where: {
  //                 idKriteria_idPendaftaranKP: {
  //                   idKriteria: 1,
  //                   idPendaftaranKP: dataLama.id,
  //                 },
  //               },
  //               data: {
  //                 data:
  //                   dataBaru.link_surat_pengantar ||
  //                   dataLama.document[1].data,
  //                 status:
  //                   dataLama.document[1].status === "Terkirim"
  //                     ? "Divalidasi"
  //                     : dataLama.document[1].status,
  //               },
  //             },
  //             {
  //               where: {
  //                 idKriteria_idPendaftaranKP: {
  //                   idKriteria: 2,
  //                   idPendaftaranKP: dataLama.id,
  //                 },
  //               },
  //               data: {
  //                 data:
  //                   dataBaru.link_surat_balasan || dataLama.document[2].data,
  //                 status:
  //                   dataLama.document[2].status === "Terkirim"
  //                     ? "Divalidasi"
  //                     : dataLama.document[2].status,
  //               },
  //             },
  //             {
  //               where: {
  //                 idKriteria_idPendaftaranKP: {
  //                   idKriteria: 3,
  //                   idPendaftaranKP: dataLama.id,
  //                 },
  //               },
  //               data: {
  //                 data:
  //                   dataBaru.id_surat_pengajuan_dospem ||
  //                   dataLama.document[3].data,
  //                 status:
  //                   dataLama.document[3].status === "Terkirim"
  //                     ? "Divalidasi"
  //                     : dataLama.document[3].status,
  //               },
  //             },
  //             {
  //               where: {
  //                 idKriteria_idPendaftaranKP: {
  //                   idKriteria: 4,
  //                   idPendaftaranKP: dataLama.id,
  //                 },
  //               },
  //               data: {
  //                 data:
  //                   dataBaru.link_surat_penunjukkan_dospem ||
  //                   dataLama.document[4].data,
  //                 status:
  //                   dataLama.document[4].status === "Terkirim"
  //                     ? "Divalidasi"
  //                     : dataLama.document[4].status,
  //               },
  //             },
  //             {
  //               where: {
  //                 idKriteria_idPendaftaranKP: {
  //                   idKriteria: 5,
  //                   idPendaftaranKP: dataLama.id,
  //                 },
  //               },
  //               data: {
  //                 data:
  //                   dataBaru.link_surat_perpanjangan_kp ||
  //                   dataLama.document[5].data,
  //                 status:
  //                   dataLama.document[5].status === "Terkirim"
  //                     ? "Divalidasi"
  //                     : dataLama.document[5].status,
  //               },
  //             },
  //           ],
  //         },
  //         level_akses:
  //           dataBaru.level_akses === dataLama.level_akses
  //             ? dataBaru.level_akses + 1 || dataLama.level_akses + 1
  //             : dataBaru.level_akses || dataLama.level_akses + 1,
  //       },
  //     });

  //     if (dataLama.level_akses === 2) {
  //       await DaftarKPRepository.createLOGPendaftaranKPById(
  //         dataLama.id,
  //         `[BERKAS DITERIMA] Pengajuan link surat pengantar kerja praktik diterima`,
  //         new Date(),
  //         1
  //       );
  //     } else if (dataLama.level_akses === 4) {
  //       await DaftarKPRepository.createLOGPendaftaranKPById(
  //         dataLama.id,
  //         `[BERKAS DITERIMA] Pengajuan link surat balasan instansi diterima`,
  //         new Date(),
  //         1
  //       );
  //     } else if (dataLama.level_akses === 6) {
  //       await DaftarKPRepository.createLOGPendaftaranKPById(
  //         dataLama.id,
  //         `[BERKAS DITERIMA] Pengajuan ID penunjukkan dosen pembimbing diterima`,
  //         new Date(),
  //         1
  //       );
  //     } else if (dataLama.level_akses === 8) {
  //       await DaftarKPRepository.createLOGPendaftaranKPById(
  //         dataLama.id,
  //         `[BERKAS DITERIMA] Pengajuan link surat penunjukkan dosem pembimbing diterima`,
  //         new Date(),
  //         1
  //       );
  //     }
  //   }
  // }

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

  // public static async getPendaftaranKPTerbaru(nim : string) {
  //     const data = await prisma.pendaftaran_kp.findFirst({
  //         where : {
  //             nim,
  //             level_akses : {
  //                 not : 0
  //             }
  //         },
  //         take : 1
  //     })

  //     if (!data) {
  //         throw new APIError("Data pendaftaran KP tidak ditemukan", 404)
  //     }

  //     return data
  // }
}
