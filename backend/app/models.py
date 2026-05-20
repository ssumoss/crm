from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Numeric, Text, Boolean, UniqueConstraint
from app.database import Base


class Sehirler(Base):
    __tablename__ = "sehirler"

    sehir_id = Column(Integer, primary_key=True, index=True)
    sehir_adi = Column(String(100), nullable=False, unique=True)


class BelgeTipi(Base):
    __tablename__ = "belge_tipi"

    belge_tipi_id = Column(Integer, primary_key=True, index=True)
    belge_tipi_adi = Column(String(100), nullable=False, unique=True)


class SatisNoktalari(Base):
    __tablename__ = "satis_noktalari"

    satis_noktasi_id = Column(Integer, primary_key=True, index=True)
    satis_noktasi_adi = Column(String(150), nullable=False)
    sehir_id = Column(Integer, ForeignKey("sehirler.sehir_id"), nullable=False)
    satis_tipi_id = Column(Integer, nullable=False)


class Musteriler(Base):
    __tablename__ = "musteriler"

    musteri_id = Column(Integer, primary_key=True, index=True)
    musteri_kodu = Column(String(50), nullable=False, unique=True)
    musteri_adi = Column(String(100), nullable=False)
    musteri_soyadi = Column(String(100), nullable=True)
    mail = Column(String(150), nullable=True)
    gsm_no = Column(String(30), nullable=True)
    satis_noktasi_id = Column(Integer, ForeignKey("satis_noktalari.satis_noktasi_id"), nullable=True)
    kayit_tarihi = Column(DateTime, nullable=True)


class Faturalar(Base):
    __tablename__ = "faturalar"

    fatura_no = Column(String(50), primary_key=True, index=True)
    musteri_id = Column(Integer, ForeignKey("musteriler.musteri_id"), nullable=False)
    satis_noktasi_id = Column(Integer, ForeignKey("satis_noktalari.satis_noktasi_id"), nullable=False)
    fatura_tarihi = Column(DateTime, nullable=False)
    fatura_tutari = Column(Numeric(12, 2), nullable=False)
    belge_tipi_id = Column(Integer, ForeignKey("belge_tipi.belge_tipi_id"), nullable=False)


class Roller(Base):
    __tablename__ = "roller"

    rol_id = Column(Integer, primary_key=True, index=True)
    rol_adi = Column(String(255), nullable=False, unique=True)
    aciklama = Column(Text, nullable=True)
    aktif_mi = Column(Boolean, nullable=False, default=True)
    olusturma_tarihi = Column(DateTime, nullable=True)


class Izinler(Base):
    __tablename__ = "izinler"

    izin_id = Column(Integer, primary_key=True, index=True)
    izin_kodu = Column(String(100), nullable=False, unique=True)
    izin_adi = Column(String(100), nullable=False)
    aciklama = Column(Text, nullable=True)
    modul_adi = Column(String(50), nullable=True)


class RolIzinleri(Base):
    __tablename__ = "rol_izinleri"

    rol_izin_id = Column(Integer, primary_key=True, index=True)
    rol_id = Column(Integer, ForeignKey("roller.rol_id"), nullable=False)
    izin_id = Column(Integer, ForeignKey("izinler.izin_id"), nullable=False)
    olusturma_tarihi = Column(DateTime, nullable=True)

    __table_args__ = (
        UniqueConstraint("rol_id", "izin_id", name="uq_rol_izin"),
    )


class Kullanicilar(Base):
    __tablename__ = "kullanicilar"

    kullanici_id = Column(Integer, primary_key=True, index=True)
    ad = Column(String(50), nullable=False)
    soyad = Column(String(50), nullable=False)
    tel_no = Column(String(20), nullable=True)
    email = Column(String(255), nullable=False, unique=True)
    sifre_hash = Column(String(255), nullable=False)
    rol_id = Column(Integer, ForeignKey("roller.rol_id"), nullable=False)
    aktif_mi = Column(Boolean, nullable=False, default=True)
    olusturma_tarihi = Column(DateTime, nullable=True)


