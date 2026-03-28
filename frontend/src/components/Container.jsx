const pad = 'px-6 sm:px-10 md:px-14 lg:px-20 xl:px-24 2xl:px-32'

export default function Container({ children, className = '', wide = false }) {
  return (
    <div className={`mx-auto w-full ${wide ? 'max-w-[1120px]' : 'max-w-[960px]'} ${pad} ${className}`}>
      {children}
    </div>
  )
}
