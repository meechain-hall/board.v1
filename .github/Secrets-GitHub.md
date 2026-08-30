🟢✨  
นี่คือ รายการ GitHub Secrets ที่คุณต้องตั้งค่า เพื่อให้ CI/CD Workflow ที่รวม Next.js + Supabase Functions + Vercel ทำงานได้สมบูรณ์ 🚀  

---

🔑 Secrets ที่ต้องตั้งใน GitHub

- VERCELTOKEN → Token สำหรับเชื่อม GitHub Actions กับ Vercel  
- VERCELORGID → Organization ID ของโปรเจกต์ใน Vercel  
- VERCELPROJECTID → Project ID ของ MeeChain Magic Hall (คุณมีค่า prj_XNRGrqVMuVl9wA0VCFu0TeIoQ3m8 อยู่แล้ว)  
- SUPABASEACCESSTOKEN → Token สำหรับ deploy Supabase Functions ผ่าน CLI  
- SUPABASEURL → URL ของ Supabase project  
- SUPABASESERVICEROLEKEY → Key สำหรับเขียน/insert ลง DB (ใช้ใน Edge Functions)  
- NEXTPUBLICAPIURL → ค่า public API endpoint ของ MeeChain  
- NEXTPUBLICRPCURL → ค่า RPC endpoint ของ MeeChain  
- NEXTPUBLICCHAINID → Chain ID ของ MeeChain (เช่น 13390)  

---

🎯 ความหมาย
- Secrets เหล่านี้จะถูก inject เข้าไปใน workflow → ใช้ตอน build, deploy, และ serve functions  
- Supabase Functions (relay-packet) จะใช้ SUPABASEURL + SUPABASESERVICEROLEKEY → เขียน log ลงตาราง relay_log  
- Next.js จะใช้ NEXTPUBLIC* → ให้ API และ RPC endpoint ถูกต้องใน production  
- Vercel จะใช้ VERCEL_* → ให้ deploy สำเร็จและเชื่อมกับ project ที่ถูกต้อง  

---

📝 Ritual Checklist
- เพิ่ม Vercel secrets → TOKEN, ORGID, PROJECT_ID  
- เพิ่ม Supabase secrets → ACCESSTOKEN, URL, SERVICEROLEKEY  
- เพิ่ม Next.js env → APIURL, RPCURL, CHAIN_ID  
- ทดสอบ pipeline → ให้ทั้ง Next.js + Supabase deploy สำเร็จ  

---

🎉 เมื่อคุณตั้งค่า secrets ครบ → Workflow จะ deploy ได้ทั้ง Next.js และ Supabase Functions โดยไม่ error อีกครับ 🙏🫡  
อยากให้ผม scaffold ต่อเป็น ตัวอย่าง .env.production ที่รวมทุกค่าไว้ สำหรับ local dev/test ไหมครับ จะได้ sync กับ GitHub Secrets ตรง ๆ 🟢