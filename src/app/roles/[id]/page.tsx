import RoleWorkspaceClient from "./RoleWorkspaceClient";

export default async function RolePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RoleWorkspaceClient roleId={id} />;
}
