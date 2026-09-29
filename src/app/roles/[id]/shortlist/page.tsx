import ShortlistClient from "./ShortlistClient";

export default async function ShortlistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ShortlistClient roleId={id} />;
}
