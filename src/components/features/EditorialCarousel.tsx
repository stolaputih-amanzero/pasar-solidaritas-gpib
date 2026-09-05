'use client'

import { useCallback, useEffect, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import type { PromotionalBanner } from '@/types/database'

export function EditorialCarousel({ banners }: { banners: PromotionalBanner[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'start' })
  const [selectedIndex, setSelectedIndex] = useState(0)

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi])

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    emblaApi.on('select', onSelect)
    onSelect()
  }, [emblaApi, onSelect])

  if (!banners || banners.length === 0) return null

  return (
    <div className="mb-12">
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="editorial-kicker text-primary mb-2">WARTA SOLIDARITAS</p>
          <h2 className="editorial-title-serif text-3xl md:text-4xl">Sorotan Minggu Ini</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={scrollPrev} className="rounded-full border-border">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={scrollNext} className="rounded-full border-border">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-6">
          {banners.map((banner) => (
            <div key={banner.id} className="flex-[0_0_100%] md:flex-[0_0_calc(66.666%-12px)] relative group">
              <Link href={banner.cta_link} className="block relative aspect-[16/9] md:aspect-[21/9] overflow-hidden bg-muted rounded-none border border-border group-hover:border-primary transition-colors">
                <Image src={banner.image_url} alt={banner.title} fill className="object-cover transition-transform duration-700 group-hover:scale-105" priority />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
                
                <div className="absolute bottom-0 left-0 p-6 md:p-10 text-white max-w-2xl">
                  {banner.badge_text && (
                    <span className="inline-block px-3 py-1 bg-primary text-primary-foreground text-[10px] tracking-widest uppercase font-bold mb-3">
                      {banner.badge_text}
                    </span>
                  )}
                  <h3 className="editorial-title-hero text-3xl md:text-5xl text-white mb-2 leading-tight">
                    {banner.title}
                  </h3>
                  {banner.subtitle && (
                    <p className="text-sm md:text-base text-gray-200 line-clamp-2 mb-4 max-w-lg font-light">
                      {banner.subtitle}
                    </p>
                  )}
                  <span className="inline-flex items-center text-xs font-bold tracking-wider uppercase border-b border-white pb-1 group-hover:border-primary group-hover:text-primary transition-colors">
                    {banner.cta_text || 'Selengkapnya'} →
                  </span>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Editorial Indicators */}
      <div className="flex justify-center mt-6 gap-1">
        {banners.map((_, idx) => (
          <div
            key={idx}
            className={cn(
              "h-[2px] transition-all duration-300",
              idx === selectedIndex ? "w-12 bg-primary" : "w-6 bg-border"
            )}
          />
        ))}
      </div>
    </div>
  )
}
