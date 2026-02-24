# Rich Menu V1 Setup (LINE OA)

ไฟล์ที่ใช้:
- `docs/line/richmenu_v1.json`
- `docs/line/setup_richmenu_v1.ps1`

## Quick Start (recommended)

PowerShell:

```powershell
$env:LINE_CHANNEL_ACCESS_TOKEN = "<YOUR_LINE_CHANNEL_ACCESS_TOKEN>"

# apply ทั้งหมด: create -> upload image -> link all users
.\docs\line\setup_richmenu_v1.ps1 -Mode apply
```

ถ้าต้องการ unlink ของเดิมก่อน apply:

```powershell
.\docs\line\setup_richmenu_v1.ps1 -Mode apply -UnlinkBeforeLink
```

ถ้าต้องการสร้าง+อัปโหลด แต่ยังไม่ link ทั้งหมด:

```powershell
.\docs\line\setup_richmenu_v1.ps1 -Mode apply -SkipLink
```

ดูรายการ rich menu:

```powershell
.\docs\line\setup_richmenu_v1.ps1 -Mode list
```

rollback (unlink all users):

```powershell
.\docs\line\setup_richmenu_v1.ps1 -Mode unlink
```

## Script Parameters

- `-Mode apply|list|unlink`
- `-Token` (optional, default อ่านจาก `LINE_CHANNEL_ACCESS_TOKEN`)
- `-RichMenuJsonPath` (default `docs/line/richmenu_v1.json`)
- `-ImagePath` (default `docs/line/richmenu_v1.png`)
- `-UnlinkBeforeLink` (apply mode)
- `-SkipLink` (apply mode)

## Prerequisites

- มี `LINE_CHANNEL_ACCESS_TOKEN` ของ channel เดียวกับ webhook ที่ใช้งาน
- เตรียมรูป rich menu PNG ขนาด `2500x1686` ที่ `docs/line/richmenu_v1.png`
- webhook endpoint ถูกตั้งและทำงานแล้ว

## Manual API Flow (optional)

### 1) Create rich menu (ได้ richMenuId)

```powershell
$headers = @{
  Authorization = "Bearer $env:LINE_CHANNEL_ACCESS_TOKEN"
  "Content-Type" = "application/json"
}

$richMenuId = Invoke-RestMethod `
  -Method Post `
  -Uri "https://api.line.me/v2/bot/richmenu" `
  -Headers $headers `
  -InFile "docs/line/richmenu_v1.json"

$richMenuId
```

### 2) Upload image

```powershell
$headersImg = @{
  Authorization = "Bearer $env:LINE_CHANNEL_ACCESS_TOKEN"
  "Content-Type" = "image/png"
}

Invoke-RestMethod `
  -Method Post `
  -Uri "https://api-data.line.me/v2/bot/richmenu/$richMenuId/content" `
  -Headers $headersImg `
  -InFile "docs/line/richmenu_v1.png"
```

### 3) Link rich menu to all users

```powershell
$headersLink = @{
  Authorization = "Bearer $env:LINE_CHANNEL_ACCESS_TOKEN"
}

Invoke-RestMethod `
  -Method Post `
  -Uri "https://api.line.me/v2/bot/user/all/richmenu/$richMenuId" `
  -Headers $headersLink
```

## Command mapping (backend)

Rich menu postback data ที่รองรับ:
- `cmd=link` -> `เริ่มใช้งาน`
- `cmd=status` -> `สถานะ`
- `cmd=help` -> `ช่วยเหลือ`
- `cmd=summary` -> `สรุป finance กับ operation ล่าสุด สั้นๆ`
- `cmd=detail` -> `สรุป finance กับ operation ล่าสุด แบบละเอียด`
- `cmd=logout` -> `logout`

ทั้งหมดจะเข้า flow เดียวกับข้อความพิมพ์ใน `line-webhook`