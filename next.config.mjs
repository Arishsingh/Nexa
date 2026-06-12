/** @type {import('next').NextConfig} */
const config = {
  transpilePackages: ['three', '@react-three/fiber', '@react-three/drei'],
  webpack: (config) => {
    config.externals.push({ canvas: 'canvas' })
    return config
  },
}

export default config
