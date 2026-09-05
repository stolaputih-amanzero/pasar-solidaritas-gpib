import { redirect } from 'next/navigation'

export default async function CheckoutSuccessRedirect({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const orderId = params.order_id
  redirect(`/toba-tabo/checkout/success${orderId ? `?order_id=${orderId}` : ''}`)
}
