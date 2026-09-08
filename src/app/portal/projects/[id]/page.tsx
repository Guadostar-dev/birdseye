import { ProjectWriteup } from "@/components/ProjectWriteup";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectWriteup projectId={id} />;
}
