# Huong dan code MagicMirror tren VPS Linux

Tai lieu nay dung cho huong "code truoc tren VPS Linux, rap guong sau". Diem quan trong la VPS headless khong chay giao dien fullscreen bang Electron, vi vay ta se dung `server-only` va mo giao dien bang trinh duyet tu may cua ban.

## 1. Repo da clone local

Ban clone local hien dang nam o:

```text
d:\xampp\htdocs\magicmirror_vps
```

Neu muon dua dung bo nay len VPS, ban co 3 cach:

1. `git push` clone nay len repo rieng cua ban roi clone repo do tren VPS.
2. `scp`/`rsync` thu muc nay len VPS.
3. Clone lai tu `MagicMirrorOrg/MagicMirror` tren VPS, sau do copy cac file local bo sung (`.nvmrc`, `config/config.vps.js`, tai lieu nay).

## 2. Clone tren VPS

Vi du voi Ubuntu/Debian:

```bash
cd ~
git clone https://github.com/MagicMirrorOrg/MagicMirror.git magicmirror_vps
cd magicmirror_vps
```

Neu ban dua repo local nay len repo rieng, thay URL clone bang repo cua ban.

## 3. Cai goi he thong

```bash
sudo apt update
sudo apt install -y git curl ca-certificates build-essential
```

## 4. Cai nvm va Node

Repo nay da co file `.nvmrc` voi major version `22`, phu hop voi engine hien tai cua MagicMirror.

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.4/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && . "$NVM_DIR/bash_completion"

