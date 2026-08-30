===========

1. LINT & TYPECHECK===========
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck

============================================================

2. BUILD NEXT.JS

============================================================
  build-next:
    runs-on: ubuntu-latest
    needs: lint-and-typecheck
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'npm'
      - run: npm ci
      - run: npm run build

============================================================

3. DEPLOY SUPABASE FUNCTIONS

============================================================
  deploy-supabase:
    runs-on: ubuntu-latest
    needs: lint-and-typecheck
    steps:
      - uses: actions/checkout@v4
      - name: Setup Supabase CLI
        run: |
          curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
          npm install -g supabase
      - name: Deploy relay-packet function
        run: supabase functions deploy relay-packet
        env:
          SUPABASEACCESSTOKEN: ${{ secrets.SUPABASEACCESSTOKEN }}

============================================================

4. DEPLOY TO VERCEL

============================================================
  deploy-vercel:
    runs-on: ubuntu-latest
    needs: [build-next, deploy-supabase]
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Vercel
        uses: vercel/action@v4
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCELORGID }}
          vercel-project-id: ${{ secrets.VERCELPROJECTID }}
          production: true
`

---

🎯 ความหมาย
- Lint & Typecheck → ตรวจสอบคุณภาพโค้ด  
- Build Next.js → สร้าง production build  
- Deploy Supabase Functions → ใช้ Supabase CLI deploy relay-packet  
- Deploy Vercel → ขึ้น production พร้อมกัน  

---

📝 Ritual Checklist
- เพิ่ม Supabase CLI step → ใช้ supabase functions deploy  
- ตั้งค่า secrets → SUPABASEACCESS_TOKEN  
- เชื่อม Deploy Vercel → ใช้ vercel/action@v4  
- ทดสอบ pipeline → ให้ทั้ง Next.js และ Supabase deploy สำเร็จ  

---

🎉 ด้วย workflow นี้ คุณจะได้ CI/CD ครบทั้ง Next.js + Supabase Functions ใน pipeline เดียวครับ 🙏🫡  
อยากให้ผม scaffold ต่อเป็น ตัวอย่าง secrets ที่ต้องตั้งใน GitHub (เช่น SUPABASEACCESSTOKEN, VERCEL_TOKEN) ไหมครับ จะได้ครบทุกค่า 🟢เยี่ยมมากครับ ธันวัฒน์ 🟢✨  
นี่คือ ตัวอย่าง GitHub Actions Workflow ที่รวมทั้ง Next.js CI/CD และ Supabase Functions Deploy ไว้ใน pipeline เดียวกัน 🚀  

---

📄 .github/workflows/ci-cd.yml

`yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:

============================================================

1. LINT & TYPECHECK

============================================================
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck

============================================================

2. BUILD NEXT.JS

============================================================
  build-next:
    runs-on: ubuntu-latest
    needs: lint-and-typecheck
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - run: npm run build

============================================================

3. DEPLOY SUPABASE FUNCTIONS

============================================================
  deploy-supabase:
    runs-on: ubuntu-latest
    needs: lint-and-typecheck
    steps:
      - uses: actions/checkout@v4
      - name: Setup Supabase CLI
        run: |
          curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
          npm install -g supabase
      - name: Deploy relay-packet function
        run: supabase functions deploy relay-packet
        env:
          SUPABASEACCESSTOKEN: ${{ secrets.SUPABASEACCESSTOKEN }}

============================================================

4. DEPLOY TO VERCEL

============================================================
  deploy-vercel:
    runs-on: ubuntu-latest
    needs: [build-next, deploy-supabase]
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Vercel
        uses: vercel/action@v4
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCELORGID }}
          vercel-project-id: ${{ secrets.VERCELPROJECTID }}
          production: true
`

---

🎯 ความหมาย
- Lint & Typecheck → ตรวจสอบคุณภาพโค้ด  
- Build Next.js → สร้าง production build  
- Deploy Supabase Functions → ใช้ Supabase CLI deploy relay-packet  
- Deploy Vercel → ขึ้น production พร้อมกัน  

---

📝 Ritual Checklist
- เพิ่ม Supabase CLI step → ใช้ supabase functions deploy  
- ตั้งค่า secrets → SUPABASEACCESS_TOKEN  
- เชื่อม Deploy Vercel → ใช้ vercel/action@v4  
- ทดสอบ pipeline → ให้ทั้ง Next.js และ Supabase deploy สำเร็จ  

---

🎉 ด้วย workflow นี้ คุณจะได้ CI/CD ครบทั้ง Next.js + Supabase Functions ใน pipeline เดียวครับ 🙏🫡  
อยากให้ผม scaffold ต่อเป็น ตัวอย่าง secrets ที่ต้องตั้งใน GitHub (เช่น SUPABASEACCESSTOKEN, VERCEL_TOKEN) ไหมครับ จะได้ครบทุกค่า 🟢