import ProfileView from "../ProfileView";

/**
 * The shareable form of a profile: /profile/<handle>.
 *
 * Progress still lives in this browser's localStorage, so the handle is a
 * vanity path rather than a lookup key — a real multi-user version needs the
 * backend and auth described in the README.
 */
export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  return {
    title: `${handle} — RishAlgo AI`,
    description: `Coding, contest and interview record for ${handle}.`,
  };
}

export default async function HandleProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  return <ProfileView handle={handle} />;
}
