import { notFound } from "next/navigation";
import { PROBLEMS, problemBySlug } from "@/data/problems";
import Workspace from "@/components/Workspace";

export function generateStaticParams() {
  return PROBLEMS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = problemBySlug(slug);
  return { title: p ? `${p.title} — RishAlgo AI` : "Problem — RishAlgo AI" };
}

export default async function ProblemPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const problem = problemBySlug(slug);
  if (!problem) notFound();
  return <Workspace problem={problem} />;
}
