import type { ProductImage as Img } from '../../types/catalog'
import { cx } from '../../lib/format'
import { ProductArt } from './ProductArt'

export function ProductImage({ image, className, eager }: { image: Img; className?: string; eager?: boolean }) {
  if (image.url)
    return (
      <img
        src={image.url}
        alt={image.alt}
        width={image.width}
        height={image.height}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        className={cx('h-full w-full object-cover', className)}
      />
    )
  if (image.art) return <ProductArt {...image.art} title={image.alt} className={cx('h-full w-full', className)} />
  return <div className={cx('h-full w-full bg-soft', className)} />
}
