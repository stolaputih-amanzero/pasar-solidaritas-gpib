"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase/client"

const loginSchema = z.object({
  email: z.string().email({ message: "Email tidak valid." }),
  password: z.string().min(6, { message: "Password minimal 6 karakter." }),
})

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: z.infer<typeof loginSchema>) => {
    setIsLoading(true)
    setError("")

    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) {
      setError(error.message)
      setIsLoading(false)
    } else {
      router.push("/")
      router.refresh()
    }
  }

  return (
    <Card className="w-full border-border">
      <CardHeader className="space-y-2 text-center pb-8">
        <span className="text-[10px] uppercase font-bold tracking-[0.3em] text-muted-foreground">Otentikasi</span>
        <CardTitle className="text-4xl font-serif italic text-primary font-medium">Masuk</CardTitle>
        <CardDescription>
          Masukkan email dan password Anda untuk masuk ke akun.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="nama@email.com" {...register("email")} />
            {errors.email && <p className="text-[10px] text-destructive font-bold uppercase tracking-wider">{errors.email.message}</p>}
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
            </div>
            <Input id="password" type="password" {...register("password")} />
            {errors.password && <p className="text-[10px] text-destructive font-bold uppercase tracking-wider">{errors.password.message}</p>}
          </div>
          {error && <div className="p-3 bg-destructive/10 text-destructive text-[10px] font-bold tracking-wider uppercase border border-destructive/20">{error}</div>}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Memproses..." : "MASUK SEKARANG"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center border-t border-border pt-6">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Belum punya akun?{" "}
          <Link href="/register" className="text-primary hover:underline underline-offset-4">
            Daftar
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
