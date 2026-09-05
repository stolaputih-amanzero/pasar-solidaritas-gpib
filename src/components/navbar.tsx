"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ThemeToggle } from '@/components/theme-toggle'
import { useCart } from '@/components/providers/cart-provider'
import { useAuth } from '@/components/providers/auth-provider'
import { supabase } from '@/lib/supabase/client'
import { Menu, X, ShoppingBag, LogOut, User, Store, Shield, Home } from 'lucide-react'

interface NavbarProps {
  branchSlug?: string
  branchName?: string
}

export function Navbar({ branchSlug: propBranchSlug, branchName: propBranchName }: NavbarProps = {}) {
  const params = useParams()
  const { totalItems } = useCart()
  const { user } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const activeBranchSlug = propBranchSlug || (params?.branch as string) || ''
  const activeBranchName = propBranchName || (activeBranchSlug ? `${activeBranchSlug.replace('-', ' ').toUpperCase()}` : '')

  const homeHref = activeBranchSlug ? `/${activeBranchSlug}` : '/'
  const katalogHref = activeBranchSlug ? `/${activeBranchSlug}/katalog` : '/'
  const supplierHref = activeBranchSlug ? `/${activeBranchSlug}/supplier` : '/'
  const adminHref = activeBranchSlug ? `/${activeBranchSlug}/admin` : '/'
  const cartHref = activeBranchSlug ? `/${activeBranchSlug}/cart` : '/'

  // Prevent background scroll when mobile menu overlay is active
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  // Handle ESC key to close overlay
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mobileMenuOpen])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setMobileMenuOpen(false)
  }

  const closeMenu = () => setMobileMenuOpen(false)

  return (
    <>
      <nav className="flex items-center justify-between px-4 sm:px-6 md:px-10 py-5 border-b border-border bg-background relative z-40">
        <div className="flex items-baseline gap-2">
          <Link href={homeHref} onClick={closeMenu} className="group">
            <span className="text-xl sm:text-2xl font-bold tracking-tighter text-foreground group-hover:text-primary transition-colors">
              PASAR SOLIDARITAS
            </span>
          </Link>
          <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-muted-foreground hidden sm:inline-block">
            {activeBranchName ? `${activeBranchName} Hub` : 'GPIB Hub'}
          </span>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          <div className="flex items-center gap-6 text-[10px] font-bold uppercase tracking-widest">
            {activeBranchSlug && (
              <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                <Home className="w-3 h-3" />
                <span>Pilih Cabang</span>
              </Link>
            )}
            <Link href={katalogHref} className="text-primary hover:text-primary/80 transition-colors">
              Katalog
            </Link>
            <Link href={supplierHref} className="text-foreground hover:text-primary transition-colors">
              Supplier
            </Link>
            <Link href={adminHref} className="text-foreground hover:text-primary transition-colors">
              Admin
            </Link>
            {user ? (
              <button 
                onClick={handleSignOut}
                className="text-muted-foreground hover:text-destructive transition-colors text-[10px] font-bold uppercase tracking-widest"
              >
                Keluar
              </button>
            ) : (
              <Link href="/login" className="text-foreground hover:text-primary transition-colors">
                Masuk
              </Link>
            )}
          </div>

          <div className="flex items-center gap-4 border-l border-border pl-8">
            <ThemeToggle />
            <Link href={cartHref}>
              <div className="relative px-4 py-2 bg-primary text-primary-foreground text-[10px] font-bold rounded-none uppercase tracking-widest cursor-pointer hover:bg-primary/90 transition-colors flex items-center gap-2">
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Keranjang ({totalItems})</span>
              </div>
            </Link>
          </div>
        </div>

        {/* Mobile Action Controls */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />

          <Link href={cartHref} aria-label="Lihat keranjang belanja">
            <div className="relative p-2.5 bg-primary/10 border border-primary/20 text-primary text-xs font-bold rounded-none flex items-center justify-center min-w-[44px] min-h-[44px]">
              <ShoppingBag className="w-4 h-4" />
              {totalItems > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-mono font-bold">
                  {totalItems}
                </span>
              )}
            </div>
          </Link>

          {/* Hamburger Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Buka navigasi menu"
            className="p-2.5 border border-border bg-secondary/50 hover:bg-secondary text-foreground min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex flex-col md:hidden animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          {/* Overlay Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-background">
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tighter text-foreground">
                PASAR SOLIDARITAS
              </span>
              <span className="text-[9px] uppercase tracking-[0.2em] font-semibold text-muted-foreground">
                {activeBranchName ? `${activeBranchName} Hub` : 'GPIB Hub'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button
                type="button"
                onClick={closeMenu}
                aria-label="Tutup navigasi menu"
                className="p-2.5 border border-border bg-secondary/60 hover:bg-secondary text-foreground min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Overlay Links List */}
          <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="pb-3 border-b border-border">
                <span className="text-[10px] uppercase font-bold tracking-[0.3em] text-muted-foreground">
                  Navigasi Cabang
                </span>
              </div>

              <div className="space-y-2">
                {activeBranchSlug && (
                  <Link
                    href="/"
                    onClick={closeMenu}
                    className="flex items-center justify-between p-4 border border-border bg-secondary/20 hover:bg-secondary transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Home className="w-4 h-4 text-primary" />
                      <span className="text-sm font-bold uppercase tracking-wider">Ganti Cabang GPIB</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">→</span>
                  </Link>
                )}

                <Link
                  href={katalogHref}
                  onClick={closeMenu}
                  className="flex items-center justify-between p-4 border border-border bg-secondary/20 hover:bg-secondary transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <ShoppingBag className="w-4 h-4 text-primary" />
                    <span className="text-sm font-bold uppercase tracking-wider">Katalog Produk</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">→</span>
                </Link>

                <Link
                  href={cartHref}
                  onClick={closeMenu}
                  className="flex items-center justify-between p-4 border border-border bg-secondary/20 hover:bg-secondary transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <ShoppingBag className="w-4 h-4 text-primary" />
                    <span className="text-sm font-bold uppercase tracking-wider">Keranjang Belanja</span>
                  </div>
                  <span className="bg-primary text-primary-foreground text-[10px] font-mono px-2 py-0.5 font-bold">
                    {totalItems} item
                  </span>
                </Link>

                <Link
                  href={supplierHref}
                  onClick={closeMenu}
                  className="flex items-center justify-between p-4 border border-border bg-secondary/20 hover:bg-secondary transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Store className="w-4 h-4 text-primary" />
                    <span className="text-sm font-bold uppercase tracking-wider">Dasbor Supplier</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">→</span>
                </Link>

                <Link
                  href={adminHref}
                  onClick={closeMenu}
                  className="flex items-center justify-between p-4 border border-border bg-secondary/20 hover:bg-secondary transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Shield className="w-4 h-4 text-primary" />
                    <span className="text-sm font-bold uppercase tracking-wider">Admin Hub</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">→</span>
                </Link>
              </div>

              {/* Account Section */}
              <div className="pt-4">
                <div className="pb-3 border-b border-border mb-3">
                  <span className="text-[10px] uppercase font-bold tracking-[0.3em] text-muted-foreground">
                    Akun & Akses
                  </span>
                </div>

                {user ? (
                  <div className="p-4 border border-border bg-background space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                        <User className="w-4 h-4" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold truncate text-foreground">
                          {user.user_metadata?.full_name || 'Warga Jemaat'}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate font-mono">
                          {user.email}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full mt-2 py-2.5 border border-destructive/30 bg-destructive/10 hover:bg-destructive/20 text-destructive text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors min-h-[44px]"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Keluar dari Akun</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <Link
                      href="/login"
                      onClick={closeMenu}
                      className="py-3 px-4 text-center border border-border bg-secondary/40 hover:bg-secondary text-xs font-bold uppercase tracking-widest flex items-center justify-center min-h-[44px]"
                    >
                      Masuk
                    </Link>
                    <Link
                      href="/register"
                      onClick={closeMenu}
                      className="py-3 px-4 text-center bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold uppercase tracking-widest flex items-center justify-center min-h-[44px]"
                    >
                      Daftar
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Info */}
            <div className="pt-8 border-t border-border mt-6 text-center space-y-1">
              <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                Pemberdayaan Ekonomi Jemaat GPIB
              </p>
              <p className="text-[10px] text-muted-foreground font-serif italic">
                {activeBranchName ? `Titik Pengambilan: ${activeBranchName} Hub` : 'Pasar Komunitas Antar-Jemaat'}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
