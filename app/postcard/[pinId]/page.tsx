import PostcardClient from "./postcard-client"

export default async function PostcardPage({
  params,
}: {
  params: Promise<{ pinId: string }>
}) {
  const { pinId } = await params
  return <PostcardClient pinId={pinId} />
}

