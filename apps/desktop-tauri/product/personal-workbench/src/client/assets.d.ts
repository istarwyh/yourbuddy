/** SVG imports are embedded as data URLs by the product Client build. */
declare module '*.svg' {
  const source: string
  export default source
}
