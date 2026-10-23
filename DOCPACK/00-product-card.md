---
title: Solo Empire Insights — Product Card
doc_id: CARD-solo-empire-insights
doc_type: product-card
verdict: showcase
version: 0.1
date: 2026-10-08
status: ร่างเพื่อพิจารณา
owner: Product owner (Book Dev)
---

# Solo Empire Insights — Product Card

## 1. สรุปคุณค่าในหนึ่งประโยค

หน้าเว็บ static ที่แสดงข้อมูลจาก data product ของ Solo Empire 7 ตัว (crypto, stock, FX, DeFi, SEO, news, discovery; AI tools และ flights ปลดระวางแล้ว 2026-10-23 ตาม contract freeze `data-product-contracts-v3` และ `data-product-contracts-v4`) ผ่าน API อ่านอย่างเดียวในเครื่อง หรือ fixture สำหรับ demo offline

## 2. ปัญหาและผู้ใช้เป้าหมาย

- ข้อมูลจากหลาย API ต้องมีหน้าจอเดียวให้ดูได้เร็ว
- ผู้ใช้: เจ้าของ; อยู่ใน Tier B showcase ของ `BOOK-DEV-TIER-LABELS.md` ('needs honest status')

## 3. สิ่งที่ทำได้จริงตอนนี้

- หน้า HTML ต่อโดเมน (`crypto.html`, `stocks.html`, `fx.html` ฯลฯ) + `js/data-products-browser.js` ที่ build จาก TypeScript
- เรียก API port 8101–8106, 8108, 8110 หรือใช้ `?fixtures=1` สำหรับ demo offline; ไม่ scrape เองและไม่อ่าน CSV เก่า
- test 5 ไฟล์ (contract freeze, DOM, browser bundle, static site)
- หน้าเก่า (property, jobs, opportunities) ย้ายไป `archive/legacy-static/`

## 4. หลักฐานสถานะ

- Stack: ไม่ตรวจพบ framework หลักจากตัวเก็บข้อเท็จจริง
- Commits: 14 (แรก 2026-07-07 → ล่าสุด 2026-10-03), branch `main`; working tree สะอาด
- Source: 14 ไฟล์ / 2,523 บรรทัด; test 5 ไฟล์
- CI: 1 workflow
- Deploy config: ไม่มี
- Live URL: ไม่พบใน repo

## 5. คุณค่าและจุดต่าง

- แสดง consumer ที่ยึด contract อย่างเคร่งครัดและ demo ได้โดยไม่ต้องมี backend
- ไม่มีจุดต่างต่อผู้ใช้ภายนอก; ไม่มีมุมรายได้

## 6. ช่องว่างสำคัญ

- ไม่มี deploy (ต้องรัน API ในเครื่อง) และ CORS ค่าเริ่มต้นอนุญาตเฉพาะ localhost
- ซ้อนกับ dashboard อื่นของ Solo Empire ได้ **[ต้องยืนยัน]**

## 7. คำตัดสิน

**showcase** — ทำงานจริงและอยู่ใน Tier B showcase อยู่แล้ว เหมาะเป็น demo ของ data platform แต่ไม่ใช่ธุรกิจ

จะเป็น `invest` ถ้ามีเวอร์ชัน hosted ที่มีผู้ใช้ภายนอก; จะเป็น `merge` ถ้า dashboard หลักแสดงข้อมูลชุดเดียวกัน

## 8. ขั้นต่อไป

1. deploy fixture mode เป็น static demo สาธารณะ
2. อัปเดต `TRUTH-PASS.md` ให้ตรงกับ 9 data product

## การอนุมัติ

| บทบาท | สถานะ | วันที่ | ลงนาม |
|---|---|---|---|
| Product owner (Book Dev) | รอพิจารณา | — | ________ |

## แหล่งข้อมูล

- `README.md`
- `TRUTH-PASS.md`
- `js/data-products-browser.js`
- `tests/`
- `repository-catalog/policies/BOOK-DEV-TIER-LABELS.md (Solo Empire root)`
