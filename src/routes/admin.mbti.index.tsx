import { createFileRoute } from "@tanstack/react-router";
import { MbtiAdmin } from "@/components/mbti-admin";

export const Route = createFileRoute("/admin/mbti/")({
  head: () => ({ meta: [
    { title: "Bank Soal MBTI — Admin" },
    { name: "description", content: "Kelola 60 item soal MBTI: pasangan A/B, dimensi, dan status publish." },
    { property: "og:title", content: "Bank Soal MBTI — Admin" },
    { property: "og:description", content: "Kelola 60 item soal MBTI: pasangan A/B, dimensi, dan status publish." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ]}),
  component: MbtiAdmin,
});
