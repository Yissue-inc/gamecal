import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react'
import { GUIDES, getGuide } from '@/lib/guides'
import { JsonLd } from '@/components/seo/JsonLd'
import { getAppUrl } from '@/lib/app-url'
import { Button } from '@/components/ui/button'

export function generateStaticParams() {
  return GUIDES.map((guide) => ({ slug: guide.slug }))
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const guide = getGuide(params.slug)
  if (!guide) {
    return {
      title: 'Gaming Guide | GamerClock',
      description: 'Gaming calendar guides from GamerClock.',
    }
  }

  return {
    title: `${guide.title} | GamerClock`,
    description: guide.description,
    keywords: guide.keywords,
    alternates: { canonical: `/guides/${guide.slug}` },
    openGraph: {
      title: guide.title,
      description: guide.description,
      url: `/guides/${guide.slug}`,
      images: ['/og-image.png'],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: guide.title,
      description: guide.description,
      images: ['/og-image.png'],
    },
  }
}

export default function GuidePage({ params }: { params: { slug: string } }) {
  const guide = getGuide(params.slug)
  if (!guide) notFound()

  const appUrl = getAppUrl()
  const url = `${appUrl}/guides/${guide.slug}`

  return (
    <main className="min-h-screen bg-[#0f0f0f] text-white">
      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'Article',
            '@id': `${url}#article`,
            headline: guide.title,
            description: guide.description,
            datePublished: guide.updatedAt,
            dateModified: guide.updatedAt,
            author: { '@id': `${appUrl}/#organization` },
            publisher: { '@id': `${appUrl}/#organization` },
            mainEntityOfPage: url,
            image: `${appUrl}/og-image.png`,
          },
          {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            '@id': `${url}#faq`,
            mainEntity: guide.faqs.map((faq) => ({
              '@type': 'Question',
              name: faq.question,
              acceptedAnswer: {
                '@type': 'Answer',
                text: faq.answer,
              },
            })),
          },
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            '@id': `${url}#breadcrumb`,
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'GamerClock',
                item: appUrl,
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Guides',
                item: `${appUrl}/guides`,
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: guide.shortTitle,
                item: url,
              },
            ],
          },
        ]}
      />

      <header className="border-b border-zinc-800 px-6 py-4">
        <Link href="/" className="inline-flex items-center gap-2 font-rajdhani text-xl font-bold">
          <Image src="/header-icon.png" alt="GamerClock" width={36} height={36} className="h-9 w-9" priority />
          Gamer<span className="text-primary">Clock</span>
        </Link>
      </header>

      <article className="mx-auto max-w-4xl px-6 py-12">
        <Link href="/guides" className="inline-flex items-center gap-2 text-sm font-bold text-zinc-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Guides
        </Link>

        <div className="mt-8">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-300">GamerClock Guide</p>
          <h1 className="mt-4 font-rajdhani text-4xl font-black leading-tight md:text-6xl">
            {guide.title}
          </h1>
          <p className="mt-5 text-lg leading-8 text-zinc-300">{guide.description}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {guide.keywords.slice(0, 5).map((keyword) => (
              <span key={keyword} className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-400">
                {keyword}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-10 space-y-10">
          {guide.sections.map((section) => (
            <section key={section.heading} className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-6">
              <h2 className="font-rajdhani text-3xl font-bold text-white">{section.heading}</h2>
              <div className="mt-4 space-y-4 text-base leading-8 text-zinc-300">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <section className="mt-10 rounded-lg border border-emerald-300/20 bg-emerald-300/5 p-6">
          <h2 className="font-rajdhani text-3xl font-bold">Quick answers</h2>
          <div className="mt-5 space-y-4">
            {guide.faqs.map((faq) => (
              <div key={faq.question} className="rounded-md border border-white/10 bg-black/25 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                  <div>
                    <h3 className="font-bold text-white">{faq.question}</h3>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">{faq.answer}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div>
            <h2 className="font-rajdhani text-2xl font-bold">Use GamerClock now</h2>
            <p className="mt-1 text-sm text-zinc-400">Turn the guide into an actual player schedule.</p>
          </div>
          <Button asChild>
            <Link href={guide.cta.href}>
              {guide.cta.label}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </article>
    </main>
  )
}
