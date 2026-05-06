# Compressing Photo Using PCA

Aplikasi web untuk mengompresi gambar (memperkecil ukuran file) menggunakan metode **Principal Component Analysis (PCA)**. Dibangun menggunakan Python (Flask), Scikit-Learn, dan antarmuka UI berbasis Web, serta siap dideploy pada Vercel.

## 🚀 Live Demo & Deployment

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/GavinArdhijaya91/compressing-photo-using-PCA)

**[🌐 Kunjungi Aplikasi Live di Vercel](https://gavinardhijaya-compressing-photos-using-pca.vercel.app/)** 

## 💻 Cara Menjalankan Secara Lokal (Local Development)

Jika Anda ingin menjalankan atau mengembangkan aplikasi ini di komputer Anda sendiri, ikuti langkah-langkah berikut:

### 1. Clone Repository
Buka terminal Anda dan jalankan perintah berikut:
```bash
git clone https://github.com/GavinArdhijaya91/compressing-photo-using-PCA.git
cd compressing-photo-using-PCA
```

### 2. Buat Virtual Environment (Sangat Disarankan)
Untuk mengisolasi dependensi aplikasi, buat virtual environment:
```bash
# Untuk Windows:
python -m venv venv
venv\Scripts\activate

# Untuk macOS / Linux:
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependensi
Pastikan Anda memiliki file `requirements.txt` atau install library utama berikut jika belum ada:
```bash
pip install flask flask-cors werkzeug numpy matplotlib scikit-learn scikit-image
```
*(Atau cukup `pip install -r requirements.txt` jika file tersebut sudah tersedia).*

### 4. Jalankan Aplikasi
Setelah dependensi terinstall, Anda dapat menjalankan server Flask dengan mengeksekusi `app.py`:
```bash
python app.py
```

### 5. Akses Aplikasi
Buka web browser favorit Anda dan akses alamat berikut:
```
http://localhost:5000
```

---

## 🌍 Konfigurasi Deployment Vercel

Proyek ini telah dikonfigurasi khusus agar dapat berjalan di lingkungan *serverless* Vercel tanpa perlu melakukan setup server backend yang rumit. 

Pengaturan deployment terdapat dalam file `vercel.json`:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "app.py",
      "use": "@vercel/python"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "app.py"
    }
  ]
}
```

**Bagaimana cara kerjanya?**
1. Anda mengklik tombol **Deploy with Vercel** di atas atau mengimpor repository ini ke dashboard Vercel Anda.
2. Vercel secara otomatis akan mendeteksi file `app.py` dan menginstall library berdasarkan `requirements.txt`.
3. Aplikasi Flask Anda akan dijalankan sebagai *serverless functions*. (Catatan: file gambar disimpan secara *in-memory* atau di folder `/tmp` khusus untuk Vercel agar mendukung arsitektur serverless).
