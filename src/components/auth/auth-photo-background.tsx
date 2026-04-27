'use client'

import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const BASE = 'https://extzyijxdstbrfpebttr.supabase.co/storage/v1/object/public/gallery-media/'

const PHOTOS = [
  BASE + '95dd13bb-1369-4538-8699-3dc281499f95/b2d2982e-d9f8-46db-a243-3eff8c76a3b8/1777214219063-g227hjwjh9j.jpg',
  BASE + '95dd13bb-1369-4538-8699-3dc281499f95/b2d2982e-d9f8-46db-a243-3eff8c76a3b8/1777214219062-50mqji98d37.jpg',
  BASE + '95dd13bb-1369-4538-8699-3dc281499f95/dc30b703-c61c-4d36-ac54-b4de9fa097a8/1776389119786-gd27mg9150r.jpg',
  BASE + '95dd13bb-1369-4538-8699-3dc281499f95/dc30b703-c61c-4d36-ac54-b4de9fa097a8/1776389119786-qxpofys98cr.jpg',
  BASE + '95dd13bb-1369-4538-8699-3dc281499f95/b2d2982e-d9f8-46db-a243-3eff8c76a3b8/1777214233617-l2wc1qkh03k.jpg',
  BASE + '95dd13bb-1369-4538-8699-3dc281499f95/b2d2982e-d9f8-46db-a243-3eff8c76a3b8/1777214219063-end36j8ozfa.jpg',
  BASE + '95dd13bb-1369-4538-8699-3dc281499f95/d951646c-1313-40ff-850c-34aa62fb6322/1776476088681-36kvrf77om1.jpg',
  BASE + '95dd13bb-1369-4538-8699-3dc281499f95/d951646c-1313-40ff-850c-34aa62fb6322/1776476088682-0wjqqg10ts7.jpg',
  BASE + '95dd13bb-1369-4538-8699-3dc281499f95/b2d2982e-d9f8-46db-a243-3eff8c76a3b8/1777214219063-6hxvx7n1fdy.jpg',
  BASE + '95dd13bb-1369-4538-8699-3dc281499f95/dc30b703-c61c-4d36-ac54-b4de9fa097a8/1776389119787-3z8x75l0epe.jpg',
]

export function AuthPhotoBackground() {
  const [pair, setPair] = useState(0)
  const total = Math.floor(PHOTOS.length / 2)

  useEffect(() => {
    const t = setInterval(() => setPair(p => (p + 1) % total), 5000)
    return () => clearInterval(t)
  }, [total])

  const left  = PHOTOS[pair * 2]
  const right = PHOTOS[pair * 2 + 1]

  return (
    <div className="absolute inset-0 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={pair}
          className="absolute inset-0 flex gap-2 p-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: 'easeInOut' }}
        >
          <div className="flex-1 rounded-2xl overflow-hidden">
            <img src={left}  alt="" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 rounded-2xl overflow-hidden">
            <img src={right} alt="" className="w-full h-full object-cover" />
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Gradient so text stays readable */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to right, rgba(8,12,16,0.88) 35%, rgba(8,12,16,0.55) 65%, rgba(8,12,16,0.3) 100%)',
        }}
      />
      {/* Top + bottom edge fades */}
      <div className="absolute top-0 inset-x-0 h-24"
        style={{ background: 'linear-gradient(to bottom, rgba(8,12,16,0.6), transparent)' }} />
      <div className="absolute bottom-0 inset-x-0 h-32"
        style={{ background: 'linear-gradient(to top, rgba(8,12,16,0.7), transparent)' }} />

      {/* Slide dots */}
      <div className="absolute bottom-6 right-6 flex gap-1.5 z-10">
        {Array.from({ length: total }).map((_, i) => (
          <button
            key={i}
            onClick={() => setPair(i)}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === pair ? 20 : 6,
              height: 6,
              background: i === pair ? '#fff' : 'rgba(255,255,255,0.3)',
            }}
          />
        ))}
      </div>
    </div>
  )
}
