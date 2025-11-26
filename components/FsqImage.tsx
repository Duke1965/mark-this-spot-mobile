"use client"

import { useFsqPhotos } from '@/hooks/useFsqPhotos'
import Image from 'next/image'

interface FsqImageProps {
  fsqId?: string
  lat?: number
  lng?: number
  alt?: string
  className?: string
  width?: number
  height?: number
  fill?: boolean
  style?: React.CSSProperties
}

export function FsqImage({ fsqId, lat, lng, alt = "Place image", className, width, height, fill, style }: FsqImageProps) {
  const { urls, isLoading } = useFsqPhotos(fsqId, lat, lng)

  if (!fsqId) {
    return (
      <div 
        style={{
          width: width || (fill ? '100%' : 200),
          height: height || (fill ? '100%' : 200),
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...style
        }}
        className={className}
      >
        <span style={{ fontSize: '48px' }}>📍</span>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div 
        style={{
          width: width || (fill ? '100%' : 200),
          height: height || (fill ? '100%' : 200),
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...style
        }}
        className={className}
      >
        <span>Loading...</span>
      </div>
    )
  }

  if (urls.length === 0 || !urls[0]) {
    return (
      <div 
        style={{
          width: width || (fill ? '100%' : 200),
          height: height || (fill ? '100%' : 200),
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...style
        }}
        className={className}
      >
        <span style={{ fontSize: '48px' }}>📍</span>
      </div>
    )
  }

  if (fill) {
    return (
      <Image
        src={urls[0]}
        alt={alt}
        fill
        className={className}
        style={style}
        unoptimized
      />
    )
  }

  return (
    <Image
      src={urls[0]}
      alt={alt}
      width={width || 200}
      height={height || 200}
      className={className}
      style={style}
      unoptimized
    />
  )
}

