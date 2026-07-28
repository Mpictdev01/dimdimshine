<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Aturan Penggunaan Pedoman (Token Saving)
- **CRITICAL**: Untuk menghemat token pada *system prompt*, jangan memuat `DEVELOPER_GUIDE.md` sepenuhnya ke memori. Anda **DIWAJIBKAN** untuk menggunakan *tool* pembaca file (`view_file` atau `read_file`) secara langsung (langsung baca) pada `DEVELOPER_GUIDE.md` di setiap awal tugas untuk memahami pedoman jika dibutuhkan.

# Aturan Penggunaan Graphify
- **MANDATORY**: Sebelum menganalisis codebase, merencanakan solusi, atau melakukan modifikasi kode pada tugas baru, Anda **DIWAJIBKAN** untuk mengutamakan pemeriksaan folder `graphify-out/` dan menggunakan data knowledge graph di dalamnya terlebih dahulu untuk memahami arsitektur dan keterhubungan komponen proyek.
