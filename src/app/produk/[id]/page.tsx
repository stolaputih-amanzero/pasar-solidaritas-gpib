import { redirect } from 'next/navigation'

export default async function LegacyProductDetailRedirect({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/toba-tabo/produk/${id}`)
}