class GirisLoglari(Base):
    __tablename__ = "giris_loglari"

    giris_log_id = Column(Integer, primary_key=True, index=True)
    kullanici_id = Column(Integer, ForeignKey("kullanicilar.kullanici_id"), nullable=True)
    email = Column(String(100), nullable=False)
    basarili_mi = Column(Boolean, nullable=False)
    ip_adresi = Column(String(50), nullable=True)
    hata_mesaji = Column(String(255), nullable=True)
    giris_tarihi = Column(DateTime, nullable=True)


class LogKayitlari(Base):
    __tablename__ = "log_kayitlari"

    log_id = Column(Integer, primary_key=True, index=True)
    tablo_adi = Column(String(100), nullable=True)
    kayit_id = Column(String(50), nullable=True)
    islem_tipi = Column(String(50), nullable=True)
    eski_deger = Column(Text, nullable=True)
    yeni_deger = Column(Text, nullable=True)
    islem_tarihi = Column(DateTime, nullable=True)
    kullanici = Column(String(100), nullable=True)

class Markalar(Base):
    __tablename__ = "markalar"

    marka_id = Column(Integer, primary_key=True, index=True)
    marka_adi = Column(String(100), nullable=False)


class Urunler(Base):
    __tablename__ = "urunler"

    urun_id = Column(Integer, primary_key=True, index=True)
    urun_kodu = Column(String(100), nullable=False)
    urun_adi = Column(String(255), nullable=False)
    marka_id = Column(Integer, ForeignKey("markalar.marka_id"), nullable=False)


class SiparisDetaylari(Base):
    __tablename__ = "siparis_detaylari"

    siparis_id = Column(Integer, primary_key=True, index=True)
    fatura_no = Column(String(50), ForeignKey("faturalar.fatura_no"), nullable=False)
    urun_id = Column(Integer, ForeignKey("urunler.urun_id"), nullable=False)
    adet = Column(Integer, nullable=False)
    birim_fiyat = Column(Numeric(10, 2), nullable=False)
    satir_toplami = Column(Numeric(10, 2), nullable=False)


class SatisTipleri(Base):
    __tablename__ = "satis_tipleri"

    satis_tipi_id = Column(Integer, primary_key=True, index=True)
    satis_tipi_adi = Column(String(50), nullable=False)

class Bildirimler(Base):
    __tablename__ = "bildirimler"

    bildirim_id = Column(Integer, primary_key=True, index=True)
    kullanici_id = Column(Integer, ForeignKey("kullanicilar.kullanici_id"), nullable=False)
    baslik = Column(String(150), nullable=False)
    mesaj = Column(Text, nullable=False)
    tip = Column(String(50), nullable=True, default="info")
    okundu_mu = Column(Boolean, nullable=False, default=False)
    olusturma_tarihi = Column(DateTime, nullable=True)


class EkipMesajlari(Base):
    __tablename__ = "ekip_mesajlari"

    mesaj_id = Column(Integer, primary_key=True, index=True)
    gonderen_kullanici_id = Column(Integer, ForeignKey("kullanicilar.kullanici_id"), nullable=False)
    alici_kullanici_id = Column(Integer, ForeignKey("kullanicilar.kullanici_id"), nullable=False)
    mesaj = Column(Text, nullable=False)
    okundu_mu = Column(Boolean, nullable=False, default=False)
    gonderim_tarihi = Column(DateTime, nullable=True)

class Segmentler(Base):
    __tablename__ = "segmentler"

    segment_id = Column(Integer, primary_key=True, index=True)
    segment_adi = Column(String(100), nullable=False)
    davranis_tanimi = Column(Text, nullable=True)


class RFMAnalizi(Base):
    __tablename__ = "rfm_analizi"

    rfm_id = Column(Integer, primary_key=True, index=True)

    musteri_id = Column(
        Integer,
        ForeignKey("musteriler.musteri_id"),
        nullable=False
    )

    recency = Column(Integer, nullable=True)
    frequency = Column(Integer, nullable=True)
    monetary = Column(Numeric(12, 2), nullable=True)

    r_skoru = Column(Integer, nullable=True)
    f_skoru = Column(Integer, nullable=True)
    m_skoru = Column(Integer, nullable=True)

    segment_id = Column(
        Integer,
        ForeignKey("segmentler.segment_id"),
        nullable=True
    )