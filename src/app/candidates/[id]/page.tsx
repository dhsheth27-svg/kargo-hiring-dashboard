import CandidateClient from "./CandidateClient";

export default async function CandidatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CandidateClient id={id} />;
}
