import { Navbar } from '@/components/navbar';
import Link from 'next/link';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-0">
        <aside className="col-span-1 md:col-span-2 border-r border-border bg-secondary/10 p-6 flex flex-col gap-6">
          <div className="pb-4 border-b border-border">
            <span className="text-[10px] uppercase font-bold tracking-[0.3em] text-muted-foreground">Panel Supplier</span>
          </div>
          <nav className="flex flex-col gap-2">
            <Link href="/supplier/produk" className="text-xs font-bold uppercase tracking-wider py-2 px-3 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
              Produk Saya
            </Link>
            <Link href="/supplier/pesanan" className="text-xs font-bold uppercase tracking-wider py-2 px-3 text-foreground hover:bg-secondary transition-colors">
              Pesanan
            </Link>
            <Link href="/supplier/profil" className="text-xs font-bold uppercase tracking-wider py-2 px-3 text-foreground hover:bg-secondary transition-colors">
              Profil
            </Link>
          </nav>
        </aside>
        <main className="col-span-1 md:col-span-10 p-6 md:p-10">
          {children}
        </main>
      </div>
    </div>
  )
}