cd ~/magicmirror_vps
nvm install
nvm use
node -v
```

## 5. Cai dependency

Neu ban chi can chay mirror:

```bash
npm run install-mm
```

Neu ban muon code, lint, test, dev mode:

```bash
npm run install-mm:dev
```

## 6. Chuan bi config cho VPS

Repo local nay da co file:

```text
config/config.vps.js
```

Bo config nay gio duoc tach ra thanh:

```text
config/config.vps.js
config/builder.js
config/profiles/active.txt
config/profiles/vps.json
css/generated/vps.css
```

`config/config.vps.js` chi con nhiem vu nap profile va build config. Du lieu thiet bi, module va theme nam trong `config/profiles/vps.json`.
Profile dang dung mac dinh duoc danh dau trong `config/profiles/active.txt`.

Profile mac dinh hien tai duoc set theo huong an toan cho VPS:

- `address: "127.0.0.1"`
- chi bind loopback
- truy cap tu may ban bang SSH tunnel
- khong mo cong `8080` ra Internet ngay tu dau

Neu clone tu repo goc tren VPS, hay copy file `config/config.vps.js` cua ban len truoc khi chay.

## 7. Chay server-only tren VPS

Chay thu cong:

```bash
cd ~/magicmirror_vps
MM_CONFIG_FILE=config/config.vps.js npm run server
```

Chay kieu watch de sua config nhanh hon:

```bash
cd ~/magicmirror_vps
MM_CONFIG_FILE=config/config.vps.js npm run server:watch
```

Luu y:

- `server:watch` chi watch file, khong watch directory.
- File `config/config.vps.js` se tu them `watchTargets` cho builder, `active.txt`, profile va css base.
- Neu ban muon watch them file khac, bo sung vao `watchTargets`.

## 8. Mo giao dien tu may cua ban

Khuyen dung cach nay khi code tren VPS:

```bash
ssh -L 8080:127.0.0.1:8080 your_user@your_vps_ip
```

Sau do mo tren may cua ban:

```text
http://127.0.0.1:8080
```

Cach nay an toan hon viec mo cong `8080` public.

Ngoai giao dien mirror chinh, repo nay da co them trang quan tri:

```text
http://127.0.0.1:8080/admin
```

Trang nay dung de:

- xem danh sach profile trong `config/profiles`
- sua `general`, `theme`, `modules` bang website
- sua nhanh cac module pho bien nhu `clock`, `weather`, `newsfeed`, `compliments`, `calendar`
- tao profile moi tu file mau hoac nhan ban profile hien co
- doi profile dang dung bang cach cap nhat `config/profiles/active.txt`
- validate profile truoc khi luu
- luu lich su snapshot de rollback khi can
- gui lenh reload giao dien cho client dang mo

Neu ban muon doi ca module/layout ma khong restart tay, hay chay `server:watch`.

## 8.1. Bao ve /admin bang Basic Auth

Mac dinh `/admin` van hoat dong trong mang local neu ban chua set auth.
Khi can mo ra LAN/VPS public, nen bat auth bang env:

```bash
export MM_ADMIN_USER=admin
export MM_ADMIN_PASS='doi-mat-khau-man'
```

Neu can doi realm:

```bash
export MM_ADMIN_REALM='MagicMirror Admin'
```

Khi hai bien `MM_ADMIN_USER` va `MM_ADMIN_PASS` cung ton tai, ca:

- `/admin`
- `/admin/api/*`

se duoc bao ve bang HTTP Basic Auth.

## 8.2. Snapshot va rollback profile

Moi lan:

- tao profile moi
- luu profile
- restore profile

he thong se tao snapshot vao:

```text
config/profiles/history/<ten-profile>/
```

Trang `/admin` se hien lich su nay de ban rollback nhanh.
Gioi han mac dinh la 30 snapshot moi profile.

## 9. Neu muon public qua domain

Khi can share cho nguoi khac xem, dung `nginx` reverse proxy thay vi mo thang app ra ngoai.

Vi du:

```nginx
server {
    listen 80;
    server_name mirror.example.com;

    location / {
        proxy_pass http://127.0.0.1:8080/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Neu ban doi `basePath`, nho doi ca trong `config/config.vps.js`.

## 10. Vong lap code de nhanh

Thu tu lam viec goi y:

1. Sua `config/profiles/vps.json` de doi layout, module, vi tri, noi dung.
2. Neu muon doi profile dang dung tren may nay, sua `config/profiles/active.txt` hoac vao `/admin`.
3. Theme variables se duoc sinh ra `css/generated/*.css`. Ban khong nen sua tay file generated nay.
4. Sua `css/mirror.vps.css` neu ban can doi CSS cho module/layout theo kieu template chung.
5. Tao `css/custom.css` tu file mau neu ban can them style rieng ngoai workflow profile:

```bash
cp css/custom.css.sample css/custom.css
```

6. Khi tao module rieng, dat trong `modules/YourModuleName`.
7. Neu module co `node_helper.js`, khi sua file nay ban nen restart server hoac them no vao `watchTargets`.
8. Neu can rollback cau hinh, vao `/admin` va chon snapshot phu hop thay vi sua tay file trong `history`.

## 11. Lenh hay dung

```bash
npm run config:check
npm run test
npm run test:unit
npm run test:electron
npm run lint:js
npm run lint:css
```

Tren VPS khong co desktop, `npm run start` se khong phu hop. Dung `npm run server` hoac `npm run server:watch`.

## 12. Khi chuyen sang guong that

Luc rap man hinh + guong:

1. chuyen sang may co desktop/X11 hoac Raspberry Pi
2. cai dependency production
3. chay fullscreen bang:

```bash
npm run start
```

Khi do ban moi can quan tam toi:

- autostart bang `pm2` hoac systemd
- fullscreen
- tu dong mo khi cap nguon
- quan ly man hinh, PIR sensor, loa, camera

Repo nay da co san file mau cho Raspberry Pi:

```text
ops/pi/run-server.sh
ops/pi/run-kiosk.sh
ops/pi/magicmirror-vps-server.service
ops/pi/magicmirror-vps-kiosk.service
```

Flow goi y:

1. copy repo len Pi o duong dan nhu `/home/pi/magicmirror_vps`
2. chon `server` neu Pi chi dung lam backend
3. chon `kiosk` neu Pi se mo guong full screen
4. copy file `.service` tuong ung vao `/etc/systemd/system/`
5. sua lai `User=` va `WorkingDirectory=` neu duong dan khac
6. enable service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable magicmirror-vps-kiosk.service
sudo systemctl start magicmirror-vps-kiosk.service
```

Neu chi chay headless:

```bash
sudo systemctl enable magicmirror-vps-server.service
sudo systemctl start magicmirror-vps-server.service
```

## 13. Goi y huong di tiep theo

Sau khi VPS chay len, thu tu hop ly nhat la:

1. chot bo cuc mirror
2. viet config cho Viet Nam
3. bat auth cho `/admin` truoc khi cho nguoi khac truy cap
4. dung `/admin` de chot workflow sua profile, rollback va support
5. tao 1 custom module rieng neu ban can du lieu/UX khac
6. sau cung moi dong goi sang phan cung that
