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

const registerSchema = z.object({
  fullName: z.string().min(3, { message: "Nama lengkap minimal 3 karakter." }),
  email: z.string().email({ message: "Email tidak valid." }),
  password: z.string().min(6, { message: "Password minimal 6 karakter." }),
})

export default function RegisterPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: z.infer<typeof registerSchema>) => {
    setIsLoading(true)
    setError("")

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName,
        }
      }
    })

    if (authError) {
      setError(authError.message)
      setIsLoading(false)
      return
    }

    if (authData.user) {
      setSuccess(true)
    }
    
    setIsLoading(false)
  }

  if (success) {
    return (
      <Card className="w-full border-border">
        <CardHeader className="text-center pb-8 pt-8">
          <CardTitle className="text-4xl font-serif italic text-primary font-medium">Berhasil</CardTitle>
          <CardDescription className="pt-4">
            Akun Anda telah berhasil dibuat. Silakan periksa email Anda untuk verifikasi atau langsung masuk.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-center border-t border-border pt-6">
          <Link href="/login" className="w-full">
            <Button className="w-full">MENUJU HALAMAN LOGIN</Button>
          </Link>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full border-border">
      <CardHeader className="space-y-2 text-center pb-8">
        <span className="text-[10px] uppercase font-bold tracking-[0.3em] text-muted-foreground">Otentikasi</span>
        <CardTitle className="text-4xl font-serif italic text-primary font-medium">Daftar Akun</CardTitle>
        <CardDescription>
          Bergabung dengan Pasar Solidaritas untuk mulai berbelanja.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="fullName">Nama Lengkap</Label>
            <Input id="fullName" placeholder="John Doe" {...register("fullName")} />
            {errors.fullName && <p className="text-[10px] text-destructive font-bold uppercase tracking-wider">{errors.fullName.message}</p>}
          </div>
          <div className="space-y-3">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="nama@email.com" {...register("email")} />
            {errors.email && <p className="text-[10px] text-destructive font-bold uppercase tracking-wider">{errors.email.message}</p>}
          </div>
          <div className="space-y-3">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" {...register("password")} />
            {errors.password && <p className="text-[10px] text-destructive font-bold uppercase tracking-wider">{errors.password.message}</p>}
          </div>
          {error && <div className="p-3 bg-destructive/10 text-destructive text-[10px] font-bold tracking-wider uppercase border border-destructive/20">{error}</div>}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Memproses..." : "DAFTAR SEKARANG"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center border-t border-border pt-6">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Sudah punya akun?{" "}
          <Link href="/login" className="text-primary hover:underline underline-offset-4">
            Masuk
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
