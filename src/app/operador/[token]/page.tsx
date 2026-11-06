import OperadorView from "./OperadorView";

export const metadata = { title: "KTM · Tu servicio asignado" };

export default async function OperadorPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <OperadorView token={token} />;
}
